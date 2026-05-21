import { Component, Output, EventEmitter, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-api-key-modal',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  template: `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 selection:bg-indigo-100 selection:text-indigo-900 animate-fade-in" tabindex="0" (click)="triggerClose()" (keydown.escape)="triggerClose()" [class.animate-fade-out]="isClosing()">
      <div role="presentation" tabindex="-1" (keyup.enter)="$event.stopPropagation()" class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-zoom-in cursor-default" (click)="$event.stopPropagation()" [class.animate-zoom-out]="isClosing()">
        <!-- Header -->
        <div class="p-6 border-b border-zinc-100 flex justify-between items-start">
          <div class="flex items-center space-x-2.5">
            <mat-icon class="text-zinc-800 scale-110">key</mat-icon>
            <h2 class="text-xl font-bold text-zinc-900 tracking-tight">Cấu hình Gemini API Key</h2>
          </div>
          <button (click)="triggerClose()" 
                  class="text-zinc-400 hover:text-zinc-600 transition-colors p-2 -mr-2 -mt-2 rounded-full hover:bg-zinc-100 focus:outline-none flex items-center justify-center">
            <mat-icon class="text-[20px]">close</mat-icon>
          </button>
        </div>
        
        <!-- Content -->
        <div class="p-6 space-y-5 overflow-y-auto">
          <p class="text-sm text-zinc-600 leading-relaxed font-sans mt-0.5">
            Tự cấu hình khóa API (Gemini API Key) riêng để dịch ổn định, không lo hết giới hạn lượt dịch từ hệ thống chung.
          </p>

          <!-- Status badge/links -->
          <div class="flex items-center space-x-2.5 text-xs text-zinc-500 bg-zinc-50/50 border border-zinc-100 p-2.5 rounded-xl">
            @if (hasSavedKey()) {
              <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                Đang dùng API Key của bạn
              </span>
            } @else {
              <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                Đang dùng Key hệ thống
              </span>
            }
            <span class="text-zinc-300">|</span>
            <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-750 font-medium hover:underline flex items-center">
              <mat-icon class="!text-[14px] !w-3.5 !h-3.5 mr-1 text-indigo-500">help_outline</mat-icon>Hướng dẫn nhanh
            </a>
          </div>

          <!-- Input section -->
          <div class="space-y-1.5">
            <label for="geminiApiKey" class="block text-xs font-bold text-zinc-500 uppercase tracking-widest">
              GEMINI API KEY CÁ NHÂN
            </label>
            <div class="relative flex items-center">
              <input id="geminiApiKey" 
                     [type]="showKey() ? 'text' : 'password'" 
                     [(ngModel)]="apiKey" 
                     placeholder="AIzaSy..." 
                     (keydown.enter)="saveKey()"
                     class="w-full pl-4 pr-11 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm tracking-wide font-mono transition-shadow">
              <button (click)="toggleShowKey()" 
                      class="absolute right-3 text-zinc-400 hover:text-zinc-600 transition-colors p-1 rounded-md focus:outline-none flex items-center justify-center">
                <mat-icon class="text-[20px]">{{ showKey() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </div>
            <p class="text-[11px] text-zinc-400 font-sans leading-relaxed">
              Khóa API của bạn được lưu <em>cục bộ tuyệt đối</em> trong trình duyệt của bạn (<code>LocalStorage</code>), không lưu trữ trên bất kỳ máy chủ nào khác.
            </p>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-between items-center">
          <div>
            @if (hasSavedKey()) {
              <button (click)="deleteKey()" 
                      class="px-4 py-2 bg-white border border-red-200 text-red-600 font-medium hover:bg-red-50 hover:border-red-300 rounded-xl transition-all shadow-sm focus:ring-2 focus:ring-red-100 focus:outline-none text-sm">
                Xóa Key cá nhân
              </button>
            }
          </div>
          <div class="flex space-x-2.5">
            <button (click)="triggerClose()" 
                    class="px-5 py-2 bg-white border border-zinc-300 text-zinc-700 font-medium hover:bg-zinc-50 rounded-xl transition-colors shadow-sm focus:ring-2 focus:ring-zinc-200 focus:outline-none text-sm font-sans">
              Hủy
            </button>
            <button (click)="saveKey()" 
                    [disabled]="!apiKey.trim()"
                    [class.opacity-50]="!apiKey.trim()"
                    [class.cursor-not-allowed]="!apiKey.trim()"
                    class="px-5 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-750 rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-sm font-sans">
              Lưu cấu hình
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ApiKeyModal {
  @Output() closeModal = new EventEmitter<void>();
  isClosing = signal(false);
  showKey = signal(false);
  apiKey = '';
  hasSavedKey = signal(false);

  constructor() {
    this.checkSavedKey();
  }

  checkSavedKey() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('user_gemini_api_key');
      this.hasSavedKey.set(!!(saved && saved.trim() !== ''));
      if (saved) {
        this.apiKey = saved;
      } else {
        this.apiKey = '';
      }
    }
  }

  toggleShowKey() {
    this.showKey.update(v => !v);
  }

  triggerClose() {
    this.isClosing.set(true);
    setTimeout(() => {
      this.closeModal.emit();
    }, 200);
  }

  saveKey() {
    if (!this.apiKey.trim()) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_gemini_api_key', this.apiKey.trim());
      window.dispatchEvent(new Event('api-key-changed'));
    }
    this.triggerClose();
  }

  deleteKey() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_gemini_api_key');
      window.dispatchEvent(new Event('api-key-changed'));
    }
    this.triggerClose();
  }
}
