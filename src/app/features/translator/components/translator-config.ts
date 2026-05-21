import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { BookStore } from '../../../core/book.store';

@Component({
  selector: 'app-translator-config',
  standalone: true,
  imports: [MatIconModule, FormsModule],
  template: `
    <div class="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 mb-8 flex flex-col gap-8 relative">
      <div class="flex flex-col md:flex-row gap-8">
        <!-- Model Selection -->
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">Chọn mô hình</h3>
          <div class="flex flex-col space-y-2">
            <label class="flex items-center space-x-3 transition-opacity"
                    [class.cursor-pointer]="!store.isTranslatingAny()"
                    [class.cursor-not-allowed]="store.isTranslatingAny()"
                    [class.opacity-50]="store.isTranslatingAny()">
              <input type="radio" name="model" value="gemini-flash-latest" 
                [disabled]="store.isTranslatingAny()"
                [checked]="store.config().model === 'gemini-flash-latest'"
                (change)="store.updateConfig({model: 'gemini-flash-latest'})"
                class="w-4 h-4 text-indigo-600 border-zinc-300 focus:ring-indigo-500 disabled:cursor-not-allowed">
              <span class="text-sm text-zinc-700 font-medium tracking-tight">[Nhanh & Tiết kiệm] - Flash</span>
            </label>
            <label class="flex items-center space-x-3 transition-opacity"
                    [class.cursor-pointer]="!store.isTranslatingAny()"
                    [class.cursor-not-allowed]="store.isTranslatingAny()"
                    [class.opacity-50]="store.isTranslatingAny()">
              <input type="radio" name="model" value="gemini-pro-latest" 
                [disabled]="store.isTranslatingAny()"
                [checked]="store.config().model === 'gemini-pro-latest'"
                (change)="store.updateConfig({model: 'gemini-pro-latest'})"
                class="w-4 h-4 text-red-600 border-zinc-300 focus:ring-red-500 disabled:cursor-not-allowed">
              <span class="text-sm text-zinc-700 font-medium tracking-tight">[Tư duy sâu] - Pro</span>
            </label>
          </div>
        </div>

        <div class="w-px bg-zinc-200 hidden md:block"></div>

        <!-- Pronouns Table Toggle -->
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            Đại từ nhân xưng
          </h3>
          <div class="flex flex-col space-y-3">
              <label class="flex items-center space-x-3 transition-opacity" [class.cursor-pointer]="!!store.pronounTable()" [class.cursor-not-allowed]="store.isTranslatingAny() || !store.pronounTable()" [class.opacity-50]="store.isTranslatingAny() || !store.pronounTable()">
              <input type="checkbox" 
                [checked]="store.usePronouns() && !!store.pronounTable()"
                (change)="toggleUsePronouns($event)"
                [disabled]="store.isTranslatingAny() || !store.pronounTable()"
                class="w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500 disabled:cursor-not-allowed"
                [class.cursor-pointer]="!!store.pronounTable()">
              <span class="text-zinc-700 font-medium tracking-tight">Kích hoạt Bảng đại từ</span>
            </label>
            <div class="text-xs text-zinc-500 italic mt-0">
              @if (store.pronounTable()) {
                  Đã có bảng đại từ.
              } @else {
                  Chưa thiết lập.
              }
            </div>
            <button 
              (click)="store.phase.set(3)"
              [disabled]="store.isTranslatingAny()"
              class="inline-flex max-w-fit items-center px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors mt-2 disabled:opacity-50"
            >
              <mat-icon class="mr-2 !w-4 !h-4 !text-base">assignment_ind</mat-icon>
              Chỉnh sửa & Tạo
            </button>
          </div>
        </div>

        <div class="w-px bg-zinc-200 hidden md:block"></div>

        <!-- Glossary Table Toggle -->
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            Thuật ngữ / Từ khó
          </h3>
          <div class="flex flex-col space-y-3">
              <label class="flex items-center space-x-3 transition-opacity" [class.cursor-pointer]="!!store.glossaryTable()" [class.cursor-not-allowed]="store.isTranslatingAny() || !store.glossaryTable()" [class.opacity-50]="store.isTranslatingAny() || !store.glossaryTable()">
              <input type="checkbox" 
                [checked]="store.useGlossary() && !!store.glossaryTable()"
                (change)="toggleUseGlossary($event)"
                [disabled]="store.isTranslatingAny() || !store.glossaryTable()"
                class="w-4 h-4 text-green-600 rounded border-zinc-300 focus:ring-green-500 disabled:cursor-not-allowed"
                [class.cursor-pointer]="!!store.glossaryTable()">
              <span class="text-zinc-700 font-medium tracking-tight">Kích hoạt Bảng từ khó</span>
            </label>
            <div class="text-xs text-zinc-500 italic mt-0">
              @if (store.glossaryTable()) {
                  Đã có bảng thuật ngữ.
              } @else {
                  Chưa thiết lập.
              }
            </div>
            <button 
              (click)="store.phase.set(4)"
              [disabled]="store.isTranslatingAny()"
              class="inline-flex max-w-fit items-center px-4 py-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors mt-2 disabled:opacity-50"
            >
              <mat-icon class="mr-2 !w-4 !h-4 !text-base">library_books</mat-icon>
              Chỉnh sửa & Tạo
            </button>
          </div>
        </div>
      </div>
      
      <!-- Summarization Toggle -->
      <div class="pt-6 border-t border-zinc-200 flex items-center justify-between">
        <label class="flex items-center space-x-3 transition-opacity cursor-pointer" [class.cursor-not-allowed]="store.isTranslatingAny()" [class.opacity-50]="store.isTranslatingAny()">
          <input type="checkbox" 
            [checked]="store.config().generateSummary !== false"
            (change)="toggleGenerateSummary($event)"
            [disabled]="store.isTranslatingAny()"
            class="w-4 h-4 text-amber-600 rounded border-zinc-300 focus:ring-amber-500 disabled:cursor-not-allowed"
            [class.cursor-pointer]="!store.isTranslatingAny()">
          <span class="text-zinc-700 font-medium tracking-tight">Tạo bản tóm tắt cho khối/chương dịch kế tiếp</span>
        </label>
        <div class="text-xs text-zinc-500 max-w-lg">[Mặc định Bật] - Tự động tóm tắt nội dung sau khi dịch xong một khối để đưa bối cảnh vào khối dịch kế tiếp. Hữu ích khi các chương/khối dịch là một phần của cuốn sách tổng thể. Nếu các chương/khối hoàn toàn độc lập, ví dụ như các truyện ngắn riêng biệt trong một cuốn sách lớn thì nên tắt tùy chọn này.</div>
      </div>
      <!-- Custom Instructions Toggle -->
      <div class="pt-6 border-t border-zinc-200">
        <button 
          (click)="isCustomInstructionsExpanded.set(!isCustomInstructionsExpanded())"
          class="flex items-center space-x-2 text-zinc-700 font-medium tracking-tight hover:text-indigo-600 transition-colors"
        >
          <mat-icon class="!w-5 !h-5 !text-[20px]">{{ isCustomInstructionsExpanded() ? 'remove_circle_outline' : 'add_circle_outline' }}</mat-icon>
          <span>Chỉ thị bổ sung khi dịch (tùy chọn)</span>
        </button>
        
        @if (isCustomInstructionsExpanded()) {
          <div class="mt-4 pl-7 pr-7 relative">
            <p class="text-xs text-zinc-500 mb-1 italic font-semibold">Bạn nên bỏ trống phần này trong phần lớn trường hợp!!! Mục này là tùy chọn, không bắt buộc nhập, và chỉ dành cho người dùng nâng cao, có hiểu sâu về cuốn sách định dịch.</p>
            <p class="text-xs text-zinc-500 mb-2 italic">Chỉ thị bổ sung ngắn gọn để thêm yêu cầu khi dịch (vd: phong cách, định dạng đặc thù). Nên viết dưới dạng các gạch đầu dòng và không quá 100 từ. Ví dụ:</p>
            <div class="relative">
              <textarea 
                [disabled]="store.isTranslatingAny()"
                [ngModel]="instructionText()"
                (ngModelChange)="onInstructionChange($event)"
                maxlength="1000"
                rows="6"
                placeholder="- Thể loại: Tiểu thuyết trinh thám cổ điển đầu thế kỷ 20.&#10;- Đối tượng: Độc giả trẻ, ngôn ngữ cần hiện đại và gãy gọn.&#10;- Phong cách: Ưu tiên từ thuần Việt, tránh lạm dụng từ Hán Việt.&#10;- Lưu ý: Nhân vật chính có giọng điệu mỉa mai, châm biếm."
                class="w-full p-3 pb-8 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-sm min-h-[150px] resize-y disabled:opacity-50 disabled:cursor-not-allowed"
              ></textarea>
              <div class="absolute inset-x-0 bottom-0 p-3 pointer-events-none flex items-center">
                <div class="text-[11px] text-zinc-400 font-medium transition-colors duration-300"
                     [class.text-red-500]="displayedWordCount() >= 100 || instructionText().length >= 1000">
                  Còn lại {{ 100 - displayedWordCount() }} từ / {{ 1000 - instructionText().length }} ký tự
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class TranslatorConfigComponent {
  store = inject(BookStore);
  isCustomInstructionsExpanded = signal(!!this.store.customInstructions());
  
  instructionText = signal(this.store.customInstructions() || '');
  displayedWordCount = signal(this.countWords(this.store.customInstructions() || ''));
  private countTimeout: any;

  countWords(text: string): number {
    const clean = text.trim();
    return clean ? clean.split(/\s+/).length : 0;
  }

  onInstructionChange(text: string) {
    let newText = text;
    let wordCount = this.countWords(newText);
     
    if (wordCount > 100) {
        const words = newText.trim().split(/\s+/);
        newText = words.slice(0, 100).join(' ');
        wordCount = 100;
    }

    this.instructionText.set(newText);
    this.store.customInstructions.set(newText);

    clearTimeout(this.countTimeout);
    this.countTimeout = setTimeout(() => {
      this.displayedWordCount.set(this.countWords(this.instructionText()));
    }, 1000);
  }

  toggleUsePronouns(event: Event) {
    if (!this.store.pronounTable()) return;
    const isChecked = (event.target as HTMLInputElement).checked;
    this.store.usePronouns.set(isChecked);
  }

  toggleUseGlossary(event: Event) {
    if (!this.store.glossaryTable()) return;
    const isChecked = (event.target as HTMLInputElement).checked;
    this.store.useGlossary.set(isChecked);
  }

  toggleGenerateSummary(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.store.updateConfig({ generateSummary: isChecked });
  }
}
