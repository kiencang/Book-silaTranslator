import { Component, input, model, output, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BookStore, Chapter } from '../../../core/book.store';
import { ToastService } from '../../../core/toast.service';
import { getConfiguredMarked } from '../../../core/marked-setup';
import { ReaderStore } from '../../../core/reader.store';
import { OFFLINE_READER_SCRIPT, OFFLINE_READER_STYLES, OFFLINE_READER_TOOLBAR_HTML } from '../../../core/html-export.util';

@Component({
  selector: 'app-chapter-item',
  standalone: true,
  imports: [MatIconModule, DatePipe],
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
              [disabled]="store.isTranslatingAny()"
              [class.opacity-50]="store.isTranslatingAny()"
              [class.cursor-not-allowed]="store.isTranslatingAny()"
              class="px-3 py-1.5 bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200 hover:border-indigo-300 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm disabled:hover:bg-white disabled:hover:border-indigo-200"
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
            <div class="px-6 py-3 bg-white border-b border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
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
                  <div class="text-[11px] text-zinc-500 flex flex-wrap items-center gap-x-4 gap-y-2 bg-zinc-50 px-3 py-1.5 rounded-md border border-zinc-100">
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
                    <button (click)="openFullscreen()" class="tooltip-trigger flex items-center justify-center p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Đọc toàn màn hình">
                      <mat-icon class="!w-4 !h-4 !text-[16px]">fullscreen</mat-icon>
                    </button>
                  </div>
                }
              </div>
              @if (chapter().translatedText) {
                <div class="prose prose-sm max-w-none text-zinc-900" [innerHTML]="parseMarkdown(chapter().translatedText)"></div>
              } @else if (chapter().status === 'translating') {
                <div class="flex flex-col items-center justify-center py-12 text-indigo-600">
                  <mat-icon class="animate-spin mb-2">sync</mat-icon>
                  <span class="text-sm">Gemini đang tiến hành dịch</span>
                </div>
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
                  <button (click)="changeFontFamily('Nunito')" class="w-full h-8 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-xs font-medium tracking-tight" [class.font-bold]="readerStore.prefs().fontFamily === 'Nunito'" [class.ring-1]="readerStore.prefs().fontFamily === 'Nunito'" style="font-family: 'Nunito', sans-serif;" title="Font Nunito">Nu</button>
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
            <button (click)="closeFullscreen()" class="fixed top-6 left-6 w-10 h-10 flex items-center justify-center bg-white/80 dark:bg-zinc-800/80 rounded-full shadow-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors backdrop-blur-sm z-50 cursor-pointer" title="Thu gọn toàn màn hình">
              <mat-icon>fullscreen_exit</mat-icon>
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
    </div>
  `
})
export class ChapterItemComponent {
  store = inject(BookStore);
  toast = inject(ToastService);
  readerStore = inject(ReaderStore);
  chapter = input.required<Chapter>();
  index = input.required<number>();
  
  isExpanded = model(false);
  isFullscreen = signal(false);

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

  prevTranslatedChapterIndex(): number {
    const chapters = this.store.chapters();
    for (let i = this.index() - 1; i >= 0; i--) {
      if (chapters[i].translatedText) return i;
    }
    return -1;
  }

  nextTranslatedChapterIndex(): number {
    const chapters = this.store.chapters();
    for (let i = this.index() + 1; i < chapters.length; i++) {
      if (chapters[i].translatedText) return i;
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

  changeFontFamily(fontFamily: 'Inter' | 'Lora' | 'Nunito') {
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
      case 'Nunito': return "'Nunito', sans-serif";
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
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet">
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

  parseMarkdown(text: string | undefined) {
    if (!text) return '';
    return getConfiguredMarked().parse(text) as string;
  }

  getActiveVersion(chapter: Chapter) {
    if (!chapter.versions || !chapter.activeVersionNumber) return null;
    return chapter.versions.find(v => v.versionNumber === chapter.activeVersionNumber) || null;
  }
}
