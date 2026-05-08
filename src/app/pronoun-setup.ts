import { Component, inject, signal } from '@angular/core';
import { BookStore } from './book.store';
import { GeminiClient } from './gemini';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pronoun-setup',
  standalone: true,
  imports: [MatIconModule, FormsModule],
  template: `
    <div class="max-w-5xl mx-auto py-8 lg:px-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Thiết lập Đại từ Nhân xưng (Tùy chọn)</h2>
          <p class="text-gray-500 mt-1">Sử dụng AI phân tích nội dung truyện và xây dựng bảng đại từ nhân xưng, đảm bảo nhất quán khi dịch. Phù hợp cho thể loại tiểu thuyết, truyện ngắn. Các loại sách khác có thể không cần thiết.</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div class="space-y-6">
          <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
            <div class="flex flex-col sm:flex-row gap-4">
              <div class="flex-1">
                <label class="block text-xs font-semibold text-gray-700 uppercase tracking-widest mb-2">Trích xuất nội dung từ bản text đã lọc</label>
                <select [value]="pronounExtractRatio()" (change)="pronounExtractRatio.set(+$any($event.target).value)" [disabled]="isGeneratingPronouns()" class="w-full pl-3 pr-8 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg border">
                  <option value="0.25">25% nội dung sách</option>
                  <option value="0.5">50% nội dung sách</option>
                  <option value="1.0">100% nội dung sách</option>
                </select>
              </div>
              <div class="flex-1">
                <label class="block text-xs font-semibold text-gray-700 uppercase tracking-widest mb-2">Mô hình nhận diện</label>
                <select [value]="pronounModel()" (change)="pronounModel.set($any($event.target).value)" [disabled]="isGeneratingPronouns()" class="w-full pl-3 pr-8 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg border">
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
              } @else {
                <mat-icon class="mr-2 !w-5 !h-5 !text-[20px]">auto_awesome</mat-icon>
                Bắt đầu tạo bảng tự động
              }
            </button>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 uppercase tracking-widest mb-2 flex justify-between items-center">
              Nội dung bảng (Có thể chỉnh sửa)
            </label>
            <textarea 
              [value]="draftPronounTable()"
              (input)="draftPronounTable.set($any($event.target).value)"
              [disabled]="isGeneratingPronouns()"
              rows="12" 
              class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-lg bg-white disabled:bg-gray-100 p-3 font-mono text-sm leading-relaxed"
              placeholder="Ví dụ:&#10;- Harry: cậu, cậu bé, hắn&#10;- Dumbledore: ông, cụ thày&#10;- Snape (với Harry): mi, trò..."></textarea>
          </div>
        </div>
      </div>

      <div class="flex justify-between items-center">
        <button 
          (click)="skipAndContinue()"
          [disabled]="isGeneratingPronouns()"
          class="flex items-center space-x-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-6 py-3 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
        >
          <span>Bỏ qua phần này</span>
          <mat-icon class="!w-5 !h-5 !text-xl !flex !items-center !justify-center">fast_forward</mat-icon>
        </button>

        <button 
          (click)="saveAndContinue()"
          [disabled]="isGeneratingPronouns() || draftPronounTable().trim().length === 0"
          class="flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Lưu và Tiếp tục</span>
          <mat-icon class="!w-5 !h-5 !text-xl !flex !items-center !justify-center">arrow_forward</mat-icon>
        </button>
      </div>
    </div>
  `
})
export class PronounSetup {
  store = inject(BookStore);
  gemini = inject(GeminiClient);

  isGeneratingPronouns = signal<boolean>(false);
  draftPronounTable = signal<string>(this.store.pronounTable() || '');
  pronounExtractRatio = signal<number>(0.5);
  pronounModel = signal<string>('gemini-pro-latest');

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
       this.store.showToast('Không có nội dung sách để phân tích.', 'error');
       return;
    }

    try {
      this.isGeneratingPronouns.set(true);
      
      const ratio = this.pronounExtractRatio();
      const lengthToTake = Math.floor(fullText.length * ratio);
      const textToAnalyze = fullText.substring(0, lengthToTake);

      const result = await this.gemini.generatePronouns(textToAnalyze, this.pronounModel(), this.store.bookTitle(), this.store.author());
      this.draftPronounTable.set(result);
    } catch (e) {
      console.error(e);
      this.store.showToast('Có lỗi xảy ra khi tạo bảng đại từ', 'error');
    } finally {
      this.isGeneratingPronouns.set(false);
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
