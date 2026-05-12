import { Component, computed, inject, signal, effect } from '@angular/core';
import { BookStore, Chapter } from '../../core/book.store';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../core/toast.service';
import { analyzeAndSplitText, PreviewChapter, countWords } from './splitter.util';
import { GeminiClient, parseGeminiError } from '../../core/gemini';

@Component({
  selector: 'app-splitter',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="max-w-4xl mx-auto py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-2xl font-bold text-zinc-900">Chia theo chương dịch (hoặc khối dịch)</h2>
          <p class="text-zinc-500 mt-1">Đang phân tích "{{ store.fileName() }}" để tìm ra cách phân chia tốt nhất.</p>
        </div>
        <button 
          (click)="downloadMarkdown()"
          class="flex items-center space-x-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          title="Tải về file markdown đã được trích xuất"
        >
          <mat-icon class="!w-5 !h-5 !text-xl !flex !items-center !justify-center text-zinc-500">download</mat-icon>
          <span class="hidden sm:inline">Tải file Markdown</span>
        </button>
      </div>

      @if (store.hasAnyTranslation()) {
        <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mb-8 rounded-r-xl shadow-sm">
          <div class="flex">
            <div class="flex-shrink-0 mt-0.5">
              <mat-icon class="text-amber-500 !text-xl !w-5 !h-5">warning</mat-icon>
            </div>
            <div class="ml-3">
              <p class="text-sm text-amber-800 font-medium">
                Việc chia lại chương bị vô hiệu hóa do dự án đã có nội dung đã được dịch.
              </p>
              <p class="text-sm text-amber-700 mt-1 leading-relaxed">
                Hãy tải về file Markdown đã xử lý ở nút phía trên bên phải, và tạo một dự án mới nếu bạn muốn chia lại sách.
              </p>
            </div>
          </div>
        </div>
      }

      <div class="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 mb-8 transition-opacity duration-300" [class.opacity-50]="store.hasAnyTranslation()" [class.pointer-events-none]="store.hasAnyTranslation()">
        <h3 class="text-lg font-semibold text-zinc-900 mb-6">Điều chỉnh cách phân chia</h3>
        
        <!-- AI Auto Analyze -->
        <div class="mb-6 p-5 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h4 class="text-sm font-bold text-indigo-900 mb-1 flex items-center space-x-2">
              <mat-icon class="!text-base !w-5 !h-5 text-indigo-600">auto_awesome</mat-icon>
              <span>Phân tích toàn diện bằng AI (Đề xuất)</span>
            </h4>
            <p class="text-xs text-indigo-700 leading-relaxed mb-3">
              AI sẽ quét mã nguồn sách để chọn phương án chia khối chuẩn nhất, đồng thời trích xuất sẵn Bảng Đại từ và Thuật ngữ chuyên ngành dùng cho bước sau.
            </p>
            <div class="flex items-center gap-4 text-xs font-medium text-indigo-800">
              <div class="flex items-center gap-1.5 bg-white/60 px-2.5 py-1 rounded-md border border-indigo-100">
                <mat-icon class="!text-[14px] !w-3.5 !h-3.5 text-indigo-500">article</mat-icon>
                <span>~{{ formatNumber(totalWords()) }} từ</span>
              </div>
              <div class="flex items-center gap-1.5 bg-white/60 px-2.5 py-1 rounded-md border border-indigo-100">
                <mat-icon class="!text-[14px] !w-3.5 !h-3.5 text-indigo-500">token</mat-icon>
                <span>~{{ formatNumber(estimatedTokens()) }} token</span>
              </div>
            </div>
            
            <div class="mt-3 max-w-[250px]">
              <select [value]="analysisModel()" (change)="analysisModel.set($any($event.target).value)" [disabled]="isAnalyzing()" class="w-full pl-3 pr-8 py-1.5 text-xs text-indigo-900 bg-white/80 border-indigo-200 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-lg border disabled:cursor-not-allowed">
                <option value="gemini-flash-latest">Flash (Nhanh & Tiết kiệm)</option>
                <option value="gemini-pro-latest">Pro (Tư duy sâu & Chuẩn xác)</option>
              </select>
            </div>
          </div>
          <button 
            (click)="runAllInOneAnalysis()"
            [disabled]="isAnalyzing()"
            class="flex-shrink-0 w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-wait">
            @if (isAnalyzing()) {
              <mat-icon class="animate-spin !text-base !w-5 !h-5 hidden sm:block">autorenew</mat-icon>
              <span>Đang phân tích...</span>
            } @else {
              <mat-icon class="!text-base !w-5 !h-5 hidden sm:block">memory</mat-icon>
              <span>Bắt đầu phân tích bằng AI</span>
            }
          </button>
        </div>

        <!-- Các thông số Tối thiểu và Tối đa biên độ -->
        <fieldset class="transition-opacity duration-300" [disabled]="isAnalyzing() || store.hasAnyTranslation()" [class.opacity-50]="isAnalyzing() || store.hasAnyTranslation()" [class.pointer-events-none]="isAnalyzing() || store.hasAnyTranslation()">
          <div class="mb-6 pb-6 border-b border-zinc-200 border-dashed">
            
            <div class="flex flex-col xl:flex-row items-center justify-between gap-6 xl:gap-4 w-full">
              
              <!-- Tối thiểu -->
              <div class="flex items-center gap-4 w-full xl:w-[45%] justify-between xl:justify-start">
                <div>
                  <label for="draftMinWords" class="block text-sm font-bold text-zinc-900 mb-1">Số từ tối thiểu</label>
                  <p class="text-xs text-zinc-500">Gộp các phần nhỏ hơn mức này.</p>
                </div>
                <input type="number" 
                      id="draftMinWords"
                      [value]="draftMinWords()" 
                      (input)="draftMinWords.set(+$any($event.target).value)" 
                      (keydown.enter)="applyWordsRange()"
                      min="1000" max="7000" step="500" 
                      class="w-28 flex-shrink-0 px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-center transition-shadow">
              </div>

              <!-- Divider -->
              <div class="hidden xl:block w-px h-12 bg-zinc-200"></div>
              <div class="block xl:hidden h-px w-full bg-zinc-200"></div>

              <!-- Tối đa -->
              <div class="flex items-center gap-4 w-full xl:w-[45%] justify-between xl:justify-end">
                <div>
                  <label for="draftMaxWords" class="block text-sm font-bold text-zinc-900 mb-1">Số từ tối đa</label>
                  <p class="text-xs text-zinc-500">Chia các phần lớn hơn mức này.</p>
                </div>
                <input type="number" 
                      id="draftMaxWords"
                      [value]="draftMaxWords()" 
                      (input)="draftMaxWords.set(+$any($event.target).value)" 
                      (keydown.enter)="applyWordsRange()"
                      min="10000" max="25000" step="1000" 
                      class="w-28 flex-shrink-0 px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-center transition-shadow">
              </div>

            </div>

            <!-- Nút áp dụng -->
            <div class="mt-6 flex justify-center">
              <button 
                (click)="applyWordsRange()"
                class="w-48 h-11 flex items-center justify-center space-x-1.5 rounded-lg font-medium transition-colors border shadow-sm text-sm"
                [class.bg-indigo-600]="draftMinWords() === activeMinWords() && draftMaxWords() === activeMaxWords()"
                [class.text-white]="draftMinWords() === activeMinWords() && draftMaxWords() === activeMaxWords()"
                [class.border-indigo-600]="draftMinWords() === activeMinWords() && draftMaxWords() === activeMaxWords()"
                [class.hover:bg-indigo-700]="draftMinWords() === activeMinWords() && draftMaxWords() === activeMaxWords()"
                [class.bg-indigo-50]="draftMinWords() !== activeMinWords() || draftMaxWords() !== activeMaxWords()"
                [class.text-indigo-700]="draftMinWords() !== activeMinWords() || draftMaxWords() !== activeMaxWords()"
                [class.border-indigo-200]="draftMinWords() !== activeMinWords() || draftMaxWords() !== activeMaxWords()"
                [class.hover:bg-indigo-100]="draftMinWords() !== activeMinWords() || draftMaxWords() !== activeMaxWords()"
              >
                @if (draftMinWords() === activeMinWords() && draftMaxWords() === activeMaxWords()) {
                  <mat-icon class="!w-4 !h-4 !text-sm">check</mat-icon>
                  <span>Đang áp dụng</span>
                } @else {
                  <span>Áp dụng ngay</span>
                }
              </button>
            </div>
            
          </div>

        <!-- Tùy chọn 1: Chia theo từ khóa -->
        <div class="mb-4 p-5 rounded-xl border-2 transition-colors relative"
             [class.border-indigo-500]="activeSplitMode() === 'keyword'"
             [class.bg-indigo-50]="activeSplitMode() === 'keyword'"
             [class.bg-opacity-20]="activeSplitMode() === 'keyword'"
             [class.border-transparent]="activeSplitMode() !== 'keyword'">
          <div class="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div class="flex-1 w-full">
              <label for="keywordInput" class="block text-sm font-bold text-zinc-900 mb-2">Tùy chọn 1: Chia theo Từ khóa Tiêu đề</label>
              <div class="w-full px-3 py-2 border border-zinc-300 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-shadow bg-white flex flex-wrap gap-2 items-center min-h-[50px] cursor-text" tabindex="0" (click)="focusInput(keywordInput)" (keydown.enter)="focusInput(keywordInput)">
                @for (kw of draftKeywords(); track kw) {
                  <span class="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {{ kw }}
                    <button type="button" class="ml-1.5 flex-shrink-0 inline-flex rounded-full text-indigo-500 hover:text-indigo-800 hover:bg-indigo-100 transition-colors" (click)="removeKeyword(kw); $event.stopPropagation()">
                      <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">close</mat-icon>
                    </button>
                  </span>
                }
                <input type="text" 
                      id="keywordInput"
                      #keywordInput
                      (keydown)="handleKeywordKeydown($event, keywordInput)"
                      (blur)="addKeyword(keywordInput)"
                      class="flex-1 min-w-[120px] border-0 bg-transparent p-1 text-sm text-zinc-900 focus:ring-0 placeholder:text-zinc-400 outline-none" 
                      placeholder="Thêm từ khóa... (Enter để lưu)">
              </div>
              <p class="text-xs text-zinc-500 mt-2">Dùng khi các phần trong sách gốc bắt đầu bằng chữ như "Chapter", "Part", "Section", v.v.. Các khối vượt trần sẽ tự động được chia nhỏ bằng cách chia đôi.</p>
            </div>
            <div class="w-full md:w-32 flex-shrink-0">
              <button 
                (click)="applyKeywordMode()"
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
          <div class="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div class="flex-1 w-full">
              <h4 class="block text-sm font-bold text-zinc-900 mb-3">Tùy chọn 2: Chia theo cấu trúc Thẻ Heading (H2, H3)</h4>
              <div class="flex flex-wrap gap-6 items-center">
                <label class="flex items-center gap-2 cursor-pointer p-2 -m-2 rounded-lg hover:bg-zinc-50 transition-colors">
                  <input type="radio" name="headingLvl" value="h2" 
                         [checked]="activeSplitMode() === 'heading' && draftHeadingLevel() === 'h2'" 
                         (change)="onHeadingLevelChange('h2')"
                         class="w-4 h-4 text-indigo-600 border-zinc-300 focus:ring-indigo-500">
                  <span class="text-sm font-medium text-zinc-900">Thẻ H2</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer p-2 -m-2 rounded-lg hover:bg-zinc-50 transition-colors">
                  <input type="radio" name="headingLvl" value="h3" 
                         [checked]="activeSplitMode() === 'heading' && draftHeadingLevel() === 'h3'" 
                         (change)="onHeadingLevelChange('h3')"
                         class="w-4 h-4 text-indigo-600 border-zinc-300 focus:ring-indigo-500">
                  <span class="text-sm font-medium text-zinc-900">Thẻ H3</span>
                </label>
              </div>
              <p class="text-xs text-zinc-500 mt-3">Dùng khi sách gốc không có từ "Chapter", "Section" nhưng có thẻ <code>##</code> (H2) hoặc <code>###</code> (H3) phân định rõ ràng. Các khối vượt trần sẽ tự động được chia nhỏ bằng cách chia đôi.</p>
            </div>
            <div class="w-full md:w-32 flex-shrink-0">
              <button 
                (click)="applyHeadingModeDefault()"
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
          <div class="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div class="flex-1 w-full">
              <h4 class="block text-sm font-bold text-zinc-900 mb-1">Tùy chọn 3: Chia đều tự động (Hard-Split)</h4>
              <p class="text-xs text-zinc-500 mt-2">Dùng khi sách không có cấu trúc chuẩn nào. Ứng dụng sẽ tự động chia đều sách thành các khối theo chuẩn giới hạn tối đa bên trên dựa vào các khoảng nghỉ (xuống dòng, ngắt câu...)</p>
            </div>
            <div class="w-full md:w-32 flex-shrink-0">
              <button 
                (click)="applyStandaloneMode()"
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
        </fieldset>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 transition-opacity duration-300"
           [class.opacity-50]="isAnalyzing() || store.hasAnyTranslation()"
           [class.pointer-events-none]="isAnalyzing() || store.hasAnyTranslation()">
        @for (method of splitMethods(); track method.keyword) {
          <div 
            role="button"
            tabindex="0"
            class="p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col"
            [class.border-indigo-500]="selectedMethodData()?.keyword === method.keyword"
            [class.bg-indigo-50]="selectedMethodData()?.keyword === method.keyword"
            [class.border-zinc-200]="selectedMethodData()?.keyword !== method.keyword"
            [class.hover:border-zinc-300]="selectedMethodData()?.keyword !== method.keyword"
            (keydown.enter)="selectMethod(method.keyword)"
            (click)="selectMethod(method.keyword)"
          >
            <div class="flex justify-between items-start mb-3">
              <h3 class="font-semibold text-zinc-900">Theo {{ method.keyword }} / Khối</h3>
              @if (selectedMethodData()?.keyword === method.keyword) {
                <mat-icon class="text-indigo-500">check_circle</mat-icon>
              }
            </div>
            
            <div class="mt-auto flex items-end justify-between">
              <div>
                <div class="text-3xl font-light text-zinc-900">{{ method.count }}</div>
                <div class="text-xs text-zinc-500 uppercase tracking-wider font-semibold mt-1">Khối được chia</div>
              </div>
            </div>
          </div>
        }
      </div>

      @if (selectedMethodData()) {
        <div class="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden mb-8">
          <div class="border-b border-zinc-200 bg-zinc-50 px-6 py-4 flex justify-between items-center">
            <h3 class="font-semibold text-zinc-900">Xem trước: Phân chia theo {{ selectedMethodData()?.keyword }} / Khối</h3>
            <div class="text-sm text-zinc-500">{{ selectedMethodData()?.count }} khối</div>
          </div>
          <div class="max-h-96 overflow-y-auto p-0">
            @for (chap of selectedMethodData()?.previewChapters; track $index) {
              <div role="button" tabindex="0" (keydown.enter)="previewBlock.set(chap)" class="px-6 py-4 border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors flex items-center justify-between group cursor-pointer" (click)="previewBlock.set(chap)">
                <div class="flex-1 min-w-0 pr-4">
                  <div class="flex items-center mb-1">
                    <h4 class="font-medium text-zinc-900 truncate pr-4">{{ chap.title }}</h4>
                    <span class="text-xs font-mono text-zinc-500 whitespace-nowrap ml-auto">{{ chap.wordCount }} từ</span>
                  </div>
                  <p class="text-sm text-zinc-500 line-clamp-2">{{ chap.previewText }}</p>
                </div>
                <div class="text-zinc-300 group-hover:text-indigo-500 transition-colors ml-4 flex-shrink-0">
                  <mat-icon class="!w-6 !h-6 !text-2xl">visibility</mat-icon>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="flex justify-end transition-opacity duration-300"
             [class.opacity-50]="isAnalyzing()"
             [class.pointer-events-none]="isAnalyzing()">
          <button 
            (click)="applySplit()"
            [disabled]="selectedMethodData()?.count === 0 || isAnalyzing()"
            class="flex items-center space-x-2 bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Tiếp tục</span>
            <mat-icon class="!w-5 !h-5 !text-xl !flex !items-center !justify-center">arrow_forward</mat-icon>
          </button>
        </div>
      }

      @if (previewBlock()) {
        <div role="button" tabindex="0" (keydown.enter)="previewBlock.set(null)" class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4 sm:p-6" (click)="previewBlock.set(null)">
          <div role="presentation" class="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all cursor-default" (click)="$event.stopPropagation()">
            <div class="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/80">
              <div>
                <h3 class="text-lg font-semibold text-zinc-900">{{ previewBlock()?.title }}</h3>
                <p class="text-sm text-zinc-500">{{ previewBlock()?.wordCount }} từ</p>
              </div>
              <button class="text-zinc-400 hover:text-zinc-600 transition-colors p-2 rounded-full hover:bg-zinc-200/50 flex items-center justify-center" (click)="previewBlock.set(null)">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="p-6 overflow-y-auto flex-1 bg-white">
              <div class="whitespace-pre-wrap font-mono text-sm text-zinc-700 leading-relaxed">
                {{ previewBlock()?.originalText }}
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class Splitter {
  store = inject(BookStore);
  toast = inject(ToastService);
  gemini = inject(GeminiClient);

  isAnalyzing = signal<boolean>(false);
  analysisModel = signal<string>(this.store.config().analysisModel ?? 'gemini-pro-latest');

  draftKeywords = signal<string[]>(['Chapter', 'Part', 'Section']);
  draftMinWords = signal(5000);
  draftMaxWords = signal(15000);
  
  activeKeywords = signal<string[]>(['Chapter', 'Part', 'Section']);
  activeMinWords = signal(5000);
  activeMaxWords = signal(15000);
  
  activeSplitMode = signal<'keyword' | 'heading' | 'standalone'>('keyword');
  draftHeadingLevel = signal<'h2' | 'h3'>('h2');
  activeHeadingLevel = signal<'h2' | 'h3'>('h2');
  
  selectedMethod = signal<string | null>(null);
  previewBlock = signal<PreviewChapter | null>(null);

  totalWords = computed(() => {
    const text = this.store.rawMarkdown() || '';
    return countWords(text);
  });

  estimatedTokens = computed(() => {
    return Math.round(this.totalWords() * 1.4);
  });

  formatNumber(val: number): string {
    if (val === 0) return '0';
    if (val < 1000) return Math.round(val).toString();
    return (val / 1000).toFixed(1) + 'K';
  }

  constructor() {
    const settings = this.store.splitSettings();
    if (settings) {
      this.draftKeywords.set(settings.activeKeywords);
      this.activeKeywords.set(settings.activeKeywords);
      
      this.draftMinWords.set(settings.activeMinWords || 5000);
      this.activeMinWords.set(settings.activeMinWords || 5000);
      
      const mx = (settings as any).activeMaxWords || 15000;
      this.draftMaxWords.set(mx);
      this.activeMaxWords.set(mx);
      
      this.draftHeadingLevel.set(settings.activeHeadingLevel);
      this.activeHeadingLevel.set(settings.activeHeadingLevel);
      
      this.activeSplitMode.set(settings.activeSplitMode as any);
      if (settings.selectedMethod !== undefined) {
        this.selectedMethod.set(settings.selectedMethod);
      }
    }

    effect(() => {
      this.store.splitSettings.set({
        activeSplitMode: this.activeSplitMode(),
        activeKeywords: this.activeKeywords(),
        activeHeadingLevel: this.activeHeadingLevel(),
        activeMinWords: this.activeMinWords(),
        activeMaxWords: this.activeMaxWords(),
        selectedMethod: this.selectedMethod()
      } as any);
    });
  }

  focusInput(input: HTMLInputElement) {
    input.focus();
  }

  onHeadingLevelChange(level: 'h2' | 'h3') {
    this.draftHeadingLevel.set(level);
    if (this.activeSplitMode() !== 'heading') {
      this.activeSplitMode.set('heading');
    }
    this.applyHeadingMode();
  }

  applyHeadingModeDefault() {
    if (this.activeSplitMode() !== 'heading') {
      this.draftHeadingLevel.set('h2');
    }
    this.applyHeadingMode();
  }

  handleKeywordKeydown(event: KeyboardEvent, inputElement: HTMLInputElement) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addKeyword(inputElement);
    }
  }

  addKeyword(inputElement: HTMLInputElement) {
    const value = inputElement.value.trim();
    if (value) {
      const newKws = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
      let currentKws = this.draftKeywords();
      let hasChanges = false;
      for (const nw of newKws) {
        if (!currentKws.includes(nw)) {
           currentKws = [...currentKws, nw];
           hasChanges = true;
        }
      }
      if (hasChanges) {
        this.draftKeywords.set(currentKws);
        this.applyKeywordMode();
      }
      inputElement.value = '';
    }
  }

  removeKeyword(kwToRemove: string) {
    this.draftKeywords.update(kws => kws.filter(k => k !== kwToRemove));
    this.applyKeywordMode();
  }

  async runAllInOneAnalysis() {
    try {
      const text = this.store.rawMarkdown();
      if (!text) {
        this.toast.error('Không tìm thấy nội dung sách để phân tích.');
        return;
      }

      // Update the model config
      this.store.updateConfig({ analysisModel: this.analysisModel() });

      this.isAnalyzing.set(true);
      const jsonString = await this.gemini.analyzeAllInOne(
        text, 
        this.analysisModel(),
        this.store.bookTitle(), 
        this.store.author()
      );

      const data = JSON.parse(jsonString);

      // 1. Áp dụng Split Option
      if (data.splitOptions) {
        const option = data.splitOptions.recommendedOption;
        if (option === 'keyword' && data.splitOptions.recommendedKeywords) {
          const kws = data.splitOptions.recommendedKeywords;
          if (Array.isArray(kws) && kws.length > 0) {
            this.draftKeywords.set(kws);
            this.applyKeywordMode();
            this.toast.success(`AI phân tích: Theo Từ khóa. Lý do: ${data.splitOptions.reason || 'Sách có cấu trúc từ khóa rõ ràng.'}`);
          }
        } else if (option === 'regex' && data.splitOptions.recommendedRegex) {
          const rx = data.splitOptions.recommendedRegex;
          if (rx.includes('h3') || rx.includes('###')) {
            this.draftHeadingLevel.set('h3');
          } else {
            this.draftHeadingLevel.set('h2');
          }
          this.applyHeadingMode();
          this.toast.success(`AI phân tích: Theo Thẻ Heading. Lý do: ${data.splitOptions.reason}`);
        } else {
          this.applyStandaloneMode();
          this.toast.success(`AI phân tích: Chia tự động. Lý do: ${data.splitOptions.reason}`);
        }
      }

      // 2. Tạo Markdown Đại Từ
      if (data.pronounsTable && Array.isArray(data.pronounsTable) && data.pronounsTable.length > 0) {
        let md = '| Nhân vật (Original) | Đặc điểm & Vai trò | Ngôi thứ 3 (Narrator gọi) | Xưng - Hô (Với các nhân vật khác) | Ghi chú / Sắc thái |\n|---|---|---|---|---|\n';
        for (const pt of data.pronounsTable) {
          md += `| ${pt.originalName || ''} | ${pt.role || ''} | ${pt.narratorPronoun || ''} | ${pt.dialoguePronouns || ''} | ${pt.notes || ''} |\n`;
        }
        // Gọi update trực tiếp store (bạn có thể set qua method nếu store support)
        this.store.pronounTable.set(md);
        this.store.usePronouns.set(true);
      }

      // 3. Tạo Markdown Thuật ngữ
      if (data.glossaryTable && Array.isArray(data.glossaryTable) && data.glossaryTable.length > 0) {
        let md = '| Tiếng Anh | Tiếng Việt | Ghi chú văn cảnh |\n|---|---|---|\n';
        for (const gt of data.glossaryTable) {
          md += `| ${gt.english || ''} | ${gt.vietnamese || ''} | ${gt.contextNotes || ''} |\n`;
        }
        this.store.glossaryTable.set(md);
        this.store.useGlossary.set(true);
      }

      this.toast.success('Đã áp dụng các cài đặt được AI phân tích.');

    } catch (e) {
      console.error('All-in-One Analysis failed:', e);
      this.toast.error(parseGeminiError(e));
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  applyWordsRange() {
    const minW = Math.max(1000, Math.min(7000, this.draftMinWords()));
    const maxW = Math.max(10000, Math.min(25000, this.draftMaxWords()));
    this.draftMinWords.set(minW);
    this.activeMinWords.set(minW);
    this.draftMaxWords.set(maxW);
    this.activeMaxWords.set(maxW);
  }

  applyKeywordMode() {
    const kwArray = this.draftKeywords();
    this.activeKeywords.set(kwArray.length > 0 ? kwArray : ['Chapter']);
    
    this.applyWordsRange();
    
    this.activeSplitMode.set('keyword');
  }

  applyHeadingMode() {
    this.applyWordsRange();
    
    this.activeHeadingLevel.set(this.draftHeadingLevel());
    
    this.activeSplitMode.set('heading');
  }

  applyStandaloneMode() {
    this.applyWordsRange();
    this.activeSplitMode.set('standalone');
  }

  splitMethods = computed(() => {
    return analyzeAndSplitText(
      this.store.rawMarkdown() || '',
      this.activeMinWords(),
      this.activeMaxWords(),
      this.activeSplitMode(),
      this.activeKeywords(),
      this.activeHeadingLevel()
    );
  });

  selectedMethodData = computed(() => {
    const sel = this.selectedMethod();
    const methods = this.splitMethods();
    if (methods.length === 0) return null;
    
    if (sel) {
      const found = methods.find(m => m.keyword === sel);
      if (found) return found;
    }
    return methods[0];
  });

  selectMethod(kw: string) {
    this.selectedMethod.set(kw);
  }

  downloadMarkdown() {
    try {
      const text = this.store.rawMarkdown();
      if (!text) {
        this.toast.error(this.toast.Messages.DOWNLOAD_MARKDOWN_ERROR);
        return;
      }
      const blob = new Blob([text], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      let safeName = (this.store.fileName() || 'book_content').replace(/\.[^/.]+$/, "");
      if (!safeName) safeName = 'book_content';
      a.download = `${safeName}.md`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.toast.success(this.toast.Messages.DOWNLOAD_MARKDOWN_SUCCESS);
    } catch {
      this.toast.error(this.toast.Messages.DOWNLOAD_MARKDOWN_ERROR);
    }
  }

  applySplit() {
    if (this.store.hasAnyTranslation()) {
      this.store.phase.set(3);
      return;
    }

    const data = this.selectedMethodData();
    if (!data) return;

    const chapters: Chapter[] = data.previewChapters.map((c, idx) => ({
      id: `chapter_${idx}_${Date.now()}`,
      order: idx,
      title: c.title,
      originalText: c.originalText,
      wordCount: c.wordCount,
      status: c.excludeFromTranslation ? 'done' : 'pending',
      excludeFromTranslation: c.excludeFromTranslation,
      translatedText: c.excludeFromTranslation ? c.originalText : undefined
    }));

    this.store.setChapters(chapters);
  }
}

