import { Component, computed, inject, signal } from '@angular/core';
import { BookStore, Chapter } from '../../core/book.store';
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
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-3xl font-bold text-gray-900">Dịch thuật</h2>
          <p class="text-gray-500 mt-1">Đã sẵn sàng dịch {{ store.chapters().length }} phần của "{{ store.fileName() }}".</p>
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
            <button 
              disabled
              class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm flex items-center space-x-2 opacity-75 cursor-not-allowed"
            >
              <mat-icon class="animate-spin">sync</mat-icon>
              @if (translateOperation() === 'retranslate') {
                <span>Đang dịch lại toàn bộ sách...</span>
              } @else if (translateOperation() === 'all') {
                <span>Đang khởi tạo bản dịch...</span>
              } @else {
                <span>Đang dịch các phần chưa dịch...</span>
              }
            </button>
          } @else if (translationState() === 'all') {
            @if (showConfirmRetranslate()) {
              <div class="flex items-center space-x-3 bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-100 shadow-sm transition-all duration-200">
                <span class="text-sm font-medium">Bạn có chắc muốn dịch lại từ đầu? Lựa chọn này sẽ tốn thời gian & Token.</span>
                <div class="flex items-center space-x-2 border-l border-red-200 pl-3">
                  <button (click)="executeTranslateAll(true)" class="text-sm font-bold hover:text-red-900 transition-colors">Đồng ý</button>
                  <button (click)="showConfirmRetranslate.set(false)" class="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">Hủy</button>
                </div>
              </div>
            } @else {
               <button 
                (click)="showConfirmRetranslate.set(true)"
                [disabled]="store.isTranslatingAny()"
                [class.opacity-50]="store.isTranslatingAny()"
                [class.cursor-not-allowed]="store.isTranslatingAny()"
                class="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2"
              >
                <mat-icon>refresh</mat-icon>
                <span>Dịch lại toàn bộ cuốn sách</span>
              </button>
            }
          } @else if (translationState() === 'none') {
            <button 
              (click)="executeTranslateAll(false)"
              [disabled]="store.isTranslatingAny()"
              [class.opacity-50]="store.isTranslatingAny()"
              [class.cursor-not-allowed]="store.isTranslatingAny()"
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2 disabled:hover:bg-blue-600"
            >
              <mat-icon>translate</mat-icon>
              <span>Dịch toàn bộ cuốn sách</span>
            </button>
          } @else {
            <button 
              (click)="executeTranslateAll(false)"
              [disabled]="store.isTranslatingAny()"
              [class.opacity-50]="store.isTranslatingAny()"
              [class.cursor-not-allowed]="store.isTranslatingAny()"
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2 disabled:hover:bg-blue-600"
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
  
  expanded: Record<string, boolean> = {};

  showConfirmRetranslate = signal(false);
  translateOperation = signal<'none' | 'all' | 'retranslate' | 'untranslated'>('none');

  translationState = computed(() => {
    const chapters = this.store.chapters();
    if (chapters.length === 0) return 'none';
    const doneCount = chapters.filter(c => c.status === 'done').length;
    if (doneCount === 0) return 'none';
    if (doneCount === chapters.length) return 'all';
    return 'partial';
  });

  async translateSingle(chapter: Chapter) {
    this.store.updateChapter(chapter.id, { status: 'translating' });
    this.expanded[chapter.id] = true;
    
    try {
      const config = this.store.config();
      const result = await this.gemini.translateChapter(
        chapter.originalText, 
        config.model, 
        config.temperature,
        this.store.bookTitle(),
        this.store.author(),
        this.store.pronounTable(),
        this.store.usePronouns(),
        this.store.glossaryTable(),
        this.store.useGlossary()
      );
      
      const newVersionNumber = (chapter.latestVersionNumber || 0) + 1;
      const newVersion = {
        versionNumber: newVersionNumber,
        text: result,
        model: config.model,
        temperature: config.temperature,
        timestamp: Date.now()
      };
      
      const versions = [...(chapter.versions || []), newVersion].slice(-3);
      
      this.store.updateChapter(chapter.id, { 
        status: 'done',
        translatedText: result,
        versions: versions,
        latestVersionNumber: newVersionNumber,
        activeVersionNumber: newVersionNumber
      });
    } catch (e: unknown) {
      console.error(e);
      this.store.updateChapter(chapter.id, { status: 'error' });
      this.toast.error(this.toast.Messages.TRANSLATION_ERROR(chapter.title, parseGeminiError(e)));
    }
  }

  async executeTranslateAll(forceAll: boolean) {
    this.showConfirmRetranslate.set(false);
    
    let toTranslate = this.store.chapters();
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
        // Do it sequentially to avoid rate limiting
        await this.translateSingle(chapter);
      }
      this.toast.success(this.toast.Messages.TRANSLATION_COMPLETED);
    } finally {
      this.translateOperation.set('none');
    }
  }
}

