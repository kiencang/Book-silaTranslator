import { Component, input, output, model } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-split-limits',
  standalone: true,
  imports: [MatIconModule],
  template: `
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
                (keydown.enter)="onApply.emit()"
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
                (keydown.enter)="onApply.emit()"
                min="10000" max="25000" step="1000" 
                class="w-28 flex-shrink-0 px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-center transition-shadow">
        </div>
      </div>

      <!-- Nút áp dụng -->
      <div class="mt-6 flex justify-center">
        <button 
          (click)="onApply.emit()"
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
  `
})
export class SplitLimitsComponent {
  draftMinWords = model.required<number>();
  draftMaxWords = model.required<number>();
  
  activeMinWords = input.required<number>();
  activeMaxWords = input.required<number>();

  onApply = output<void>();
}
