import { Component, computed, inject, signal } from '@angular/core';
import { BookStore, Chapter } from './book.store';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-splitter',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="max-w-4xl mx-auto py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Chia theo chương dịch</h2>
          <p class="text-gray-500 mt-1">Đang phân tích "{{ store.fileName() }}" để tìm ra cách chia phần tốt nhất.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        @for (method of splitMethods(); track method.keyword) {
          <div 
            class="p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col"
            [class.border-blue-500]="selectedMethod() === method.keyword"
            [class.bg-blue-50]="selectedMethod() === method.keyword"
            [class.border-gray-200]="selectedMethod() !== method.keyword"
            [class.hover:border-gray-300]="selectedMethod() !== method.keyword"
            (click)="selectMethod(method.keyword)"
          >
            <div class="flex justify-between items-start mb-3">
              <h3 class="font-semibold text-gray-900">Theo "{{ method.keyword }}"</h3>
              @if (selectedMethod() === method.keyword) {
                <mat-icon class="text-blue-500">check_circle</mat-icon>
              }
            </div>
            
            <div class="mt-auto flex items-end justify-between">
              <div>
                <div class="text-3xl font-light text-gray-900">{{ method.count }}</div>
                <div class="text-xs text-gray-500 uppercase tracking-wider font-semibold mt-1">Phần được chia</div>
              </div>
            </div>
          </div>
        }
      </div>

      @if (selectedMethodData()) {
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div class="border-b border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
            <h3 class="font-semibold text-gray-900">Xem trước: Phân chia theo "{{ selectedMethodData()?.keyword }}"</h3>
            <div class="text-sm text-gray-500">{{ selectedMethodData()?.count }} chương</div>
          </div>
          <div class="max-h-96 overflow-y-auto p-0">
            @for (chap of selectedMethodData()?.previewChapters; track $index) {
              <div class="px-6 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                <div class="flex justify-between items-center mb-1">
                  <h4 class="font-medium text-gray-900 truncate pr-4">{{ chap.title }}</h4>
                  <span class="text-xs font-mono text-gray-500 whitespace-nowrap">{{ chap.wordCount }} từ</span>
                </div>
                <p class="text-sm text-gray-500 line-clamp-2">{{ chap.previewText }}</p>
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
            <span>Tiến hành dịch</span>
            <mat-icon class="!w-5 !h-5 !text-xl !flex !items-center !justify-center">arrow_forward</mat-icon>
          </button>
        </div>
      }
    </div>
  `
})
export class Splitter {
  store = inject(BookStore);

  keywords = ['Chapter', 'Part', 'Section', 'Chương', 'Phần', 'Bài'];
  
  selectedMethod = signal<string | null>(null);

  splitMethods = computed(() => {
    const text = this.store.rawMarkdown() || '';
    
    // First, add default "No split / Entire Book" method just in case
    const methods = [{
      keyword: 'Toàn bộ file',
      count: 1,
      previewChapters: this.generatePreview(text, 'Toàn bộ file')
    }];

    for (const kw of this.keywords) {
      // Regex to find headings (optional #s) that start with keyword (case insensitive)
      // Example: ## Chapter 1 or Chapter 1
      const regex = new RegExp(`^(#*\\s*${kw}\\s+.*)$`, 'gim');
      const matches = text.match(regex);
      
      if (matches && matches.length > 0) {
        const previewChapters = this.generatePreview(text, kw);
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

  generatePreview(text: string, kw: string): {title: string, previewText: string, wordCount: number, originalText: string}[] {
    if (kw === 'Toàn bộ file') {
      return [{
        title: 'Nội dung toàn bộ tài liệu',
        previewText: text.substring(0, 150) + '...',
        wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
        originalText: text
      }];
    }

    const regex = new RegExp(`^(#*\\s*${kw}\\s+.*)$`, 'gim');
    const splits = text.split(regex);
    
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

    const MIN_WORDS = 1000;
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

    return mergedChapters.map(c => {
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
  }

  applySplit() {
    const data = this.selectedMethodData();
    if (!data) return;

    const chapters: Chapter[] = data.previewChapters.map((c, idx) => ({
      id: `chapter-${idx}-${Date.now()}`,
      title: c.title,
      originalText: c.originalText,
      wordCount: c.wordCount,
      status: 'pending'
    }));

    this.store.setChapters(chapters);
  }
}
