import { Component, input, output, model } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-split-options',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <!-- Tùy chọn 1: Chia theo từ khóa -->
    <div class="mb-4 p-5 rounded-xl border-2 transition-colors relative"
         [class.border-indigo-500]="activeSplitMode() === 'keyword'"
         [class.bg-indigo-50]="activeSplitMode() === 'keyword'"
         [class.bg-opacity-20]="activeSplitMode() === 'keyword'"
         [class.border-transparent]="activeSplitMode() !== 'keyword'">
      <div class="flex flex-col md:flex-row gap-4 md:items-start justify-between mb-4">
        <div class="flex-1 w-full">
          <label for="keywordInput" class="block text-sm font-bold text-zinc-900 mb-1">Tùy chọn 1: Chia theo Từ khóa Tiêu đề</label>
          <p class="text-xs text-zinc-500">Dùng khi các phần trong sách gốc bắt đầu bằng chữ như "Chapter", "Part", "Section", v.v.. Các khối vượt trần sẽ tự động được chia nhỏ bằng cách chia đôi.</p>
        </div>
        <div class="w-full md:w-32 flex-shrink-0">
          <button 
            (click)="onSelectKeywordMode.emit()"
            class="w-full h-11 flex items-center justify-center space-x-1.5 rounded-lg font-medium transition-colors border shadow-sm"
            [class.bg-indigo-600]="activeSplitMode() === 'keyword'"
            [class.text-white]="activeSplitMode() === 'keyword'"
            [class.border-indigo-600]="activeSplitMode() === 'keyword'"
            [class.hover:bg-indigo-700]="activeSplitMode() === 'keyword'"
            [class.bg-white]="activeSplitMode() !== 'keyword'"
            [class.text-zinc-700]="activeSplitMode() !== 'keyword'"
            [class.border-zinc-300]="activeSplitMode() !== 'keyword'"
            [class.hover:bg-zinc-50]="activeSplitMode() !== 'keyword'"
          >
            @if (activeSplitMode() === 'keyword') {
              <mat-icon class="!w-5 !h-5 !text-base">check</mat-icon>
              <span>Đang dùng</span>
            } @else {
              <span>Sử dụng</span>
            }
          </button>
        </div>
      </div>
      <div class="w-full px-3 py-2 border border-zinc-300 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-shadow bg-white flex flex-wrap gap-2 items-center min-h-[50px] cursor-text" tabindex="0" (click)="focusInput(keywordInput)" (keydown.enter)="focusInput(keywordInput)">
        @for (kw of draftKeywords(); track kw) {
          <span class="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            {{ kw }}
            <button type="button" class="ml-1.5 flex-shrink-0 inline-flex rounded-full text-indigo-500 hover:text-indigo-800 hover:bg-indigo-100 transition-colors" (click)="onRemoveKeyword.emit(kw); $event.stopPropagation()">
              <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">close</mat-icon>
            </button>
          </span>
        }
        <input type="text" 
              id="keywordInput"
              #keywordInput
              (keydown)="handleKeywordKeydown($event, keywordInput)"
              (blur)="addKeywordFromInput(keywordInput)"
              class="flex-1 min-w-[120px] border-0 bg-transparent p-1 text-sm text-zinc-900 focus:ring-0 placeholder:text-zinc-400 outline-none" 
              placeholder="Thêm từ khóa... (Enter để lưu)">
      </div>
    </div>

    <div class="flex items-center justify-center my-2 opacity-60">
      <div class="h-px bg-zinc-300 w-full max-w-[100px]"></div>
      <span class="mx-4 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Hoặc</span>
      <div class="h-px bg-zinc-300 w-full max-w-[100px]"></div>
    </div>

    <!-- Tùy chọn 2: Chia theo Tiêu đề Heading -->
    <div class="p-5 rounded-xl border-2 transition-colors relative"
         [class.border-indigo-500]="activeSplitMode() === 'heading'"
         [class.bg-indigo-50]="activeSplitMode() === 'heading'"
         [class.bg-opacity-20]="activeSplitMode() === 'heading'"
         [class.border-transparent]="activeSplitMode() !== 'heading'">
      <div class="flex flex-col md:flex-row gap-4 md:items-start justify-between mb-4">
        <div class="flex-1 w-full">
          <h4 class="block text-sm font-bold text-zinc-900 mb-1">Tùy chọn 2: Chia theo cấu trúc Thẻ Heading (H2, H3)</h4>
          <p class="text-xs text-zinc-500">Dùng khi sách gốc không có từ "Chapter", "Section" nhưng có thẻ <code>##</code> (H2) hoặc <code>###</code> (H3) phân định rõ ràng. Các khối vượt trần sẽ tự động được chia nhỏ bằng cách chia đôi.</p>
        </div>
        <div class="w-full md:w-32 flex-shrink-0">
          <button 
            (click)="onSelectHeadingMode.emit()"
            class="w-full h-11 flex items-center justify-center space-x-1.5 rounded-lg font-medium transition-colors border shadow-sm"
            [class.bg-indigo-600]="activeSplitMode() === 'heading'"
            [class.text-white]="activeSplitMode() === 'heading'"
            [class.border-indigo-600]="activeSplitMode() === 'heading'"
            [class.hover:bg-indigo-700]="activeSplitMode() === 'heading'"
            [class.bg-white]="activeSplitMode() !== 'heading'"
            [class.text-zinc-700]="activeSplitMode() !== 'heading'"
            [class.border-zinc-300]="activeSplitMode() !== 'heading'"
            [class.hover:bg-zinc-50]="activeSplitMode() !== 'heading'"
          >
            @if (activeSplitMode() === 'heading') {
              <mat-icon class="!w-5 !h-5 !text-base">check</mat-icon>
              <span>Đang dùng</span>
            } @else {
              <span>Sử dụng</span>
            }
          </button>
        </div>
      </div>
      <div class="flex flex-wrap gap-6 items-center">
        <label class="flex items-center gap-2 cursor-pointer p-2 -m-2 rounded-lg hover:bg-zinc-50 transition-colors">
          <input type="radio" name="headingLvl" value="h2" 
                 [checked]="activeSplitMode() === 'heading' && draftHeadingLevel() === 'h2'" 
                 (change)="onHeadingLevelChange.emit('h2')"
                 class="w-4 h-4 text-indigo-600 border-zinc-300 focus:ring-indigo-500">
          <span class="text-sm font-medium text-zinc-900">Thẻ H2</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer p-2 -m-2 rounded-lg hover:bg-zinc-50 transition-colors">
          <input type="radio" name="headingLvl" value="h3" 
                 [checked]="activeSplitMode() === 'heading' && draftHeadingLevel() === 'h3'" 
                 (change)="onHeadingLevelChange.emit('h3')"
                 class="w-4 h-4 text-indigo-600 border-zinc-300 focus:ring-indigo-500">
          <span class="text-sm font-medium text-zinc-900">Thẻ H3</span>
        </label>
      </div>
    </div>

    <div class="flex items-center justify-center my-2 opacity-60">
      <div class="h-px bg-zinc-300 w-full max-w-[100px]"></div>
      <span class="mx-4 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Hoặc</span>
      <div class="h-px bg-zinc-300 w-full max-w-[100px]"></div>
    </div>

    <!-- Tùy chọn 3: Standalone -->
    <div class="p-5 rounded-xl border-2 transition-colors relative"
         [class.border-indigo-500]="activeSplitMode() === 'standalone'"
         [class.bg-indigo-50]="activeSplitMode() === 'standalone'"
         [class.bg-opacity-20]="activeSplitMode() === 'standalone'"
         [class.border-transparent]="activeSplitMode() !== 'standalone'">
      <div class="flex flex-col md:flex-row gap-4 md:items-start justify-between">
        <div class="flex-1 w-full">
          <h4 class="block text-sm font-bold text-zinc-900 mb-1">Tùy chọn 3: Chia đều tự động (Hard-Split)</h4>
          <p class="text-xs text-zinc-500">Dùng khi sách không có cấu trúc chuẩn nào. Ứng dụng sẽ tự động chia đều sách thành các khối theo chuẩn giới hạn tối đa bên trên dựa vào các khoảng nghỉ (xuống dòng, ngắt câu...)</p>
        </div>
        <div class="w-full md:w-32 flex-shrink-0">
          <button 
            (click)="onSelectStandaloneMode.emit()"
            class="w-full h-11 flex items-center justify-center space-x-1.5 rounded-lg font-medium transition-colors border shadow-sm"
            [class.bg-indigo-600]="activeSplitMode() === 'standalone'"
            [class.text-white]="activeSplitMode() === 'standalone'"
            [class.border-indigo-600]="activeSplitMode() === 'standalone'"
            [class.hover:bg-indigo-700]="activeSplitMode() === 'standalone'"
            [class.bg-white]="activeSplitMode() !== 'standalone'"
            [class.text-zinc-700]="activeSplitMode() !== 'standalone'"
            [class.border-zinc-300]="activeSplitMode() !== 'standalone'"
            [class.hover:bg-zinc-50]="activeSplitMode() !== 'standalone'"
          >
            @if (activeSplitMode() === 'standalone') {
              <mat-icon class="!w-5 !h-5 !text-base">check</mat-icon>
              <span>Đang dùng</span>
            } @else {
              <span>Sử dụng</span>
            }
          </button>
        </div>
      </div>
    </div>
  `
})
export class SplitOptionsComponent {
  activeSplitMode = input.required<'keyword' | 'heading' | 'standalone'>();
  
  draftKeywords = input.required<string[]>();
  draftHeadingLevel = input.required<'h2' | 'h3'>();

  onAddKeyword = output<string>();
  onRemoveKeyword = output<string>();
  
  onSelectKeywordMode = output<void>();
  onSelectHeadingMode = output<void>();
  onHeadingLevelChange = output<'h2' | 'h3'>();
  onSelectStandaloneMode = output<void>();

  focusInput(input: HTMLInputElement) {
    input.focus();
  }

  handleKeywordKeydown(event: KeyboardEvent, input: HTMLInputElement) {
    if (event.code === 'Enter' || event.code === 'Comma') {
      event.preventDefault();
      this.addKeywordFromInput(input);
    }
  }

  addKeywordFromInput(input: HTMLInputElement) {
    const val = input.value.trim();
    if (val) {
      this.onAddKeyword.emit(val);
      input.value = '';
    }
  }
}
