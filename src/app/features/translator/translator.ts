import { Component, computed, inject, signal, ViewChildren, QueryList } from '@angular/core';
import { BookStore, Chapter, TranslationVersion } from '../../core/book.store';
import { ToastService } from '../../core/toast.service';
import { GeminiClient, parseGeminiError } from '../../core/gemini';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { TokenEstimationComponent } from './components/token-estimation';
import { TranslatorConfigComponent } from './components/translator-config';
import { ChapterItemComponent } from './components/chapter-item';

@Component({
  selector: 'app-translator',
  standalone: true,
  imports: [MatIconModule, FormsModule, TokenEstimationComponent, TranslatorConfigComponent, ChapterItemComponent],
  template: `
    <div class="max-w-6xl mx-auto py-8 px-4">
      <div class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-3xl font-bold text-zinc-900">Dịch thuật</h2>
            <p class="text-zinc-500 mt-1">Đã sẵn sàng dịch {{ store.chapters().length }} phần của "{{ store.fileName() }}".</p>
          </div>
        </div>
        <div class="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex gap-3 text-sm text-indigo-900 w-full">
          <mat-icon class="text-indigo-500 shrink-0">lightbulb</mat-icon>
          <p>Nếu có thể hãy luôn chọn mô hình AI mạnh nhất để dịch. Nếu bạn đã tạo bảng Thuật ngữ - Từ khó hoặc/và bảng Đại từ nhân xưng, nhớ tích hợp chúng vào trong quá trình dịch bằng cách tick tùy chọn "Kích hoạt"</p>
        </div>
      </div>

      <!-- Token Estimation Card -->
      <app-token-estimation />

      <!-- Config Panel -->
      <app-translator-config />

      <!-- Action area -->
      <div class="mb-4 flex justify-between items-start w-full">
        <div class="flex gap-4 items-center">
          @if (translateOperation() !== 'none') {
            <div class="flex items-center space-x-2">
              <div class="bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg font-medium shadow-sm flex items-center space-x-2">
                <mat-icon class="animate-spin">sync</mat-icon>
                @if (translateOperation() === 'retranslate') {
                  <span>Đang dịch lại toàn bộ sách...</span>
                } @else if (translateOperation() === 'all') {
                  <span>Đang khởi tạo bản dịch...</span>
                } @else {
                  <span>Đang dịch các phần chưa dịch...</span>
                }
              </div>
              <button 
                (click)="stopRequested.set(true)"
                [disabled]="stopRequested()"
                class="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center"
              >
                <span>{{ stopRequested() ? 'Đang dừng...' : 'Dừng dịch' }}</span>
              </button>
            </div>
          } @else if (confirmAction() !== 'none') {
            <div class="flex items-center space-x-3 bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-100 shadow-sm transition-all duration-200">
              <span class="text-sm font-medium">
                @if (confirmAction() === 'retranslate') {
                  Bạn có chắc muốn dịch lại từ đầu? Lựa chọn này sẽ tốn thời gian & Token.
                } @else if (confirmAction() === 'all') {
                  Bạn có chắc muốn dịch toàn bộ cuốn sách? Lựa chọn này sẽ tốn thời gian & Token.
                } @else {
                  Bạn có chắc muốn dịch các phần chưa dịch? Lựa chọn này sẽ tốn thời gian & Token.
                }
              </span>
              <div class="flex items-center space-x-2 border-l border-red-200 pl-3">
                <button (click)="executeConfirmedAction()" class="text-sm font-bold hover:text-red-900 transition-colors">Đồng ý</button>
                <button (click)="confirmAction.set('none')" class="text-sm font-medium text-zinc-500 hover:text-zinc-700 transition-colors">Hủy</button>
              </div>
            </div>
          } @else if (translationState() === 'all') {
            <button 
              (click)="confirmAction.set('retranslate')"
              [disabled]="store.isTranslatingAny()"
              [class.opacity-50]="store.isTranslatingAny()"
              [class.cursor-not-allowed]="store.isTranslatingAny()"
              class="bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2"
            >
              <mat-icon>refresh</mat-icon>
              <span>Dịch lại toàn bộ cuốn sách</span>
            </button>
          } @else if (translationState() === 'none') {
            <button 
              (click)="confirmAction.set('all')"
              [disabled]="store.isTranslatingAny()"
              [class.opacity-50]="store.isTranslatingAny()"
              [class.cursor-not-allowed]="store.isTranslatingAny()"
              class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2 disabled:hover:bg-indigo-600"
            >
              <mat-icon>translate</mat-icon>
              <span>Dịch toàn bộ cuốn sách</span>
            </button>
          } @else {
            <button 
              (click)="confirmAction.set('untranslated')"
              [disabled]="store.isTranslatingAny()"
              [class.opacity-50]="store.isTranslatingAny()"
              [class.cursor-not-allowed]="store.isTranslatingAny()"
              class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2 disabled:hover:bg-indigo-600"
            >
              <mat-icon>translate</mat-icon>
              <span>Dịch tất cả các phần chưa dịch</span>
            </button>
          }
        </div>
        
        @if (translationState() === 'all') {
          <button 
            (click)="store.exportProjectToHtml()"
            [disabled]="store.isTranslatingAny()"
            [class.opacity-50]="store.isTranslatingAny()"
            [class.cursor-not-allowed]="store.isTranslatingAny()"
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2 disabled:hover:bg-green-600 shrink-0"
          >
            <mat-icon>download</mat-icon>
            <span>Download bản dịch</span>
          </button>
        }
      </div>

      <!-- Chapter List -->
      <div class="space-y-4">
        @for (chapter of store.chapters(); track chapter.id; let i = $index) {
          <app-chapter-item 
            [chapter]="chapter" 
            [index]="i" 
            [(isExpanded)]="expanded[chapter.id]"
            (translateSingle)="translateSingle(chapter)" 
            (requestNavigate)="handleNavigate($event)"
          />
        }
      </div>
    </div>
  `
})
export class Translator {
  store = inject(BookStore);
  gemini = inject(GeminiClient);
  toast = inject(ToastService);
  
  @ViewChildren(ChapterItemComponent) chapterItems!: QueryList<ChapterItemComponent>;

  expanded: Record<string, boolean> = {};

  confirmAction = signal<'none' | 'retranslate' | 'all' | 'untranslated'>('none');
  stopRequested = signal(false);
  translateOperation = signal<'none' | 'all' | 'retranslate' | 'untranslated'>('none');

  translationState = computed(() => {
    const chapters = this.store.chapters();
    if (chapters.length === 0) return 'none';
    const doneCount = chapters.filter(c => c.status === 'done').length;
    if (doneCount === 0) return 'none';
    if (doneCount === chapters.length) return 'all';
    return 'partial';
  });

  handleNavigate(index: number) {
    const items = this.chapterItems.toArray();
    if (items[index]) {
      items[index].openFullscreen();
    }
  }

  async translateSingle(chapter: Chapter): Promise<boolean> {
    this.store.updateChapter(chapter.id, { status: 'translating' });
    this.expanded[chapter.id] = true;
    
    try {
      const config = this.store.config();
      const chapters = this.store.chapters() || [];
      const validChaptersCount = chapters.filter((c: Chapter) => !c.excludeFromTranslation).length;

      const chapterIndex = chapters.findIndex(c => c.id === chapter.id);
      let contextSummarySnapshot: string | undefined = undefined;
      let contextSummaryChapterTitle: string | undefined = undefined;
      
      if (config.generateSummary !== false && chapterIndex > 0) {
        const prevChapter = chapters[chapterIndex - 1];
        if (prevChapter) {
            const activeVersionNumber = prevChapter.activeVersionNumber || prevChapter.latestVersionNumber;
            if (activeVersionNumber) {
              const activeVersion = prevChapter.versions?.find(v => v.versionNumber === activeVersionNumber);
              if (activeVersion && activeVersion.summary) {
                contextSummarySnapshot = activeVersion.summary;
                contextSummaryChapterTitle = prevChapter.title;
              }
            }
        }
      }

      const { text: translatedText, customGlossary, glossaryStatus, glossaryRatio } = await this.gemini.translateChapter(
        chapter.originalText, 
        config.model, 
        config.temperature,
        this.store.bookTitle(),
        this.store.author(),
        this.store.pronounTable(),
        this.store.usePronouns(),
        this.store.glossaryTable(),
        this.store.useGlossary(),
        validChaptersCount > 3,
        contextSummarySnapshot,
        this.store.customInstructions()
      );
      
      let summaryText: string | undefined = undefined;
      if (config.generateSummary !== false) {
        summaryText = await this.gemini.summarizeTranslation(translatedText, config.model);
      }
      
      const newVersionNumber = (chapter.latestVersionNumber || 0) + 1;
      const newVersion: TranslationVersion = {
        versionNumber: newVersionNumber,
        text: translatedText,
        model: config.model,
        temperature: config.temperature,
        timestamp: Date.now(),
        customGlossary: customGlossary,
        glossaryStatus: glossaryStatus,
        glossaryRatio: glossaryRatio,
        summary: summaryText,
        usePronouns: this.store.usePronouns(),
        pronounSnapshot: this.store.usePronouns() ? this.store.pronounTable() : undefined,
        pronounVersionNumber: this.store.usePronouns() ? this.store.activePronounVersionNumber() : undefined,
        useGlossary: this.store.useGlossary(),
        glossaryVersionNumber: this.store.useGlossary() ? this.store.activeGlossaryVersionNumber() : undefined,
        useContextSummary: !!contextSummarySnapshot,
        contextSummarySnapshot: contextSummarySnapshot,
        contextSummaryChapterTitle: contextSummaryChapterTitle,
        useCustomInstructions: !!this.store.customInstructions(),
        customInstructionsSnapshot: this.store.customInstructions() || undefined
      };
      
      const versions = [...(chapter.versions || []), newVersion].slice(-3);
      
      this.store.updateChapter(chapter.id, { 
        status: 'done',
        translatedText: translatedText,
        versions: versions,
        latestVersionNumber: newVersionNumber,
        activeVersionNumber: newVersionNumber
      });
      return true;
    } catch (e: unknown) {
      console.error(e);
      this.store.updateChapter(chapter.id, { status: 'error' });
      this.toast.error(this.toast.Messages.TRANSLATION_ERROR(chapter.title, parseGeminiError(e)));
      
      const msg = (e as Error)?.message || e?.toString() || '';
      const lowerMsg = msg.toLowerCase();
      if (lowerMsg.includes('quota') || lowerMsg.includes('429') || 
          lowerMsg.includes('api key') || lowerMsg.includes('403') || lowerMsg.includes('permission_denied')) {
        return false;
      }
      return true;
    }
  }

  executeConfirmedAction() {
    const action = this.confirmAction();
    if (action === 'none') return;
    this.executeTranslateAll(action === 'retranslate');
  }

  async executeTranslateAll(forceAll: boolean) {
    this.confirmAction.set('none');
    this.stopRequested.set(false);
    
    let toTranslate = this.store.chapters().filter(c => !c.excludeFromTranslation);
    if (forceAll) {
      this.translateOperation.set('retranslate');
    } else {
      const isCompletelyNew = toTranslate.every(c => c.status === 'pending');
      this.translateOperation.set(isCompletelyNew ? 'all' : 'untranslated');
      toTranslate = toTranslate.filter(c => c.status === 'pending' || c.status === 'error');
    }

    if (toTranslate.length === 0) {
      this.translateOperation.set('none');
      return;
    }

    try {
      for (const chapter of toTranslate) {
        if (this.stopRequested()) {
          this.toast.info('Đã dừng dịch thuật hàng loạt theo yêu cầu.');
          break;
        }
        // Do it sequentially to avoid rate limiting
        const shouldContinue = await this.translateSingle(chapter);
        if (!shouldContinue) {
          this.stopRequested.set(true);
          this.toast.error('Tiến trình dịch tự động đã dừng lại do lỗi nghiêm trọng (ví dụ: hết Quota miễn phí hoặc sai API Key).');
          break;
        }
      }
      if (!this.stopRequested()) {
        this.toast.success(this.toast.Messages.TRANSLATION_COMPLETED);
      }
    } finally {
      this.translateOperation.set('none');
      this.stopRequested.set(false);
    }
  }
}

