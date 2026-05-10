import { Component, computed, inject, signal } from '@angular/core';
import { BookStore, Chapter } from '../../core/book.store';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-splitter',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="max-w-4xl mx-auto py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Chia theo chương dịch (hoặc khối dịch)</h2>
          <p class="text-gray-500 mt-1">Đang phân tích "{{ store.fileName() }}" để tìm ra cách phân chia tốt nhất.</p>
        </div>
        <button 
          (click)="downloadMarkdown()"
          class="flex items-center space-x-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          title="Tải về file markdown đã được trích xuất"
        >
          <mat-icon class="!w-5 !h-5 !text-xl !flex !items-center !justify-center text-gray-500">download</mat-icon>
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

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 transition-opacity duration-300" [class.opacity-50]="store.hasAnyTranslation()" [class.pointer-events-none]="store.hasAnyTranslation()">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Điều chỉnh cách phân chia</h3>
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div class="md:col-span-5">
            <label for="keywordInput" class="block text-sm font-medium text-gray-700 mb-1">Từ khóa chia</label>
            <div class="w-full px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-shadow bg-white flex flex-wrap gap-2 items-center min-h-[50px]">
              @for (kw of draftKeywords(); track kw) {
                <span class="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  {{ kw }}
                  <button type="button" class="ml-1.5 flex-shrink-0 inline-flex rounded-full text-blue-500 hover:text-blue-800 hover:bg-blue-100 transition-colors" (click)="removeKeyword(kw)">
                    <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">close</mat-icon>
                  </button>
                </span>
              }
              <input type="text" 
                    id="keywordInput"
                    #keywordInput
                    (keydown)="handleKeywordKeydown($event, keywordInput)"
                    (blur)="addKeyword(keywordInput)"
                    class="flex-1 min-w-[120px] border-0 bg-transparent p-1 text-sm text-gray-900 focus:ring-0 placeholder:text-gray-400 outline-none" 
                    placeholder="Thêm từ khóa... (Enter để lưu)">
            </div>
            <p class="text-xs text-gray-500 mt-2">Bấm Enter hoặc phẩy để thêm. Hỗ trợ ký tự đặc biệt.</p>
          </div>
          <div class="md:col-span-5">
            <label for="draftMinWords" class="block text-sm font-medium text-gray-700 mb-1">Số từ tối thiểu mỗi phần</label>
            <input type="number" 
                  id="draftMinWords"
                  [value]="draftMinWords()" 
                  (input)="draftMinWords.set(+$any($event.target).value)" 
                  min="1000" max="20000" step="500" 
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg text-center transition-shadow">
            <p class="text-xs text-gray-500 mt-2">Các phần nhỏ hơn sẽ tự động được gộp.</p>
          </div>
          <div class="md:col-span-2 pt-6">
            <button 
              (click)="applySettings()"
              class="w-full h-[50px] flex items-center justify-center space-x-1.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition-colors border border-gray-300">
              <mat-icon class="!w-5 !h-5 !text-base">refresh</mat-icon>
              <span>Áp dụng</span>
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        @for (method of splitMethods(); track method.keyword) {
          <div 
            role="button"
            tabindex="0"
            class="p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col"
            [class.border-blue-500]="selectedMethod() === method.keyword"
            [class.bg-blue-50]="selectedMethod() === method.keyword"
            [class.border-gray-200]="selectedMethod() !== method.keyword"
            [class.hover:border-gray-300]="selectedMethod() !== method.keyword"
            (keydown.enter)="selectMethod(method.keyword)"
            (click)="selectMethod(method.keyword)"
          >
            <div class="flex justify-between items-start mb-3">
              <h3 class="font-semibold text-gray-900">Theo {{ method.keyword }} / Khối</h3>
              @if (selectedMethod() === method.keyword) {
                <mat-icon class="text-blue-500">check_circle</mat-icon>
              }
            </div>
            
            <div class="mt-auto flex items-end justify-between">
              <div>
                <div class="text-3xl font-light text-gray-900">{{ method.count }}</div>
                <div class="text-xs text-gray-500 uppercase tracking-wider font-semibold mt-1">Khối được chia</div>
              </div>
            </div>
          </div>
        }
      </div>

      @if (selectedMethodData()) {
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div class="border-b border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
            <h3 class="font-semibold text-gray-900">Xem trước: Phân chia theo {{ selectedMethodData()?.keyword }} / Khối</h3>
            <div class="text-sm text-gray-500">{{ selectedMethodData()?.count }} khối</div>
          </div>
          <div class="max-h-96 overflow-y-auto p-0">
            @for (chap of selectedMethodData()?.previewChapters; track $index) {
              <div role="button" tabindex="0" (keydown.enter)="previewBlock.set(chap)" class="px-6 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer" (click)="previewBlock.set(chap)">
                <div class="flex-1 min-w-0 pr-4">
                  <div class="flex items-center mb-1">
                    <h4 class="font-medium text-gray-900 truncate pr-4">{{ chap.title }}</h4>
                    <span class="text-xs font-mono text-gray-500 whitespace-nowrap ml-auto">{{ chap.wordCount }} từ</span>
                  </div>
                  <p class="text-sm text-gray-500 line-clamp-2">{{ chap.previewText }}</p>
                </div>
                <div class="text-gray-300 group-hover:text-blue-500 transition-colors ml-4 flex-shrink-0">
                  <mat-icon class="!w-6 !h-6 !text-2xl">visibility</mat-icon>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="flex justify-end">
          <button 
            (click)="applySplit()"
            [disabled]="selectedMethodData()?.count === 0"
            class="flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Bước kế tiếp</span>
            <mat-icon class="!w-5 !h-5 !text-xl !flex !items-center !justify-center">arrow_forward</mat-icon>
          </button>
        </div>
      }

      @if (previewBlock()) {
        <div role="button" tabindex="0" (keydown.enter)="previewBlock.set(null)" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 sm:p-6" (click)="previewBlock.set(null)">
          <div role="presentation" class="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all cursor-default" (click)="$event.stopPropagation()">
            <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/80">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">{{ previewBlock()?.title }}</h3>
                <p class="text-sm text-gray-500">{{ previewBlock()?.wordCount }} từ</p>
              </div>
              <button class="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-200/50 flex items-center justify-center" (click)="previewBlock.set(null)">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="p-6 overflow-y-auto flex-1 bg-white">
              <div class="whitespace-pre-wrap font-mono text-sm text-gray-700 leading-relaxed">
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

  draftKeywords = signal<string[]>(['Chapter', 'Part', 'Section']);
  draftMinWords = signal(1000);
  
  activeKeywords = signal<string[]>(['Chapter', 'Part', 'Section']);
  activeMinWords = signal(1000);
  
  selectedMethod = signal<string | null>(null);
  previewBlock = signal<{title: string, previewText: string, wordCount: number, originalText: string} | null>(null);

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
      }
      inputElement.value = '';
    }
  }

  removeKeyword(kwToRemove: string) {
    this.draftKeywords.update(kws => kws.filter(k => k !== kwToRemove));
  }

  applySettings() {
    const kwArray = this.draftKeywords();
    
    this.activeKeywords.set(kwArray.length > 0 ? kwArray : ['Chapter']);
    
    const minW = Math.max(1000, Math.min(20000, this.draftMinWords()));
    this.draftMinWords.set(minW); // Reset draft if out of bounds
    this.activeMinWords.set(minW);
  }

  escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  splitMethods = computed(() => {
    const text = this.store.rawMarkdown() || '';
    const minW = this.activeMinWords();
    const activeKw = this.activeKeywords();
    
    // First, add default "No split / Entire Book" method just in case
    const methods = [{
      keyword: 'Toàn bộ file',
      count: 1,
      previewChapters: this.generatePreview(text, 'Toàn bộ file', minW)
    }];

    for (const kw of activeKw) {
      const escapedKw = this.escapeRegExp(kw);
      // Regex to find headings (optional #s) that start with keyword (case insensitive)
      // Example: ## Chapter 1 or Chapter 1
      const regex = new RegExp(`^(#*\\s*${escapedKw}\\s+.*)$`, 'gim');
      const matches = text.match(regex);
      
      if (matches && matches.length > 0) {
        const previewChapters = this.generatePreview(text, kw, minW);
        methods.push({
          keyword: kw,
          count: previewChapters.length,
          previewChapters
        });
      }
    }
    
    // Auto-select the one with most parts if no selection made yet
    // Do it in an effect or just compute the highest one
    return methods.sort((a,b) => b.count - a.count);
  });

  selectedMethodData = computed(() => {
    const sel = this.selectedMethod();
    const methods = this.splitMethods();
    if (!sel && methods.length > 0) {
      return methods[0];
    }
    return methods.find(m => m.keyword === sel) || null;
  });

  constructor() {
    // We can't set signals inside computed directly, so we rely on selectedMethodData returning the first if null
  }

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
      
      // Generate safe filename from store.fileName
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

  generatePreview(text: string, kw: string, minWords: number): {title: string, previewText: string, wordCount: number, originalText: string}[] {
    let textToSplit = text;
    let gutenbergHeader: {title: string, previewText: string, wordCount: number, originalText: string} | null = null;
    let gutenbergFooter: {title: string, previewText: string, wordCount: number, originalText: string} | null = null;

    const startMatch = textToSplit.match(/START OF THE PROJECT GUTENBERG/i);
    if (startMatch && startMatch.index !== undefined) {
      let endOfLineIdx = textToSplit.indexOf('\n', startMatch.index);
      if (endOfLineIdx === -1) endOfLineIdx = textToSplit.length;
      
      const headerText = textToSplit.substring(0, endOfLineIdx).trim();
      if (headerText) {
        gutenbergHeader = {
          title: 'Thông tin Project Gutenberg',
          previewText: headerText.substring(0, 100).trim() + '...',
          wordCount: headerText.split(/\s+/).filter(w => w.length > 0).length,
          originalText: headerText
        };
      }
      textToSplit = textToSplit.substring(endOfLineIdx).trim();
    }

    const endMatch = textToSplit.match(/END OF THE PROJECT GUTENBERG/i);
    if (endMatch && endMatch.index !== undefined) {
      let startOfLineIdx = textToSplit.lastIndexOf('\n', endMatch.index);
      if (startOfLineIdx === -1 || startOfLineIdx > endMatch.index) startOfLineIdx = endMatch.index;
      
      const footerText = textToSplit.substring(startOfLineIdx).trim();
      if (footerText) {
        gutenbergFooter = {
          title: 'Giấy phép Project Gutenberg',
          previewText: footerText.substring(0, 100).trim() + '...',
          wordCount: footerText.split(/\s+/).filter(w => w.length > 0).length,
          originalText: footerText
        };
      }
      textToSplit = textToSplit.substring(0, startOfLineIdx).trim();
    }

    if (kw === 'Toàn bộ file') {
      const mainChapter = {
        title: 'Nội dung sách',
        previewText: textToSplit.substring(0, 150) + '...',
        wordCount: textToSplit.split(/\s+/).filter(w => w.length > 0).length,
        originalText: textToSplit
      };
      
      const result = [];
      if (gutenbergHeader) result.push(gutenbergHeader);
      result.push(mainChapter);
      if (gutenbergFooter) result.push(gutenbergFooter);
      return result;
    }

    const regex = new RegExp(`^(#*\\s*${kw}\\s+.*)$`, 'gim');
    const splits = textToSplit.split(regex);
    
    const rawChunks: {title: string, originalText: string}[] = [];
    
    // The split array will be: [textBeforeFirstMatch, match1, text1, match2, text2, ...]
    if (splits[0].trim().length > 0) {
      rawChunks.push({
        title: 'Mở đầu / Giới thiệu',
        originalText: splits[0].trim()
      });
    }

    for (let i = 1; i < splits.length; i += 2) {
      const title = splits[i].replace(/^#+\s*/, '').trim();
      const content = splits[i + 1] ? splits[i + 1].trim() : '';
      const fullContent = splits[i] + '\n' + content;
      
      rawChunks.push({
        title,
        originalText: fullContent
      });
    }

    const MIN_WORDS = minWords;
    const mergedChapters: {titles: string[], originalText: string}[] = [];
    let currentAcc: {titles: string[], originalText: string} | null = null;

    for (const chunk of rawChunks) {
      if (!currentAcc) {
        currentAcc = { titles: [chunk.title], originalText: chunk.originalText };
      } else {
        const currentWords = currentAcc.originalText.split(/\s+/).filter(w => w.length > 0).length;
        if (currentWords < MIN_WORDS) {
          currentAcc.titles.push(chunk.title);
          currentAcc.originalText += '\n\n' + chunk.originalText;
        } else {
          mergedChapters.push(currentAcc);
          currentAcc = { titles: [chunk.title], originalText: chunk.originalText };
        }
      }
    }
    
    if (currentAcc) {
      mergedChapters.push(currentAcc);
    }

    const processedMain = mergedChapters.map(c => {
      const wordCount = c.originalText.split(/\s+/).filter(w => w.length > 0).length;
      
      let finalTitle = c.titles[0];
      if (c.titles.length === 2) {
        finalTitle = `${c.titles[0]} & ${c.titles[1]}`;
      } else if (c.titles.length > 2) {
        finalTitle = `${c.titles[0]} ... ${c.titles[c.titles.length - 1]}`;
      }

      // Skip headings for preview text to give a better glimpse of content
      const lines = c.originalText.split('\n');
      const nonHeadingLines = lines.filter(l => !l.trim().startsWith('#') && l.trim().length > 0);
      const previewContent = nonHeadingLines.length > 0 ? nonHeadingLines.join(' ') : c.originalText;
      const previewText = previewContent.substring(0, 100).trim() + '...';

      return {
        title: finalTitle,
        previewText,
        wordCount,
        originalText: c.originalText
      };
    });

    const finalResult = [];
    if (gutenbergHeader) finalResult.push(gutenbergHeader);
    finalResult.push(...processedMain);
    if (gutenbergFooter) finalResult.push(gutenbergFooter);

    return finalResult;
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
      status: 'pending'
    }));

    this.store.setChapters(chapters);
  }
}
