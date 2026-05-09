import { Component, inject, signal } from '@angular/core';
import { BookStore } from '../../core/book.store';
import { ToastService } from '../../core/toast.service';
import { GeminiClient, parseGeminiError } from '../../core/gemini';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-glossary-setup',
  standalone: true,
  imports: [MatIconModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto py-8 lg:px-8 px-4">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Thiết lập Bảng Thuật Ngữ / Từ Khó (Tùy chọn)</h2>
          <p class="text-gray-500 mt-1">Sử dụng mô hình AI mạnh nhất để quét cuốn sách và trích xuất bảng thuật ngữ/từ khó dịch. Giúp bản dịch có chất lượng cao và thống nhất hơn. Đặc biệt cần thiết với sách chuyên ngành hoặc/và sách cổ. Tuy nhiên đây là tùy chọn, không bắt buộc phải làm nếu không thấy cần thiết.</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div class="space-y-6">
          <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
            <div class="flex flex-col sm:flex-row gap-4">
              <div class="flex-1">
                <label class="block text-xs font-semibold text-gray-700 uppercase tracking-widest mb-2">Trích xuất nội dung từ bản text đã lọc</label>
                <select [value]="glossaryExtractRatio()" (change)="glossaryExtractRatio.set(+$any($event.target).value)" [disabled]="isGenerating()" class="w-full pl-3 pr-8 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg border">
                  <option value="0.25">25% nội dung sách</option>
                  <option value="0.5">50% nội dung sách</option>
                  <option value="1">100% nội dung sách</option>
                </select>
              </div>
              <div class="flex-1">
                <label class="block text-xs font-semibold text-gray-700 uppercase tracking-widest mb-2">Mô hình nhận diện</label>
                <select [value]="glossaryModel()" (change)="glossaryModel.set($any($event.target).value)" [disabled]="isGenerating()" class="w-full pl-3 pr-8 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg border">
                  <option value="gemini-pro-latest">Pro (Tư duy sâu & Chuẩn xác - Bắt buộc)</option>
                </select>
              </div>
            </div>
            
            <button 
              (click)="generateGlossary()"
              [disabled]="isGenerating()"
              class="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
            >
              @if (isGenerating()) {
                <mat-icon class="animate-spin mr-2 !w-5 !h-5 !text-[20px]">sync</mat-icon>
                Đang phân tích sách và tạo bảng thuật ngữ (có thể mất nhiều phút)...
              } @else if (draftTable().trim().length > 0) {
                <mat-icon class="mr-2 !w-5 !h-5 !text-[20px]">refresh</mat-icon>
                Tạo lại bảng dữ liệu
              } @else {
                <mat-icon class="mr-2 !w-5 !h-5 !text-[20px]">auto_awesome</mat-icon>
                Bắt đầu tạo bảng tự động
              }
            </button>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 uppercase tracking-widest mb-2 flex justify-between items-center">
              Nội dung bảng (Có thể chỉnh sửa Markdown)
            </label>
            <textarea 
              [value]="draftTable()"
              (input)="draftTable.set($any($event.target).value)"
              [disabled]="isGenerating()"
              rows="15" 
              class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-lg bg-white disabled:bg-gray-100 p-3 font-mono text-sm leading-relaxed"
              placeholder="| Tiếng Anh | Tiếng Việt | Ghi chú văn cảnh |&#10;|---|---|---|&#10;| API | Giao diện lập trình ứng dụng |..."></textarea>
          </div>
        </div>
      </div>

      <div class="flex justify-between items-center">
        <button 
          (click)="skipAndContinue()"
          [disabled]="isGenerating()"
          class="flex items-center space-x-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-6 py-3 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
        >
          <span>Bỏ qua phần này</span>
          <mat-icon class="!w-5 !h-5 !text-xl !flex !items-center !justify-center">fast_forward</mat-icon>
        </button>

        <button 
          (click)="saveAndContinue()"
          [disabled]="isGenerating() || draftTable().trim().length === 0"
          class="flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Lưu và Tiếp tục</span>
          <mat-icon class="!w-5 !h-5 !text-xl !flex !items-center !justify-center">arrow_forward</mat-icon>
        </button>
      </div>
    </div>
  `
})
export class GlossarySetup {
  store = inject(BookStore);
  gemini = inject(GeminiClient);
  toast = inject(ToastService);

  isGenerating = signal<boolean>(false);
  draftTable = signal<string>(this.store.glossaryTable() || '');
  glossaryExtractRatio = signal<number>(this.store.config().glossaryGenRatio ?? 1); // Default 100%
  glossaryModel = signal<string>(this.store.config().glossaryGenModel ?? 'gemini-pro-latest');

  async generateGlossary() {
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
      this.isGenerating.set(true);
      this.store.isGeneratingMetadata.set(true);
      
      this.store.updateConfig({
        glossaryGenRatio: this.glossaryExtractRatio(),
        glossaryGenModel: this.glossaryModel()
      });

      const ratio = this.glossaryExtractRatio();
      const lengthToTake = Math.floor(fullText.length * ratio);
      const textToAnalyze = fullText.substring(0, lengthToTake);

      const result = await this.gemini.generateGlossary(textToAnalyze, this.store.bookTitle(), this.store.author());
      this.draftTable.set(result);
      this.toast.success(this.toast.Messages.GLOSSARY_SUCCESS);
    } catch (e: any) {
      console.error(e);
      this.toast.error(this.toast.Messages.GLOSSARY_ERROR(parseGeminiError(e)));
    } finally {
      this.isGenerating.set(false);
      this.store.isGeneratingMetadata.set(false);
    }
  }

  saveAndContinue() {
    this.store.saveGlossaryConf(this.draftTable(), true);
    this.store.phase.set(5);
  }

  skipAndContinue() {
    if (this.draftTable().trim().length > 0) {
      this.store.saveGlossaryConf(this.draftTable(), false);
    } else {
      this.store.saveGlossaryConf('', false);
    }
    this.store.phase.set(5);
  }
}
