import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { BookStore, Chapter } from './book.store';
import { GeminiClient } from './gemini';
import { MatIconModule } from '@angular/material/icon';
import { marked } from 'marked';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-translator',
  standalone: true,
  imports: [MatIconModule, DatePipe, FormsModule],
  template: `
    <div class="max-w-6xl mx-auto py-8 px-4">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-3xl font-bold text-gray-900">Dịch thuật</h2>
          <p class="text-gray-500 mt-1">Đã sẵn sàng dịch {{ store.chapters().length }} phần của "{{ store.fileName() }}".</p>
        </div>
      </div>

      <!-- Config Panel -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 flex flex-col md:flex-row gap-8 relative">
        <!-- Model Selection -->
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Chọn mô hình</h3>
          <div class="flex flex-col space-y-2">
            <label class="flex items-center space-x-3 transition-opacity"
                   [class.cursor-pointer]="!store.isTranslatingAny()"
                   [class.cursor-not-allowed]="store.isTranslatingAny()"
                   [class.opacity-50]="store.isTranslatingAny()">
              <input type="radio" name="model" value="gemini-flash-latest" 
                [disabled]="store.isTranslatingAny()"
                [checked]="store.config().model === 'gemini-flash-latest'"
                (change)="store.updateConfig({model: 'gemini-flash-latest'})"
                class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:cursor-not-allowed">
              <span class="text-gray-700 font-medium tracking-tight">[Nhanh & Tiết kiệm] - flash</span>
            </label>
            <label class="flex items-center space-x-3 transition-opacity"
                   [class.cursor-pointer]="!store.isTranslatingAny()"
                   [class.cursor-not-allowed]="store.isTranslatingAny()"
                   [class.opacity-50]="store.isTranslatingAny()">
              <input type="radio" name="model" value="gemini-pro-latest" 
                [disabled]="store.isTranslatingAny()"
                [checked]="store.config().model === 'gemini-pro-latest'"
                (change)="store.updateConfig({model: 'gemini-pro-latest'})"
                class="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500 disabled:cursor-not-allowed">
              <span class="text-gray-700 font-medium tracking-tight">[Tư duy sâu] - pro</span>
            </label>
          </div>
        </div>

        <div class="w-px bg-gray-200 hidden md:block"></div>

        <!-- Temperature Selection -->
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Độ sáng tạo / Nhiệt độ</h3>
          <div class="flex space-x-6">
            <button class="flex flex-col items-center group transition-opacity outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    [class.cursor-pointer]="!store.isTranslatingAny()"
                    [disabled]="store.isTranslatingAny()"
                    (click)="store.updateConfig({temperature: 0.3})">
              <div class="w-8 h-8 rounded-full bg-black ring-offset-2 transition-all flex items-center justify-center"
                   [class.ring-2]="store.config().temperature === 0.3"
                   [class.ring-black]="store.config().temperature === 0.3">
                @if (store.config().temperature === 0.3) { <mat-icon class="text-white !w-4 !h-4 !text-base !flex !items-center !justify-center">check</mat-icon> }
              </div>
              <span class="mt-2 text-xs font-semibold text-gray-700">0.3</span>
              <span class="text-[10px] text-gray-400">Chặt chẽ</span>
            </button>

            <button class="flex flex-col items-center group transition-opacity outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    [class.cursor-pointer]="!store.isTranslatingAny()"
                    [disabled]="store.isTranslatingAny()"
                    (click)="store.updateConfig({temperature: 0.5})">
              <div class="w-8 h-8 rounded-full bg-blue-500 ring-offset-2 transition-all flex items-center justify-center"
                   [class.ring-2]="store.config().temperature === 0.5"
                   [class.ring-blue-500]="store.config().temperature === 0.5">
                 @if (store.config().temperature === 0.5) { <mat-icon class="text-white !w-4 !h-4 !text-base !flex !items-center !justify-center">check</mat-icon> }
              </div>
              <span class="mt-2 text-xs font-semibold text-gray-700">0.5</span>
              <span class="text-[10px] text-gray-400">Cân bằng</span>
            </button>

            <button class="flex flex-col items-center group transition-opacity outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    [class.cursor-pointer]="!store.isTranslatingAny()"
                    [disabled]="store.isTranslatingAny()"
                    (click)="store.updateConfig({temperature: 0.7})">
              <div class="w-8 h-8 rounded-full bg-red-500 ring-offset-2 transition-all flex items-center justify-center"
                   [class.ring-2]="store.config().temperature === 0.7"
                   [class.ring-red-500]="store.config().temperature === 0.7">
                 @if (store.config().temperature === 0.7) { <mat-icon class="text-white !w-4 !h-4 !text-base !flex !items-center !justify-center">check</mat-icon> }
              </div>
              <span class="mt-2 text-xs font-semibold text-gray-700">0.7</span>
              <span class="text-[10px] text-gray-400">Uyển chuyển</span>
            </button>
          </div>
        </div>

        <div class="w-px bg-gray-200 hidden md:block"></div>

        <!-- Pronouns Table Toggle -->
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            Đại từ nhân xưng
          </h3>
          <div class="flex flex-col space-y-3">
             <label class="flex items-center space-x-3 transition-opacity" [class.cursor-pointer]="!!store.pronounTable()" [class.cursor-not-allowed]="!store.pronounTable()" [class.opacity-50]="!store.pronounTable()">
              <input type="checkbox" 
                [checked]="store.usePronouns()"
                (change)="toggleUsePronouns($event)"
                [disabled]="!store.pronounTable()"
                class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:cursor-not-allowed"
                [class.cursor-pointer]="!!store.pronounTable()">
              <span class="text-gray-700 font-medium tracking-tight">Kích hoạt Bảng đại từ</span>
            </label>
            <div class="text-sm text-gray-500 italic mt-1">
              @if (store.pronounTable()) {
                 Đang sử dụng bảng đại từ đã cập nhật.
              } @else {
                 Chưa có bảng đại từ nhân xưng thiết lập.
              }
            </div>
            <button 
              (click)="store.phase.set(3)"
              class="inline-flex max-w-fit items-center px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors mt-2"
            >
              <mat-icon class="mr-2 !w-4 !h-4 !text-base">assignment_ind</mat-icon>
              Chỉnh sửa
            </button>
          </div>
        </div>

      </div>

      <!-- Action area -->
      <div class="mb-4 flex justify-between items-start w-full">
        <div class="flex gap-4 items-center">
          @if (translateOperation() !== 'none') {
            <button 
              disabled
              class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm flex items-center space-x-2 opacity-75 cursor-not-allowed"
            >
              <mat-icon class="animate-spin">sync</mat-icon>
              @if (translateOperation() === 'retranslate') {
                <span>Đang dịch lại toàn bộ sách...</span>
              } @else if (translateOperation() === 'all') {
                <span>Đang khởi tạo bản dịch...</span>
              } @else {
                <span>Đang dịch các phần chưa dịch...</span>
              }
            </button>
          } @else if (translationState() === 'all') {
            @if (showConfirmRetranslate()) {
              <div class="flex items-center space-x-3 bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-100 shadow-sm transition-all duration-200">
                <span class="text-sm font-medium">Bạn có chắc muốn dịch lại từ đầu? Lựa chọn này sẽ tốn thời gian & Token.</span>
                <div class="flex items-center space-x-2 border-l border-red-200 pl-3">
                  <button (click)="executeTranslateAll(true)" class="text-sm font-bold hover:text-red-900 transition-colors">Đồng ý</button>
                  <button (click)="showConfirmRetranslate.set(false)" class="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">Hủy</button>
                </div>
              </div>
            } @else {
               <button 
                (click)="showConfirmRetranslate.set(true)"
                [disabled]="store.isTranslatingAny()"
                [class.opacity-50]="store.isTranslatingAny()"
                [class.cursor-not-allowed]="store.isTranslatingAny()"
                class="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2"
              >
                <mat-icon>refresh</mat-icon>
                <span>Dịch lại toàn bộ cuốn sách</span>
              </button>
            }
          } @else if (translationState() === 'none') {
            <button 
              (click)="executeTranslateAll(false)"
              [disabled]="store.isTranslatingAny()"
              [class.opacity-50]="store.isTranslatingAny()"
              [class.cursor-not-allowed]="store.isTranslatingAny()"
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2 disabled:hover:bg-blue-600"
            >
              <mat-icon>translate</mat-icon>
              <span>Dịch toàn bộ cuốn sách</span>
            </button>
          } @else {
            <button 
              (click)="executeTranslateAll(false)"
              [disabled]="store.isTranslatingAny()"
              [class.opacity-50]="store.isTranslatingAny()"
              [class.cursor-not-allowed]="store.isTranslatingAny()"
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2 disabled:hover:bg-blue-600"
            >
              <mat-icon>translate</mat-icon>
              <span>Dịch tất cả các phần chưa dịch</span>
            </button>
          }
        </div>
        
        @if (translationState() === 'all') {
          <button 
            (click)="store.exportProjectToHtml()"
            [disabled]="store.isTranslatingAny()"
            [class.opacity-50]="store.isTranslatingAny()"
            [class.cursor-not-allowed]="store.isTranslatingAny()"
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center space-x-2 disabled:hover:bg-green-600 shrink-0"
          >
            <mat-icon>download</mat-icon>
            <span>Download bản dịch</span>
          </button>
        }
      </div>

      <!-- Chapter List -->
      <div class="space-y-4">
        @for (chapter of store.chapters(); track chapter.id; let i = $index) {
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 cursor-pointer" 
                 (click)="toggleExpand(chapter.id)" 
                 tabindex="0" 
                 (keydown.enter)="toggleExpand(chapter.id)">
              <div class="flex items-center space-x-3 w-full">
                <mat-icon class="text-gray-400 transition-transform" [class.rotate-90]="expanded[chapter.id]">chevron_right</mat-icon>
                <div class="flex-1">
                  <h4 class="font-semibold text-gray-900">{{ chapter.title || 'Phần ' + (i+1) }}</h4>
                  <div class="flex items-center space-x-3 mt-1">
                    <span class="text-xs text-gray-500 font-mono">{{ chapter.wordCount }} từ</span>
                    <span class="w-1 h-1 rounded-full bg-gray-300"></span>
                    @switch (chapter.status) {
                      @case ('pending') { <span class="text-xs font-medium text-gray-500 bg-gray-200 px-2 rounded-full py-0.5">Chờ dịch</span> }
                      @case ('translating') { <span class="text-xs font-medium text-blue-700 bg-blue-100 px-2 rounded-full py-0.5 animate-pulse">Đang dịch...</span> }
                      @case ('done') { <span class="text-xs font-medium text-green-700 bg-green-100 px-2 rounded-full py-0.5">Đã dịch</span> }
                      @case ('error') { <span class="text-xs font-medium text-red-700 bg-red-100 px-2 rounded-full py-0.5">Lỗi</span> }
                    }
                  </div>
                </div>
              </div>
              <div class="flex items-center space-x-2 shrink-0 ml-4">
                @if (chapter.status !== 'translating') {
                  <button 
                    (click)="translateSingle(chapter); $event.stopPropagation()"
                    [disabled]="store.isTranslatingAny()"
                    [class.opacity-50]="store.isTranslatingAny()"
                    [class.cursor-not-allowed]="store.isTranslatingAny()"
                    class="px-3 py-1.5 bg-white text-blue-600 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm disabled:hover:bg-white disabled:hover:border-blue-200"
                    [title]="chapter.status === 'done' || chapter.status === 'error' ? 'Dịch lại riêng phần này' : 'Dịch riêng phần này'"
                  >
                    <mat-icon class="!w-4 !h-4 !text-base flex items-center justify-center">looks_one</mat-icon>
                    <span class="text-sm font-medium">{{ chapter.status === 'done' || chapter.status === 'error' ? 'Dịch lại riêng phần này' : 'Dịch riêng phần này' }}</span>
                  </button>
                }
              </div>
            </div>

            @if (expanded[chapter.id]) {
              <div class="flex flex-col">
                @if (chapter.versions && chapter.versions.length > 0) {
                  <div class="px-6 py-3 bg-white border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                     <div class="flex items-center gap-2">
                        <span class="text-xs font-medium text-gray-500 mr-2">Phiên bản:</span>
                        @for (v of chapter.versions; track v.versionNumber) {
                          <button 
                            (click)="store.selectVersion(chapter.id, v.versionNumber)"
                            [class.bg-blue-100]="chapter.activeVersionNumber === v.versionNumber"
                            [class.text-blue-700]="chapter.activeVersionNumber === v.versionNumber"
                            [class.font-semibold]="chapter.activeVersionNumber === v.versionNumber"
                            [class.bg-gray-100]="chapter.activeVersionNumber !== v.versionNumber"
                            [class.text-gray-600]="chapter.activeVersionNumber !== v.versionNumber"
                            class="px-2 py-1.5 min-w-[36px] rounded-md text-xs font-medium transition-colors hover:bg-gray-200"
                          >
                            v{{ v.versionNumber }}
                          </button>
                        }
                      </div>
                      @if (getActiveVersion(chapter); as activeV) {
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
                    <div class="prose prose-sm max-w-none text-gray-700" [innerHTML]="parseMarkdown(chapter.originalText)"></div>
                  </div>
                  <div class="p-6 bg-gray-50">
                    <h5 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Bản dịch</h5>
                    @if (chapter.translatedText) {
                      <div class="prose prose-sm max-w-none text-gray-900" [innerHTML]="parseMarkdown(chapter.translatedText)"></div>
                    } @else if (chapter.status === 'translating') {
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
        }
      </div>
    </div>
  `
})
export class Translator {
  store = inject(BookStore);
  gemini = inject(GeminiClient);
  
  expanded: Record<string, boolean> = {};

  showConfirmRetranslate = signal(false);
  translateOperation = signal<'none' | 'all' | 'retranslate' | 'untranslated'>('none');

  translationState = computed(() => {
    const chapters = this.store.chapters();
    if (chapters.length === 0) return 'none';
    const doneCount = chapters.filter(c => c.status === 'done').length;
    if (doneCount === 0) return 'none';
    if (doneCount === chapters.length) return 'all';
    return 'partial';
  });

  toggleExpand(id: string) {
    this.expanded[id] = !this.expanded[id];
  }

  parseMarkdown(text: string) {
    return marked.parse(text) as string;
  }

  getActiveVersion(chapter: Chapter) {
    if (!chapter.versions || !chapter.activeVersionNumber) return null;
    return chapter.versions.find(v => v.versionNumber === chapter.activeVersionNumber) || null;
  }

  toggleUsePronouns(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.store.usePronouns.set(isChecked);
  }

  async translateSingle(chapter: Chapter) {
    this.store.updateChapter(chapter.id, { status: 'translating' });
    this.expanded[chapter.id] = true;
    
    try {
      const config = this.store.config();
      const result = await this.gemini.translateChapter(
        chapter.originalText, 
        config.model, 
        config.temperature,
        this.store.bookTitle(),
        this.store.author(),
        this.store.pronounTable(),
        this.store.usePronouns()
      );
      
      const newVersionNumber = (chapter.latestVersionNumber || 0) + 1;
      const newVersion = {
        versionNumber: newVersionNumber,
        text: result,
        model: config.model,
        temperature: config.temperature,
        timestamp: Date.now()
      };
      
      const versions = [...(chapter.versions || []), newVersion].slice(-3);
      
      this.store.updateChapter(chapter.id, { 
        status: 'done',
        translatedText: result,
        versions: versions,
        latestVersionNumber: newVersionNumber,
        activeVersionNumber: newVersionNumber
      });
    } catch (e) {
      console.error(e);
      this.store.updateChapter(chapter.id, { status: 'error' });
      alert('Dịch thất bại đối với ' + chapter.title);
    }
  }

  async executeTranslateAll(forceAll: boolean) {
    this.showConfirmRetranslate.set(false);
    
    let toTranslate = this.store.chapters();
    if (forceAll) {
      this.translateOperation.set('retranslate');
    } else {
      const isCompletelyNew = toTranslate.every(c => c.status === 'pending');
      this.translateOperation.set(isCompletelyNew ? 'all' : 'untranslated');
      toTranslate = toTranslate.filter(c => c.status === 'pending' || c.status === 'error');
    }

    if (toTranslate.length === 0) {
      this.translateOperation.set('none');
      return;
    }

    try {
      for (const chapter of toTranslate) {
        // Do it sequentially to avoid rate limiting
        await this.translateSingle(chapter);
      }
    } finally {
      this.translateOperation.set('none');
    }
  }
}

