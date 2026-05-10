import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { BookStore } from '../../core/book.store';
import { ToastService } from '../../core/toast.service';
import { GeminiClient, parseGeminiError } from '../../core/gemini';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MarkdownTableEditorComponent } from '../../shared/components/markdown-table-editor.component';

@Component({
  selector: 'app-pronoun-setup',
  standalone: true,
  imports: [MatIconModule, FormsModule, MarkdownTableEditorComponent],
  template: `
    <div class="max-w-7xl mx-auto py-8 lg:px-8 px-4">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-2xl font-bold text-zinc-900">Thiết lập Đại từ Nhân xưng (Tùy chọn)</h2>
          <p class="text-zinc-500 mt-1">Sử dụng AI phân tích nội dung truyện và xây dựng bảng đại từ nhân xưng, đảm bảo nhất quán khi dịch. Phù hợp cho thể loại tiểu thuyết, truyện ngắn. Các loại sách khác có thể không cần thiết.</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 mb-8">
        <div class="space-y-6">
          <div class="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-4">
            <div class="flex flex-col sm:flex-row gap-4">
              <div class="flex-1">
                <label for="pronounExtractRatio" class="block text-xs font-semibold text-zinc-700 uppercase tracking-widest mb-2">Trích xuất nội dung từ bản text đã lọc</label>
                <select id="pronounExtractRatio" [value]="pronounExtractRatio()" (change)="pronounExtractRatio.set(+$any($event.target).value)" [disabled]="isGeneratingPronouns()" class="w-full pl-3 pr-8 py-2 text-sm border-zinc-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg border">
                  <option value="0.25">25% nội dung sách</option>
                  <option value="0.5">50% nội dung sách</option>
                  <option value="1">100% nội dung sách</option>
                </select>
              </div>
              <div class="flex-1">
                <label for="pronounModel" class="block text-xs font-semibold text-zinc-700 uppercase tracking-widest mb-2">Mô hình nhận diện</label>
                <select id="pronounModel" [value]="pronounModel()" (change)="pronounModel.set($any($event.target).value)" [disabled]="isGeneratingPronouns()" class="w-full pl-3 pr-8 py-2 text-sm border-zinc-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg border">
                  <option value="gemini-flash-latest">Flash (Nhanh & Tiết kiệm)</option>
                  <option value="gemini-pro-latest">Pro (Tư duy sâu & Chuẩn xác)</option>
                </select>
              </div>
            </div>
            
            <button 
              (click)="generatePronouns()"
              [disabled]="isGeneratingPronouns()"
              class="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
            >
              @if (isGeneratingPronouns()) {
                <mat-icon class="animate-spin mr-2 !w-5 !h-5 !text-[20px]">sync</mat-icon>
                Đang phân tích và tạo bảng...
              } @else if (draftPronounTable().trim().length > 0) {
                <mat-icon class="mr-2 !w-5 !h-5 !text-[20px]">refresh</mat-icon>
                Tạo lại bảng dữ liệu
              } @else {
                <mat-icon class="mr-2 !w-5 !h-5 !text-[20px]">auto_awesome</mat-icon>
                Bắt đầu tạo bảng tự động
              }
            </button>
          </div>

          <div class="mt-8">
            <app-markdown-table-editor
              [value]="draftPronounTable()"
              (valueChange)="onTableChange($event)"
              [disabled]="isGeneratingPronouns()"
            ></app-markdown-table-editor>
          </div>
        </div>
      </div>

      <div class="flex justify-between items-center">
        <button 
          (click)="skipAndContinue()"
          [disabled]="isGeneratingPronouns()"
          class="flex items-center space-x-2 text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 px-6 py-3 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
        >
          <span>Bỏ qua phần này</span>
          <mat-icon class="!w-5 !h-5 !text-xl !flex !items-center !justify-center">fast_forward</mat-icon>
        </button>

        <button 
          (click)="saveAndContinue()"
          [disabled]="isGeneratingPronouns() || draftPronounTable().trim().length === 0"
          class="flex items-center space-x-2 bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{{ isManuallyEdited() ? 'Lưu và Tiếp tục' : 'Tiếp tục' }}</span>
          <mat-icon class="!w-5 !h-5 !text-xl !flex !items-center !justify-center">arrow_forward</mat-icon>
        </button>
      </div>
    </div>
  `
})
export class PronounSetup implements OnInit, OnDestroy {
  store = inject(BookStore);
  gemini = inject(GeminiClient);
  toast = inject(ToastService);

  isGeneratingPronouns = signal<boolean>(false);
  draftPronounTable = signal<string>(this.store.pronounTable() || '');
  pronounExtractRatio = signal<number>(this.store.config().pronounGenRatio ?? 0.5);
  pronounModel = signal<string>(this.store.config().pronounGenModel ?? 'gemini-pro-latest');
  isManuallyEdited = signal<boolean>(false);
  private autoSaveSubject = new Subject<string>();

  ngOnInit() {
    this.autoSaveSubject.pipe(debounceTime(3000)).subscribe(val => {
      if (val.trim().length > 0) {
        this.store.savePronounsConf(val, true);
      }
    });
  }

  ngOnDestroy() {
    this.autoSaveSubject.complete();
  }

  onTableChange(val: string) {
    this.draftPronounTable.set(val);
    this.isManuallyEdited.set(true);
    this.autoSaveSubject.next(val);
  }

  async generatePronouns() {
    // Generate full text from markdown representation (so it's exactly what is going to be used, minus noise if it was cleaned/split!)
    // Wait, let's take it from chapters to be safe, or just from rawMarkdown
    let fullText = '';
    const chapters = this.store.chapters();
    if (chapters && chapters.length > 0) {
       fullText = chapters.map(c => c.title + '\n' + c.originalText).join('\n\n');
    } else {
       fullText = this.store.rawMarkdown() || '';
    }

    if (!fullText) {
       this.toast.error(this.toast.Messages.NO_CONTENT_TO_ANALYZE);
       return;
    }

    try {
      this.isGeneratingPronouns.set(true);
      this.store.isGeneratingMetadata.set(true);
      
      this.store.updateConfig({
        pronounGenRatio: this.pronounExtractRatio(),
        pronounGenModel: this.pronounModel()
      });

      const ratio = this.pronounExtractRatio();
      const lengthToTake = Math.floor(fullText.length * ratio);
      const textToAnalyze = fullText.substring(0, lengthToTake);

      const result = await this.gemini.generatePronouns(textToAnalyze, this.pronounModel(), this.store.bookTitle(), this.store.author());
      this.draftPronounTable.set(result);
      this.isManuallyEdited.set(false);
      this.store.savePronounsConf(result, true);
      this.toast.success(this.toast.Messages.PRONOUNS_SUCCESS);
    } catch (e: unknown) {
      console.error(e);
      this.toast.error(this.toast.Messages.PRONOUNS_ERROR(parseGeminiError(e)));
    } finally {
      this.isGeneratingPronouns.set(false);
      this.store.isGeneratingMetadata.set(false);
    }
  }

  saveAndContinue() {
    this.store.savePronounsConf(this.draftPronounTable(), true);
    this.store.phase.set(4);
  }

  skipAndContinue() {
    if (this.draftPronounTable().trim().length > 0) {
      // If there's something, but user clicks skip, we can save it just not turn it on, or just turn it off
      this.store.savePronounsConf(this.draftPronounTable(), false);
    } else {
      this.store.savePronounsConf('', false);
    }
    this.store.phase.set(4);
  }
}
