import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BookStore } from '../../../core/book.store';

@Component({
  selector: 'app-token-estimation',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="bg-indigo-50/50 rounded-xl border border-indigo-100 p-4 mb-8">
      <button 
        (click)="isExpanded.set(!isExpanded())" 
        class="w-full flex items-center justify-between outline-none group text-left"
      >
          <h3 class="text-sm font-semibold text-indigo-900 uppercase tracking-wider flex items-center gap-2 group-hover:text-indigo-700 transition-colors">
            <mat-icon class="!w-5 !h-5 !text-[20px] flex items-center justify-center">analytics</mat-icon>
            <span class="mt-0.5">Ước tính từ vựng & Token</span>
          </h3>
          <mat-icon class="text-indigo-500 transition-transform duration-300" [class.rotate-180]="isExpanded()">expand_more</mat-icon>
      </button>
      
      @if (isExpanded()) {
        <div class="mt-4 pt-4 border-t border-indigo-100/50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div class="grid grid-cols-3 gap-4 text-sm mb-3">
              <div class="font-medium text-gray-400 pb-2 border-b border-indigo-100"></div>
              <div class="font-semibold text-gray-800 pb-2 border-b border-indigo-100 flex items-center gap-2">Tiếng Anh</div>
              <div class="font-semibold text-gray-800 pb-2 border-b border-indigo-100 flex items-center gap-2">Tiếng Việt</div>
              
              <div class="font-medium text-gray-600 py-1">Số từ ước tính</div>
              <div class="font-bold text-gray-900 py-1">{{ formatNumber(store.estimatedEnglishWords()) }}</div>
              <div class="font-bold text-gray-900 py-1">{{ formatNumber(store.estimatedVietnameseWords()) }}</div>
              
              <div class="font-medium text-gray-600 py-1">Token ước tính</div>
              <div class="font-bold text-indigo-700 py-1">{{ formatNumber(store.estimatedEnglishTokens()) }}</div>
              <div class="font-bold text-indigo-700 py-1">{{ formatNumber(store.estimatedVietnameseTokens()) }}</div>
          </div>
          <div class="text-[11px] text-indigo-500 italic mt-2">* Đây là dự đoán, con số thực tế có thể cao hoặc thấp hơn.</div>
        </div>
      }
    </div>
  `
})
export class TokenEstimationComponent {
  store = inject(BookStore);
  isExpanded = signal(false);

  formatNumber(val: number): string {
    if (val === 0) return '0';
    if (val < 1000) return Math.round(val).toString();
    return (val / 1000).toFixed(1) + 'K';
  }
}
