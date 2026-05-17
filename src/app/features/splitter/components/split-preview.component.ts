import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PreviewChapter } from '../splitter.util';

@Component({
  selector: 'app-split-preview',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 transition-opacity duration-300"
         [class.opacity-50]="disabled()"
         [class.pointer-events-none]="disabled()">
      @for (method of splitMethods(); track method.keyword) {
        <div 
          role="button"
          tabindex="0"
          class="p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col"
          [class.border-indigo-500]="selectedMethodData()?.keyword === method.keyword"
          [class.bg-indigo-50]="selectedMethodData()?.keyword === method.keyword"
          [class.border-zinc-200]="selectedMethodData()?.keyword !== method.keyword"
          [class.hover:border-zinc-300]="selectedMethodData()?.keyword !== method.keyword"
          (keydown.enter)="selectMethod.emit(method.keyword)"
          (click)="selectMethod.emit(method.keyword)"
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
            <div role="button" tabindex="0" (keydown.enter)="previewBlock.emit(chap)" class="px-6 py-4 border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors flex items-center justify-between group cursor-pointer" (click)="previewBlock.emit(chap)">
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
          (click)="applySplit.emit()"
          [disabled]="selectedMethodData()?.count === 0 || isAnalyzing()"
          class="flex items-center space-x-2 bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Tiếp tục</span>
          <mat-icon class="!w-5 !h-5 !text-xl !flex !items-center !justify-center">arrow_forward</mat-icon>
        </button>
      </div>
    }
  `
})
export class SplitPreviewComponent {
  splitMethods = input.required<{keyword: string, count: number, previewChapters: PreviewChapter[]}[]>();
  selectedMethodData = input.required<{keyword: string, count: number, previewChapters: PreviewChapter[]} | null>();
  disabled = input.required<boolean>();
  isAnalyzing = input.required<boolean>();

  selectMethod = output<string>();
  previewBlock = output<PreviewChapter>();
  applySplit = output<void>();
}
