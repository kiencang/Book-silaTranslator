import { Component, input, model, output, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BookStore, Chapter } from '../../../core/book.store';
import { marked } from 'marked';

@Component({
  selector: 'app-chapter-item',
  standalone: true,
  imports: [MatIconModule, DatePipe],
  template: `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 cursor-pointer" 
            (click)="toggleExpand()" 
            tabindex="0" 
            (keydown.enter)="toggleExpand()">
        <div class="flex items-center space-x-3 w-full">
          <mat-icon class="text-gray-400 transition-transform" [class.rotate-90]="isExpanded()">chevron_right</mat-icon>
          <div class="flex-1">
            <h4 class="font-semibold text-gray-900">{{ chapter().title || 'Phần ' + (index() + 1) }}</h4>
            <div class="flex items-center space-x-3 mt-1">
              <span class="text-xs text-gray-500 font-mono">{{ chapter().wordCount }} từ</span>
              <span class="w-1 h-1 rounded-full bg-gray-300"></span>
              @switch (chapter().status) {
                @case ('pending') { <span class="text-xs font-medium text-gray-500 bg-gray-200 px-2 rounded-full py-0.5">Chờ dịch</span> }
                @case ('translating') { <span class="text-xs font-medium text-blue-700 bg-blue-100 px-2 rounded-full py-0.5 animate-pulse">Đang dịch...</span> }
                @case ('done') { <span class="text-xs font-medium text-green-700 bg-green-100 px-2 rounded-full py-0.5">Đã dịch</span> }
                @case ('error') { <span class="text-xs font-medium text-red-700 bg-red-100 px-2 rounded-full py-0.5">Lỗi</span> }
              }
            </div>
          </div>
        </div>
        <div class="flex items-center space-x-2 shrink-0 ml-4">
          @if (chapter().status !== 'translating') {
            <button 
              (click)="translateSingle.emit(); $event.stopPropagation()"
              [disabled]="store.isTranslatingAny()"
              [class.opacity-50]="store.isTranslatingAny()"
              [class.cursor-not-allowed]="store.isTranslatingAny()"
              class="px-3 py-1.5 bg-white text-blue-600 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm disabled:hover:bg-white disabled:hover:border-blue-200"
              [title]="chapter().status === 'done' || chapter().status === 'error' ? 'Dịch lại riêng phần này' : 'Dịch riêng phần này'"
            >
              <mat-icon class="!w-4 !h-4 !text-base flex items-center justify-center">looks_one</mat-icon>
              <span class="text-sm font-medium">{{ chapter().status === 'done' || chapter().status === 'error' ? 'Dịch lại riêng phần này' : 'Dịch riêng phần này' }}</span>
            </button>
          }
        </div>
      </div>

      @if (isExpanded()) {
        <div class="flex flex-col">
          @if (chapter().versions && chapter().versions!.length > 0) {
            <div class="px-6 py-3 bg-white border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-medium text-gray-500 mr-2">Phiên bản:</span>
                  @for (v of chapter().versions; track v.versionNumber) {
                    <button 
                      (click)="store.selectVersion(chapter().id, v.versionNumber)"
                      [class.bg-blue-100]="chapter().activeVersionNumber === v.versionNumber"
                      [class.text-blue-700]="chapter().activeVersionNumber === v.versionNumber"
                      [class.font-semibold]="chapter().activeVersionNumber === v.versionNumber"
                      [class.bg-gray-100]="chapter().activeVersionNumber !== v.versionNumber"
                      [class.text-gray-600]="chapter().activeVersionNumber !== v.versionNumber"
                      class="px-2 py-1.5 min-w-[36px] rounded-md text-xs font-medium transition-colors hover:bg-gray-200"
                    >
                      v{{ v.versionNumber }}
                    </button>
                  }
                </div>
                @if (getActiveVersion(chapter()); as activeV) {
                  <div class="text-[11px] text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-2 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100">
                    <span class="flex items-center gap-1.5">
                      <mat-icon class="!w-3.5 !h-3.5 !text-[14px] text-indigo-500">smart_toy</mat-icon> {{ activeV.model }}
                    </span>
                    <span class="flex items-center gap-1.5">
                      <mat-icon class="!w-3.5 !h-3.5 !text-[14px] text-orange-500">thermostat</mat-icon> Temp: {{ activeV.temperature }}
                    </span>
                    <span class="flex items-center gap-1.5">
                      <mat-icon class="!w-3.5 !h-3.5 !text-[14px] text-green-500">schedule</mat-icon> {{ activeV.timestamp | date:'dd/MM/yyyy HH:mm' }}
                    </span>
                  </div>
                }
            </div>
          }

          <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div class="p-6">
              <h5 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Bản gốc (Markdown)</h5>
              <div class="prose prose-sm max-w-none text-gray-700" [innerHTML]="parseMarkdown(chapter().originalText)"></div>
            </div>
            <div class="p-6 bg-gray-50">
              <h5 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Bản dịch</h5>
              @if (chapter().translatedText) {
                <div class="prose prose-sm max-w-none text-gray-900" [innerHTML]="parseMarkdown(chapter().translatedText)"></div>
              } @else if (chapter().status === 'translating') {
                <div class="flex flex-col items-center justify-center py-12 text-blue-600">
                  <mat-icon class="animate-spin mb-2">sync</mat-icon>
                  <span class="text-sm">Gemini đang tiến hành dịch</span>
                </div>
              } @else {
                <div class="flex items-center justify-center py-12 text-gray-400">
                  <span class="text-sm">Chưa được dịch.</span>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class ChapterItemComponent {
  store = inject(BookStore);
  chapter = input.required<Chapter>();
  index = input.required<number>();
  
  isExpanded = model(false);

  translateSingle = output<void>();

  toggleExpand() {
    this.isExpanded.set(!this.isExpanded());
  }

  parseMarkdown(text: string | undefined) {
    if (!text) return '';
    return marked.parse(text) as string;
  }

  getActiveVersion(chapter: Chapter) {
    if (!chapter.versions || !chapter.activeVersionNumber) return null;
    return chapter.versions.find(v => v.versionNumber === chapter.activeVersionNumber) || null;
  }
}
