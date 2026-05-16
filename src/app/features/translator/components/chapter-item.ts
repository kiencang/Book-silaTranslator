import { Component, input, model, output, inject, signal, OnInit, OnDestroy, HostListener } from '@angular/core';

@Component({
  selector: 'app-translating-skeleton',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="flex flex-col items-center justify-start pt-12 min-h-[400px] h-full w-full relative overflow-hidden">
        <div class="absolute inset-0 p-6 pointer-events-none opacity-[0.15]">
            <div class="space-y-4 w-full mx-auto">
                <div class="h-3 bg-zinc-400 rounded w-3/4 animate-pulse"></div>
                <div class="h-3 bg-zinc-400 rounded animate-pulse" style="animation-delay: 200ms"></div>
                <div class="h-3 bg-zinc-400 rounded animate-pulse" style="animation-delay: 400ms"></div>
                <div class="h-3 bg-zinc-400 rounded w-5/6 animate-pulse" style="animation-delay: 600ms"></div>
                <div class="h-3 bg-zinc-400 rounded w-full animate-pulse" style="animation-delay: 800ms"></div>
                <div class="h-3 bg-zinc-400 rounded w-2/3 animate-pulse" style="animation-delay: 1000ms"></div>
            </div>
            <div class="space-y-4 w-full mx-auto mt-8">
                <div class="h-3 bg-zinc-400 rounded animate-pulse" style="animation-delay: 300ms"></div>
                <div class="h-3 bg-zinc-400 rounded w-4/5 animate-pulse" style="animation-delay: 500ms"></div>
                <div class="h-3 bg-zinc-400 rounded w-full animate-pulse" style="animation-delay: 700ms"></div>
                <div class="h-3 bg-zinc-400 rounded w-3/4 animate-pulse" style="animation-delay: 900ms"></div>
            </div>
            <div class="space-y-4 w-full mx-auto mt-8">
                <div class="h-3 bg-zinc-400 rounded w-1/2 animate-pulse" style="animation-delay: 400ms"></div>
            </div>
        </div>
        
        <div class="relative z-10 flex flex-col items-center bg-white/90 p-8 rounded-2xl shadow-sm backdrop-blur-sm border border-indigo-100 min-w-[240px]">
            <mat-icon class="animate-spin mb-4 text-indigo-600 !w-8 !h-8 !text-[32px] flex items-center justify-center">sync</mat-icon>
            <div class="text-4xl font-mono font-medium text-zinc-800 mb-2 tracking-tight">
                {{ formatTime(elapsedSeconds()) }}
            </div>
            <div class="text-xs font-semibold text-indigo-600 tracking-wider uppercase bg-indigo-50 px-3 py-1.5 rounded-full">
                Gemini đang dịch...
            </div>
        </div>
    </div>
  `
})
export class TranslatingSkeletonComponent implements OnInit, OnDestroy {
  elapsedSeconds = signal(0);
  private intervalFn: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.intervalFn = setInterval(() => {
        this.elapsedSeconds.update(s => s + 1);
    }, 1000);
  }

  ngOnDestroy() {
    if (this.intervalFn) {
        clearInterval(this.intervalFn);
    }
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BookStore, Chapter, TranslationVersion } from '../../../core/book.store';
import { ToastService } from '../../../core/toast.service';
import { getConfiguredMarked } from '../../../core/marked-setup';
import { ReaderStore } from '../../../core/reader.store';
import { GeminiClient } from '../../../core/gemini';
import { OFFLINE_READER_SCRIPT, OFFLINE_READER_STYLES, OFFLINE_READER_TOOLBAR_HTML } from '../../../core/html-export.util';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-chapter-item',
  standalone: true,
  imports: [MatIconModule, DatePipe, TranslatingSkeletonComponent],
  host: {
    class: 'block'
  },
  template: `
    <div class="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
      <div class="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50 cursor-pointer" 
            (click)="toggleExpand()" 
            tabindex="0" 
            (keydown.enter)="toggleExpand()">
        <div class="flex items-center space-x-3 w-full">
          <mat-icon class="text-zinc-400 transition-transform" [class.rotate-90]="isExpanded()">chevron_right</mat-icon>
          <div class="flex-1">
            <h4 class="font-semibold text-zinc-900">{{ chapter().title || 'Phần ' + (index() + 1) }}</h4>
            <div class="flex items-center space-x-3 mt-1">
              <span class="text-xs text-zinc-500 font-mono">{{ chapter().wordCount }} từ</span>
              <span class="w-1 h-1 rounded-full bg-zinc-300"></span>
              @switch (chapter().status) {
                @case ('pending') { <span class="text-xs font-medium text-zinc-500 bg-zinc-200 px-2 rounded-full py-0.5">Chờ dịch</span> }
                @case ('translating') { <span class="text-xs font-medium text-indigo-700 bg-indigo-100 px-2 rounded-full py-0.5 animate-pulse">Đang dịch...</span> }
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
              [disabled]="store.isTranslatingAny() || chapter().excludeFromTranslation"
              [class.opacity-50]="store.isTranslatingAny() || chapter().excludeFromTranslation"
              [class.cursor-not-allowed]="store.isTranslatingAny() || chapter().excludeFromTranslation"
              class="px-3 py-1.5 bg-white text-indigo-500 hover:bg-indigo-50 border border-indigo-100 hover:border-indigo-200 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm disabled:hover:bg-white disabled:hover:border-indigo-100"
              [title]="chapter().excludeFromTranslation ? 'Không thể dịch khối này' : (chapter().status === 'done' || chapter().status === 'error' ? 'Dịch lại riêng phần này' : 'Dịch riêng phần này')"
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
            <div class="px-6 py-3 bg-white border-b border-zinc-100 flex flex-col items-center justify-center gap-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-medium text-zinc-500 mr-2">Phiên bản:</span>
                  @for (v of chapter().versions; track v.versionNumber) {
                    <button 
                      (click)="store.selectVersion(chapter().id, v.versionNumber)"
                      [class.bg-indigo-100]="chapter().activeVersionNumber === v.versionNumber"
                      [class.text-indigo-700]="chapter().activeVersionNumber === v.versionNumber"
                      [class.font-semibold]="chapter().activeVersionNumber === v.versionNumber"
                      [class.bg-zinc-100]="chapter().activeVersionNumber !== v.versionNumber"
                      [class.text-zinc-600]="chapter().activeVersionNumber !== v.versionNumber"
                      class="px-2 py-1.5 min-w-[36px] rounded-md text-xs font-medium transition-colors hover:bg-zinc-200"
                    >
                      v{{ v.versionNumber }}
                    </button>
                  }
                </div>
                @if (getActiveVersion(chapter()); as activeV) {
                  <div class="text-[11px] text-zinc-500 flex flex-col items-center justify-center gap-y-2 bg-zinc-50 px-3 py-2 rounded-md border border-zinc-100 w-full">
                    <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                      <span class="flex items-center gap-1.5">
                        <mat-icon class="!w-3.5 !h-3.5 !text-[14px] text-indigo-500">smart_toy</mat-icon> {{ activeV.model }}
                      </span>
                      <span class="flex items-center gap-1.5">
                        <mat-icon class="!w-3.5 !h-3.5 !text-[14px] text-orange-500">thermostat</mat-icon> Temp: {{ activeV.temperature }}
                      </span>
                      <span class="flex items-center gap-1.5">
                        <mat-icon class="!w-3.5 !h-3.5 !text-[14px] text-green-500">schedule</mat-icon> {{ activeV.timestamp | date:'dd/MM/yy HH:mm' }}
                      </span>
                    </div>
                    <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                      @if (activeV.glossaryStatus === 'filtered') {
                        <button (click)="viewCustomGlossary(activeV.customGlossary, activeV.glossaryRatio)" class="flex items-center gap-1 text-indigo-600 hover:underline">
                           <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">menu_book</mat-icon> Sử dụng danh sách thuật ngữ đã lọc
                        </button>
                      } @else if (activeV.glossaryStatus === 'full') {
                        <button (click)="viewCustomGlossary(activeV.customGlossary, activeV.glossaryRatio)" class="flex items-center gap-1 text-indigo-600 hover:underline">
                           <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">library_books</mat-icon> Sử dụng đầy đủ danh sách thuật ngữ
                        </button>
                      } @else {
                        <span class="flex items-center gap-1 text-zinc-400">
                           <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">book</mat-icon> Không sử dụng danh sách thuật ngữ
                        </span>
                      }
                      <span class="bg-zinc-200 w-[1px] h-3 mx-0"></span>
                      @if (activeV.usePronouns) {
                        <button (click)="viewPronounSnapshot(activeV.pronounSnapshot, activeV.pronounVersionNumber)" class="flex items-center gap-1 text-emerald-600 hover:underline">
                          <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">assignment_ind</mat-icon> Sử dụng bảng đại từ (v{{activeV.pronounVersionNumber || 1}})
                        </button>
                      } @else {
                        <span class="flex items-center gap-1 text-zinc-400">
                          <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">person_off</mat-icon> Không sử dụng bảng đại từ
                        </span>
                      }
                      <span class="bg-zinc-200 w-[1px] h-3 mx-0"></span>
                      @if (activeV.useContextSummary) {
                        <button (click)="viewContextSummary(activeV.contextSummarySnapshot, activeV.contextSummaryChapterTitle)" class="flex items-center gap-1 text-cyan-600 hover:underline">
                          <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">psychology</mat-icon> Sử dụng tóm tắt ngữ cảnh
                        </button>
                      } @else {
                        <span class="flex items-center gap-1 text-zinc-400">
                          <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">psychology_alt</mat-icon> Không sử dụng tóm tắt ngữ cảnh
                        </span>
                      }
                      <span class="bg-zinc-200 w-[1px] h-3 mx-0"></span>
                      @if (activeV.summary) {
                        <button (click)="viewSummary(activeV.summary)" class="flex items-center gap-1 text-amber-600 hover:underline" title="Xem bản tóm tắt">
                          <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">auto_awesome</mat-icon> Có tóm tắt
                        </button>
                      } @else {
                        <button (click)="confirmCreateSummary(activeV)" [disabled]="isGeneratingSummary()" class="flex items-center gap-1 text-zinc-400 hover:text-amber-600 transition-colors cursor-pointer disabled:cursor-not-allowed" title="Nhấp để tạo bản tóm tắt">
                          <mat-icon class="!w-3.5 !h-3.5 !text-[14px]" [class.animate-spin]="isGeneratingSummary()">{{ isGeneratingSummary() ? 'sync' : 'auto_awesome_mosaic' }}</mat-icon> {{ isGeneratingSummary() ? 'Đang tạo tóm tắt...' : 'Không có tóm tắt' }}
                        </button>
                      }
                    </div>
                  </div>
                }
            </div>
          }

          <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-100">
            <div class="p-6">
              <h5 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Bản gốc (Markdown)</h5>
              <div class="prose prose-sm max-w-none text-zinc-700" [innerHTML]="parseMarkdown(chapter().originalText)"></div>
            </div>
            <div class="p-6 bg-zinc-50 relative">
              <div class="flex items-center justify-between mb-4">
                <h5 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Bản dịch</h5>
                @if (chapter().translatedText) {
                  <div class="flex items-center gap-2">
                    <button (click)="downloadHtml()" class="tooltip-trigger flex items-center justify-center p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Tải xuống HTML">
                      <mat-icon class="!w-4 !h-4 !text-[16px]">download</mat-icon>
                    </button>
                    <button (click)="openBilingualFullscreen()" class="tooltip-trigger flex items-center justify-center p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Đọc song ngữ">
                      <mat-icon class="!w-4 !h-4 !text-[16px]">vertical_split</mat-icon>
                    </button>
                    <button (click)="openFullscreen()" class="tooltip-trigger flex items-center justify-center p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Đọc toàn màn hình">
                      <mat-icon class="!w-4 !h-4 !text-[16px]">fullscreen</mat-icon>
                    </button>
                  </div>
                }
              </div>
              @if (chapter().excludeFromTranslation) {
                <div class="flex items-center justify-center py-12 px-6 text-center text-zinc-500 bg-zinc-100 rounded-lg">
                  <span class="text-sm">Đây là nội dung bản quyền / metadata, nội dung sẽ được giữ nguyên bản gốc khi xuất file.</span>
                </div>
              } @else if (chapter().translatedText) {
                <div class="prose prose-sm max-w-none text-zinc-900" [innerHTML]="parseMarkdown(chapter().translatedText)"></div>
              } @else if (chapter().status === 'translating') {
                <app-translating-skeleton />
              } @else {
                <div class="flex items-center justify-center py-12 text-zinc-400">
                  <span class="text-sm">Chưa được dịch.</span>
                </div>
              }
            </div>
          </div>
        </div>
      }
      @if (isFullscreen()) {
        <div class="fixed inset-0 z-50 overflow-y-auto transition-colors duration-300"
             [style.background-color]="getContainerBg(readerStore.prefs().theme)">
          <div class="max-w-3xl mx-auto px-6 py-12 relative min-h-screen">
            
            <div class="fixed top-1/2 -translate-y-1/2 left-4 transition-transform duration-300 z-50 flex-col items-center hidden md:flex" 
                 [class.-translate-x-[calc(100%+1rem)]]="!readerStore.prefs().isToolbarExpanded">
              
              <!-- Toggle Button -->
              <button (click)="toggleToolbar()"
                      class="absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-12 flex items-center justify-center rounded-r-md border-y border-r shadow-sm transition-colors duration-300 cursor-pointer"
                      [class]="getToolbarClass(readerStore.prefs().theme)"
                      [title]="readerStore.prefs().isToolbarExpanded ? 'Ẩn công cụ' : 'Hiện công cụ'">
                <mat-icon class="!w-4 !h-4 !text-[16px] flex items-center justify-center">{{ readerStore.prefs().isToolbarExpanded ? 'chevron_left' : 'chevron_right' }}</mat-icon>
              </button>

              <div class="flex flex-col items-center gap-2 p-1.5 rounded-full shadow border transition-colors duration-300 w-11"
                   [class]="getToolbarClass(readerStore.prefs().theme)">
                <div class="flex flex-col gap-1 items-center">
                  <button (click)="changeFontSize(2)" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors font-medium text-[16px] leading-none text-center" title="Tăng cỡ chữ">A+</button>
                  <button (click)="changeFontSize(-2)" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors font-medium text-[12px] leading-none text-center" title="Giảm cỡ chữ">A-</button>
                </div>

                <div class="w-6 h-[1px] bg-current opacity-20"></div>

                <div class="flex flex-col gap-1 w-8">
                  <button (click)="changeFontFamily('Inter')" class="w-full h-8 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-xs font-medium tracking-tight" [class.font-bold]="readerStore.prefs().fontFamily === 'Inter'" [class.ring-1]="readerStore.prefs().fontFamily === 'Inter'" style="font-family: 'Inter';" title="Font Inter">In</button>
                  <button (click)="changeFontFamily('Lora')" class="w-full h-8 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-xs font-medium tracking-tight" [class.font-bold]="readerStore.prefs().fontFamily === 'Lora'" [class.ring-1]="readerStore.prefs().fontFamily === 'Lora'" style="font-family: 'Lora', serif;" title="Font Lora">Lo</button>
                  <button (click)="changeFontFamily('Lexend')" class="w-full h-8 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-xs font-medium tracking-tight" [class.font-bold]="readerStore.prefs().fontFamily === 'Lexend'" [class.ring-1]="readerStore.prefs().fontFamily === 'Lexend'" style="font-family: 'Lexend', sans-serif;" title="Font Lexend">Le</button>
                </div>

                <div class="w-6 h-[1px] bg-current opacity-20"></div>

                <div class="flex flex-col gap-2 pt-1 pb-1">
                  <button (click)="changeTheme('white')" class="w-5 h-5 rounded-full border shadow-inner transition-transform hover:scale-110" [class.ring-2]="readerStore.prefs().theme === 'white'" [class.ring-offset-2]="readerStore.prefs().theme === 'white'" [style.ring-offset-color]="getContainerBg(readerStore.prefs().theme)" style="background-color: #FFFFFF; border-color: #E5E7EB;" title="Nền trắng"></button>
                  <button (click)="changeTheme('sepia')" class="w-5 h-5 rounded-full border shadow-inner transition-transform hover:scale-110" [class.ring-2]="readerStore.prefs().theme === 'sepia'" [class.ring-offset-2]="readerStore.prefs().theme === 'sepia'" [style.ring-offset-color]="getContainerBg(readerStore.prefs().theme)" style="background-color: #FFFFF0; border-color: #E5E7EB;" title="Nền ngà"></button>
                  <button (click)="changeTheme('dark')" class="w-5 h-5 rounded-full border shadow-inner transition-transform hover:scale-110" [class.ring-2]="readerStore.prefs().theme === 'dark'" [class.ring-offset-2]="readerStore.prefs().theme === 'dark'" [style.ring-offset-color]="getContainerBg(readerStore.prefs().theme)" style="background-color: #121212; border-color: #374151;" title="Nền tối"></button>
                </div>

                <div class="w-6 h-[1px] bg-current opacity-20"></div>

                <button (click)="resetPrefs()" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title="Khôi phục mặc định">
                  <mat-icon class="!w-4 !h-4 !text-[16px] flex items-center justify-center">refresh</mat-icon>
                </button>
              </div>
            </div>

            <!-- Close button -->
            <button (click)="closeFullscreen()" class="fixed top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full shadow-sm transition-colors backdrop-blur-sm z-50 cursor-pointer" [class]="getCloseBtnClass(readerStore.prefs().theme)" title="Đóng chế độ toàn màn hình">
              <mat-icon>close</mat-icon>
            </button>

            <div class="prose max-w-none transition-all duration-300 leading-relaxed" 
                 [class]="getContentClass(readerStore.prefs().theme)" 
                 [style.font-size.px]="readerStore.prefs().fontSize"
                 [style.font-family]="getFontFamily(readerStore.prefs().fontFamily)"
                 [innerHTML]="parseMarkdown(chapter().translatedText)"></div>

            <div class="mt-24 pt-8 border-t border-zinc-200/50 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-2xl mx-auto pb-12">
              @if (prevTranslatedChapterIndex() !== -1) {
                <button (click)="navigateTo(prevTranslatedChapterIndex())"
                        class="flex items-center gap-2 px-6 py-3 rounded-full bg-white/50 hover:bg-white/80 dark:bg-zinc-800/50 dark:hover:bg-zinc-800/80 transition-colors shadow-sm text-sm font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 w-full sm:w-auto justify-center">
                  <mat-icon class="!w-5 !h-5 !text-[20px] leading-none">arrow_back</mat-icon>
                  Phần trước
                </button>
              } @else {
                <div class="hidden sm:block"></div>
              }
              
              @if (nextTranslatedChapterIndex() !== -1) {
                <button (click)="navigateTo(nextTranslatedChapterIndex())"
                        class="flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 transition-colors shadow-sm text-sm font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 w-full sm:w-auto justify-center">
                  Phần sau
                  <mat-icon class="!w-5 !h-5 !text-[20px] leading-none">arrow_forward</mat-icon>
                </button>
              } @else {
                <div class="hidden sm:block"></div>
              }
            </div>
          </div>
        </div>
      }
      
      @if (isBilingualFullscreen()) {
        <div class="fixed inset-0 z-50 overflow-hidden flex flex-col transition-colors duration-300 bilingual-fullscreen-container"
             [style.background-color]="getContainerBg(readerStore.prefs().theme)">
             
          <!-- Header -->
          <div class="h-16 flex items-center justify-between px-6 shadow-sm z-10 flex-shrink-0" [class]="getToolbarClass(readerStore.prefs().theme)">
            <div class="flex items-center gap-6">
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-full p-1">
                  <button (click)="changeFontSize(-2)" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 dark:hover:bg-black/20 transition-colors font-medium text-[12px] opacity-80 hover:opacity-100">A-</button>
                  <button (click)="changeFontSize(2)" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 dark:hover:bg-black/20 transition-colors font-medium text-[16px] opacity-80 hover:opacity-100">A+</button>
                </div>
                <div class="w-[1px] h-6 bg-current opacity-20"></div>
                <div class="flex gap-2">
                   <button (click)="changeTheme('white')" class="w-6 h-6 rounded-full border shadow-inner transition-transform hover:scale-110" [class.ring-2]="readerStore.prefs().theme === 'white'" style="background-color: #FFFFFF; border-color: #E5E7EB;" title="Nền trắng"></button>
                   <button (click)="changeTheme('sepia')" class="w-6 h-6 rounded-full border shadow-inner transition-transform hover:scale-110" [class.ring-2]="readerStore.prefs().theme === 'sepia'" style="background-color: #FFFFF0; border-color: #E5E7EB;" title="Nền ngà"></button>
                   <button (click)="changeTheme('dark')" class="w-6 h-6 rounded-full border shadow-inner transition-transform hover:scale-110" [class.ring-2]="readerStore.prefs().theme === 'dark'" style="background-color: #121212; border-color: #374151;" title="Nền tối"></button>
                </div>
              </div>
              
              <div class="w-[1px] h-6 bg-current opacity-20"></div>
              
              <div>
                <span class="font-semibold text-[15px] opacity-90">{{ chapter().title || 'Phần ' + (index() + 1) }}</span>
                <span class="text-[11px] opacity-70 ml-2 font-medium tracking-wider uppercase border border-current rounded px-1.5 py-0.5">Song ngữ</span>
              </div>
            </div>
            
            <div class="flex items-center gap-4">
              <button (click)="closeBilingualFullscreen()" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title="Đóng chế độ song ngữ">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>

          <!-- Content columns -->
          <div class="flex-1 overflow-hidden grid grid-cols-2 divide-x divide-zinc-200/50 dark:divide-zinc-800/50">
            <!-- Original Column -->
            <div class="overflow-y-auto px-8 lg:px-16 py-12 scroll-smooth" (click)="onBilingualContentClick($event, 'original')">
              <div class="max-w-2xl mx-auto">
                <h4 class="text-xs font-semibold uppercase tracking-wider mb-8 opacity-40 text-center flex items-center justify-center gap-2">
                  <mat-icon class="!w-4 !h-4 !text-[16px]">g_translate</mat-icon> Bản gốc
                  @if (isBilingualAligned()) {
                    <mat-icon class="!w-4 !h-4 !text-[16px] text-green-500 ml-2" title="Đồng bộ tự động" aria-label="Aligned">swap_horiz</mat-icon>
                  }
                </h4>
                <div class="prose max-w-none transition-all duration-300 leading-relaxed prose-original cursor-pointer group"
                     [class]="getContentClass(readerStore.prefs().theme)"
                     [style.font-size.px]="readerStore.prefs().fontSize"
                     [style.font-family]="getFontFamily(readerStore.prefs().fontFamily)"
                     [innerHTML]="parseMarkdown(chapter().originalText)"></div>
              </div>
            </div>

            <!-- Translated Column -->
            <div class="overflow-y-auto px-8 lg:px-16 py-12 scroll-smooth bg-black/[0.02] dark:bg-white/[0.02]" (click)="onBilingualContentClick($event, 'translated')">
              <div class="max-w-2xl mx-auto">
                <h4 class="text-xs font-semibold uppercase tracking-wider mb-8 opacity-40 text-center flex items-center justify-center gap-2">
                   <mat-icon class="!w-4 !h-4 !text-[16px]">translate</mat-icon> Bản dịch
                   @if (isBilingualAligned()) {
                    <mat-icon class="!w-4 !h-4 !text-[16px] text-green-500 ml-2" title="Đồng bộ tự động" aria-label="Aligned">swap_horiz</mat-icon>
                  }
                </h4>
                <div class="prose max-w-none transition-all duration-300 leading-relaxed prose-translated cursor-pointer group"
                     [class]="getContentClass(readerStore.prefs().theme)"
                     [style.font-size.px]="readerStore.prefs().fontSize"
                     [style.font-family]="getFontFamily(readerStore.prefs().fontFamily)"
                     [innerHTML]="parseMarkdown(chapter().translatedText)"></div>
              </div>
            </div>
          </div>
        </div>
      }
      
      @if (showGlossaryModal() || isClosingGlossaryModal()) {
        <div class="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 cursor-pointer animate-in fade-in duration-200" tabindex="0" (click)="triggerCloseGlossaryModal()" (keydown.escape)="triggerCloseGlossaryModal()" [class.animate-fade-out]="isClosingGlossaryModal()">
          <div role="presentation" tabindex="-1" (keyup.enter)="$event.stopPropagation()" class="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden cursor-default animate-in zoom-in duration-200" (click)="$event.stopPropagation()" [class.animate-zoom-out]="isClosingGlossaryModal()">
            <div class="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/80">
              <div class="flex flex-col">
                <h2 class="text-xl font-bold text-zinc-900 flex items-center gap-2">
                  <mat-icon class="text-indigo-500">menu_book</mat-icon>
                  Thuật ngữ đã dùng cho khối này
                </h2>
                <p class="text-[13px] text-zinc-500 mt-1 ml-8">Mỗi khối dịch sẽ trích những thuật ngữ phù hợp từ danh sách tổng thể thuật ngữ của cả cuốn sách, điều này giúp tránh dư thừa các thuật ngữ không dùng đến.</p>
                @if (currentGlossaryRatio() !== undefined) {
                  <p class="text-[13px] font-medium text-indigo-600 mt-1 ml-8">Khối này dùng {{ currentGlossaryRatio() }}% số thuật ngữ của toàn cuốn sách.</p>
                }
              </div>
              <button (click)="triggerCloseGlossaryModal()" class="text-zinc-400 hover:text-zinc-700 w-8 h-8 rounded-full hover:bg-zinc-200 transition-colors flex items-center justify-center self-start flex-shrink-0 ml-4">
                <span class="material-icons !text-[20px] !w-5 !h-5 !flex !items-center !justify-center leading-none">close</span>
              </button>
            </div>
            
            <div class="p-6 overflow-y-auto flex-1 bg-white">
               <div class="prose prose-sm max-w-none text-zinc-700 w-full [&>table]:w-full [&>table]:min-w-full [&_th]:bg-zinc-50 [&_th]:font-semibold [&_th]:text-left [&_th]:p-3 [&_th]:border-y [&_th]:border-zinc-200 [&_td]:p-3 [&_td]:border-b [&_td]:border-zinc-100" [innerHTML]="parsedCustomGlossary()"></div>
            </div>
          </div>
        </div>
      }

      @if (showSummaryModal() || isClosingSummaryModal()) {
        <div class="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 cursor-pointer animate-in fade-in duration-200" tabindex="0" (click)="triggerCloseSummaryModal()" (keydown.escape)="triggerCloseSummaryModal()" [class.animate-fade-out]="isClosingSummaryModal()">
          <div role="presentation" tabindex="-1" (keyup.enter)="$event.stopPropagation()" class="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden cursor-default animate-in zoom-in duration-200" (click)="$event.stopPropagation()" [class.animate-zoom-out]="isClosingSummaryModal()">
            <div class="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/80">
              <div class="flex flex-col">
                <h2 class="text-xl font-bold text-zinc-900 flex items-center gap-2">
                  <mat-icon class="text-amber-500">auto_awesome</mat-icon>
                  Bản tóm tắt khối dịch
                </h2>
                <p class="text-[13px] text-zinc-500 mt-1 ml-8">Bản tóm tắt ngắn gọn của bản dịch được dùng làm bối cảnh để đưa vào khối dịch tiếp theo, giúp cải thiện chất lượng dịch.</p>
              </div>
              <button (click)="triggerCloseSummaryModal()" class="text-zinc-400 hover:text-zinc-700 w-8 h-8 rounded-full hover:bg-zinc-200 transition-colors flex items-center justify-center flex-shrink-0 ml-4 self-start">
                <span class="material-icons !text-[20px] !w-5 !h-5 !flex !items-center !justify-center leading-none">close</span>
              </button>
            </div>
            <div class="p-6 overflow-y-auto flex-1 bg-white">
               <div class="prose prose-sm max-w-none text-zinc-700" [innerHTML]="parseMarkdown(activeSummary())"></div>
            </div>
          </div>
        </div>
      }

      @if (showContextSummaryModal() || isClosingContextSummaryModal()) {
        <div class="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 cursor-pointer animate-in fade-in duration-200" tabindex="0" (click)="triggerCloseContextSummaryModal()" (keydown.escape)="triggerCloseContextSummaryModal()" [class.animate-fade-out]="isClosingContextSummaryModal()">
          <div role="presentation" tabindex="-1" (keyup.enter)="$event.stopPropagation()" class="bg-zinc-50 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden cursor-default animate-in zoom-in duration-200" (click)="$event.stopPropagation()" [class.animate-zoom-out]="isClosingContextSummaryModal()">
            <div class="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-white">
              <div>
                <h2 class="text-xl font-bold text-zinc-900 flex items-center gap-2">
                  <mat-icon class="text-cyan-500">psychology</mat-icon>
                  Tóm tắt ngữ cảnh đã dùng
                </h2>
                <p class="text-[13px] text-zinc-500 mt-1 ml-8">Được trích xuất từ: <span class="font-medium text-cyan-600">{{ activeContextSummaryTitle() }}</span></p>
              </div>
              <button (click)="triggerCloseContextSummaryModal()" class="text-zinc-400 hover:text-zinc-700 w-8 h-8 rounded-full hover:bg-zinc-200 transition-colors flex items-center justify-center flex-shrink-0 ml-4">
                <span class="material-icons !text-[20px] !w-5 !h-5 !flex !items-center !justify-center leading-none">close</span>
              </button>
            </div>
            <div class="p-6 overflow-y-auto flex-1 bg-white">
               <div class="prose prose-sm max-w-none text-zinc-700" [innerHTML]="parseMarkdown(activeContextSummary())"></div>
            </div>
          </div>
        </div>
      }

      @if (showPronounModal() || isClosingPronounModal()) {
        <div class="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 cursor-pointer animate-in fade-in duration-200" tabindex="0" (click)="triggerClosePronounModal()" (keydown.escape)="triggerClosePronounModal()" [class.animate-fade-out]="isClosingPronounModal()">
          <div role="presentation" tabindex="-1" (keyup.enter)="$event.stopPropagation()" class="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[80vh] flex flex-col overflow-hidden cursor-default animate-in zoom-in duration-200" (click)="$event.stopPropagation()" [class.animate-zoom-out]="isClosingPronounModal()">
            <div class="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/80">
              <div class="flex flex-col">
                 <h2 class="text-xl font-bold text-zinc-900 flex items-center gap-2">
                   <mat-icon class="text-emerald-500">assignment_ind</mat-icon>
                   Bảng đại từ nhân xưng đã dùng
                 </h2>
                 <span class="text-xs text-emerald-600 mt-1 font-medium ml-8">Phiên bản: v{{currentPronounVersion()}}</span>
                 <p class="text-[13px] text-zinc-500 mt-1 ml-8">Toàn bộ bảng đại từ này được đưa vào khi dịch khối này. Điều đó giúp công cụ dịch có đầy đủ bối cảnh hơn.</p>
              </div>
              <button (click)="triggerClosePronounModal()" class="text-zinc-400 hover:text-zinc-700 w-8 h-8 rounded-full hover:bg-zinc-200 transition-colors flex items-center justify-center self-start flex-shrink-0 ml-4">
                <span class="material-icons !text-[20px] !w-5 !h-5 !flex !items-center !justify-center leading-none">close</span>
              </button>
            </div>
            <div class="p-6 overflow-y-auto flex-1 bg-white">
               @if (parsedPronounSnapshot()) {
                 <div class="prose prose-sm max-w-none text-zinc-700 w-full [&>table]:w-full [&>table]:min-w-full [&_th]:bg-zinc-50 [&_th]:font-semibold [&_th]:text-left [&_th]:p-3 [&_th]:border-y [&_th]:border-zinc-200 [&_td]:p-3 [&_td]:border-b [&_td]:border-zinc-100" [innerHTML]="parsedPronounSnapshot()"></div>
               } @else {
                 <div class="text-zinc-500 italic text-sm text-center py-8 bg-zinc-50 rounded-lg">Không có dữ liệu chi tiết cho bảng đại từ này.</div>
               }
            </div>
          </div>
        </div>
      }

      @if (showConfirmCreateSummary()) {
        <div class="fixed inset-0 bg-zinc-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300 border border-zinc-100">
             <div class="p-8 text-center">
                <div class="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                   <mat-icon class="!w-8 !h-8 !text-[32px]">auto_awesome</mat-icon>
                </div>
                <h3 class="text-xl font-bold text-zinc-900 mb-3">Tạo bản tóm tắt</h3>
                <p class="text-zinc-600 leading-relaxed mb-8">Khối dịch này hiện chưa có bản tóm tắt bối cảnh. Bạn có muốn tạo bản tóm tắt ngay bây giờ không?</p>
                
                <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
                   <button (click)="cancelConfirmSummary()" class="w-full sm:w-1/2 px-6 py-3 rounded-xl border border-zinc-200 text-zinc-600 font-semibold hover:bg-zinc-50 transition-colors">
                     Hủy bỏ
                   </button>
                   <button (click)="generateMissingSummary()" class="w-full sm:w-1/2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-lg shadow-amber-500/30 transition-all active:scale-95">
                     Tạo ngay
                   </button>
                </div>
             </div>
          </div>
        </div>
      }
    </div>
  `
})
export class ChapterItemComponent {
  store = inject(BookStore);
  toast = inject(ToastService);
  readerStore = inject(ReaderStore);
  gemini = inject(GeminiClient);
  private sanitizer = inject(DomSanitizer);
  chapter = input.required<Chapter>();
  index = input.required<number>();
  
  isExpanded = model(false);
  isFullscreen = signal(false);
  isBilingualFullscreen = signal(false);
  isBilingualAligned = signal(false);
  
  showGlossaryModal = signal(false);
  isClosingGlossaryModal = signal(false);
  parsedCustomGlossary = signal<SafeHtml | string>('');
  currentGlossaryRatio = signal<number | undefined>(undefined);

  showSummaryModal = signal(false);
  isClosingSummaryModal = signal(false);
  activeSummary = signal('');

  showContextSummaryModal = signal(false);
  isClosingContextSummaryModal = signal(false);
  activeContextSummary = signal('');
  activeContextSummaryTitle = signal('');

  showPronounModal = signal(false);
  isClosingPronounModal = signal(false);
  parsedPronounSnapshot = signal<SafeHtml | string>('');
  currentPronounVersion = signal<number | undefined>(undefined);

  isGeneratingSummary = signal(false);
  showConfirmCreateSummary = signal(false);
  selectedVersionForSummary = signal<TranslationVersion | null>(null);

  confirmCreateSummary(version: TranslationVersion) {
    this.selectedVersionForSummary.set(version);
    this.showConfirmCreateSummary.set(true);
  }

  cancelConfirmSummary() {
    this.showConfirmCreateSummary.set(false);
    this.selectedVersionForSummary.set(null);
  }

  async generateMissingSummary() {
    const version = this.selectedVersionForSummary();
    if (!version || !version.text.trim()) {
      this.cancelConfirmSummary();
      return;
    }

    this.showConfirmCreateSummary.set(false);
    this.isGeneratingSummary.set(true);

    try {
      // Use the model stored in the version, or fallback to config model
      const model = version.model || this.store.config().model;
      const summary = await this.gemini.summarizeTranslation(version.text, model);
      
      if (summary) {
        // Update the version in the chapter
        const currentChapter = this.chapter();
        if (currentChapter.versions) {
          const updatedVersions = currentChapter.versions.map(v => 
            v.versionNumber === version.versionNumber ? { ...v, summary } : v
          );
          
          this.store.updateChapter(currentChapter.id, {
            versions: updatedVersions
          });
          
          this.toast.success('Đã tạo bản tóm tắt thành công.');
        }
      } else {
        this.toast.error('Không thể tạo bản tóm tắt. Vui lòng thử lại.');
      }
    } catch (e) {
      console.error('Failed to create missing summary', e);
      this.toast.error('Có lỗi xảy ra khi tạo bản tóm tắt.');
    } finally {
      this.isGeneratingSummary.set(false);
      this.selectedVersionForSummary.set(null);
    }
  }

  viewPronounSnapshot(snapshotText: string | undefined, version: number | undefined) {
    if (!snapshotText) {
      this.parsedPronounSnapshot.set('');
    } else {
      this.parsedPronounSnapshot.set(this.parseMarkdown(snapshotText));
    }
    this.currentPronounVersion.set(version || 1);
    this.showPronounModal.set(true);
  }

  triggerClosePronounModal() {
    this.isClosingPronounModal.set(true);
    setTimeout(() => {
      this.showPronounModal.set(false);
      this.isClosingPronounModal.set(false);
    }, 200);
  }

  viewSummary(summary: string) {
    if (!summary) return;
    this.activeSummary.set(summary);
    this.showSummaryModal.set(true);
  }

  triggerCloseSummaryModal() {
    this.isClosingSummaryModal.set(true);
    setTimeout(() => {
      this.showSummaryModal.set(false);
      this.isClosingSummaryModal.set(false);
    }, 200);
  }

  viewContextSummary(summary: string | undefined, title: string | undefined) {
    if (!summary) return;
    this.activeContextSummary.set(summary);
    this.activeContextSummaryTitle.set(title || 'Chương trước');
    this.showContextSummaryModal.set(true);
  }

  triggerCloseContextSummaryModal() {
    this.isClosingContextSummaryModal.set(true);
    setTimeout(() => {
      this.showContextSummaryModal.set(false);
      this.isClosingContextSummaryModal.set(false);
    }, 200);
  }

  viewCustomGlossary(glossaryMd: string | undefined, ratio?: number) {
    if (!glossaryMd) return;
    this.parsedCustomGlossary.set(this.parseMarkdown(glossaryMd));
    this.currentGlossaryRatio.set(ratio);
    this.showGlossaryModal.set(true);
  }
  
  triggerCloseGlossaryModal() {
    this.isClosingGlossaryModal.set(true);
    setTimeout(() => {
      this.closeGlossaryModal();
      this.isClosingGlossaryModal.set(false);
    }, 200);
  }

  closeGlossaryModal() {
    this.showGlossaryModal.set(false);
  }

  translateSingle = output<void>();
  requestNavigate = output<number>();

  toggleExpand() {
    this.isExpanded.set(!this.isExpanded());
  }

  openFullscreen() {
    this.isFullscreen.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeFullscreen() {
    this.isFullscreen.set(false);
    document.body.style.overflow = '';
  }

  openBilingualFullscreen() {
    this.isBilingualFullscreen.set(true);
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      this.alignBilingualBlocks();
    }, 50); // allow DOM to render
  }

  closeBilingualFullscreen() {
    this.isBilingualFullscreen.set(false);
    this.isBilingualAligned.set(false);
    document.body.style.overflow = '';
  }

  alignBilingualBlocks() {
    const originalProse = document.querySelector('.bilingual-fullscreen-container .prose-original');
    const translatedProse = document.querySelector('.bilingual-fullscreen-container .prose-translated');

    if (!originalProse || !translatedProse) return;

    const originalBlocks = Array.from(originalProse.querySelectorAll(':scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6, :scope > ul, :scope > ol, :scope > blockquote, :scope > table')) as HTMLElement[];
    const translatedBlocks = Array.from(translatedProse.querySelectorAll(':scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6, :scope > ul, :scope > ol, :scope > blockquote, :scope > table')) as HTMLElement[];

    // Lớp 1: Số lượng block phải bằng nhau
    if (originalBlocks.length !== translatedBlocks.length || originalBlocks.length === 0) {
      this.isBilingualAligned.set(false);
      return;
    }

    // Lớp 2: Loại tag của các block phải khớp nhau hoàn toàn theo thứ tự
    const tagsMatch = originalBlocks.every((el, i) => el.tagName === translatedBlocks[i].tagName);
    if (!tagsMatch) {
      this.isBilingualAligned.set(false);
      return;
    }

    this.isBilingualAligned.set(true);
    
    // Khôi phục chiều cao mặc định nếu trước đó đã áp dụng minHeight (để an toàn khi resize)
    for (let i = 0; i < originalBlocks.length; i++) {
        originalBlocks[i].style.minHeight = '';
        translatedBlocks[i].style.minHeight = '';
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (this.isBilingualFullscreen() && this.isBilingualAligned()) {
      this.alignBilingualBlocks();
    }
  }

  onBilingualContentClick(event: MouseEvent, source: 'original' | 'translated') {
    const target = event.target as HTMLElement;
    const blockElement = target.closest('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, table') as HTMLElement;
    if (!blockElement) return;

    const parentProse = blockElement.closest('.prose');
    if (!parentProse) return;

    const allBlocks = Array.from(parentProse.querySelectorAll(':scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6, :scope > ul, :scope > ol, :scope > blockquote, :scope > table'));
    const index = allBlocks.indexOf(blockElement);

    if (index === -1) return;

    const isAligned = this.isBilingualAligned();

    // Find counterpart container
    const counterpartSelector = source === 'original' ? '.prose-translated' : '.prose-original';
    const counterpartProse = document.querySelector(`.bilingual-fullscreen-container ${counterpartSelector}`);
    const counterpartScrollContainer = counterpartProse?.closest('.overflow-y-auto') as HTMLElement;
    const activeScrollContainer = parentProse.closest('.overflow-y-auto') as HTMLElement;

    if (counterpartProse && counterpartScrollContainer && activeScrollContainer) {
      const counterpartBlocks = Array.from(counterpartProse.querySelectorAll(':scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6, :scope > ul, :scope > ol, :scope > blockquote, :scope > table'));
      const counterpartBlock = counterpartBlocks[index] as HTMLElement;
      
      if (counterpartBlock) {
        if (isAligned) {
            // Exactly sync position relative to viewport
            const activeBlockRect = blockElement.getBoundingClientRect();
            const activeContainerRect = activeScrollContainer.getBoundingClientRect();
            const relativeTopOffset = activeBlockRect.top - activeContainerRect.top;
            
            const counterpartBlockRect = counterpartBlock.getBoundingClientRect();
            const counterpartContainerRect = counterpartScrollContainer.getBoundingClientRect();
            const targetScrollTop = counterpartScrollContainer.scrollTop + (counterpartBlockRect.top - counterpartContainerRect.top) - relativeTopOffset;
            
            counterpartScrollContainer.scrollTo({
              top: targetScrollTop,
              behavior: 'smooth'
            });
        } else {
            // Fallback to center scroll without strong highlighting if not strictly aligned
            counterpartBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }

  prevTranslatedChapterIndex(): number {
    const chapters = this.store.chapters();
    const prevIndex = this.index() - 1;
    if (prevIndex >= 0 && chapters[prevIndex].translatedText) {
      return prevIndex;
    }
    return -1;
  }

  nextTranslatedChapterIndex(): number {
    const chapters = this.store.chapters();
    const nextIndex = this.index() + 1;
    if (nextIndex < chapters.length && chapters[nextIndex].translatedText) {
      return nextIndex;
    }
    return -1;
  }

  navigateTo(index: number) {
    this.closeFullscreen();
    this.requestNavigate.emit(index);
  }

  changeFontSize(delta: number) {
    const current = this.readerStore.prefs().fontSize;
    this.readerStore.updatePrefs({ fontSize: Math.max(14, Math.min(42, current + delta)) });
  }

  changeTheme(theme: 'white' | 'sepia' | 'dark') {
    this.readerStore.updatePrefs({ theme });
  }

  changeFontFamily(fontFamily: 'Inter' | 'Lora' | 'Lexend') {
    this.readerStore.updatePrefs({ fontFamily });
  }

  resetPrefs() {
    this.readerStore.resetPrefs();
  }

  toggleToolbar() {
    this.readerStore.updatePrefs({ isToolbarExpanded: !this.readerStore.prefs().isToolbarExpanded });
  }

  getContainerBg(theme: string) {
    switch (theme) {
      case 'dark': return '#121212';
      case 'white': return '#FFFFFF';
      case 'sepia':
      default: return '#FFFFF0';
    }
  }

  getCloseBtnClass(theme: string) {
    switch (theme) {
      case 'dark': return 'bg-zinc-800/90 text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:bg-zinc-700/90';
      case 'white': return 'bg-zinc-100/90 text-zinc-500 hover:text-zinc-900 border border-zinc-200 hover:bg-zinc-200/90';
      case 'sepia':
      default: return 'bg-[#EAE4D3]/90 text-[#8C7A6B] hover:text-[#4A3C31] border border-[#DED6C1] hover:bg-[#DED6C1]/90';
    }
  }

  getToolbarClass(theme: string) {
    switch (theme) {
      case 'dark': return 'bg-zinc-800 text-zinc-300 border-zinc-700';
      case 'white': return 'bg-zinc-100 text-zinc-600 border-zinc-200';
      case 'sepia':
      default: return 'bg-[#F3EFE0] text-[#5C4D3C] border-[#E8DFC8]';
    }
  }

  getContentClass(theme: string) {
    switch (theme) {
      case 'dark': return 'prose-invert prose-p:text-zinc-300 prose-headings:text-zinc-100 prose-strong:text-zinc-200 prose-blockquote:text-zinc-400';
      case 'white': return 'prose-p:text-zinc-800 prose-headings:text-zinc-900';
      case 'sepia':
      default: return 'prose-p:text-[#333333] prose-headings:text-[#111111] prose-blockquote:text-[#555555]';
    }
  }

  getFontFamily(font: string) {
    switch (font) {
      case 'Lora': return "'Lora', serif";
      case 'Lexend': return "'Lexend', sans-serif";
      case 'Inter':
      default: return "'Inter', sans-serif";
    }
  }

  downloadHtml() {
    const text = this.chapter().translatedText;
    if (!text) return;

    try {
      const htmlBody = getConfiguredMarked().parse(text);
      const title = this.chapter().title || `Phần ${this.index() + 1}`;
      const htmlDoc = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Lexend:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
${OFFLINE_READER_STYLES}
</style>
</head>
<body>
${OFFLINE_READER_TOOLBAR_HTML}
<div class="content-wrapper">
${htmlBody}
</div>
${OFFLINE_READER_SCRIPT}
</body>
</html>`;

      const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.store.currentProjectName()}_${title}_vi.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.toast.success('Đã tải xuống file HTML.');
    } catch (e: unknown) {
      console.error('Error exporting to HTML:', e);
      this.toast.error('Có lỗi xảy ra khi tải xuống HTML.');
    }
  }

  parseMarkdown(text: string | undefined): SafeHtml | string {
    if (!text) return '';
    const parsed = getConfiguredMarked().parse(text) as string;
    return this.sanitizer.bypassSecurityTrustHtml(parsed);
  }

  getActiveVersion(chapter: Chapter) {
    if (!chapter.versions || !chapter.activeVersionNumber) return null;
    return chapter.versions.find(v => v.versionNumber === chapter.activeVersionNumber) || null;
  }
}
