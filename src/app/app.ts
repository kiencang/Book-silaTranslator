import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {BookStore} from './book.store';
import {Uploader} from './uploader';
import {Splitter} from './splitter';
import {PronounSetup} from './pronoun-setup';
import {Translator} from './translator';
import {Home} from './home';
import {ProjectModal} from './project-modal';
import {MatIconModule} from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [Uploader, Splitter, PronounSetup, Translator, Home, ProjectModal, MatIconModule],
  template: `
    <div class="h-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
      <header class="bg-white border-b border-gray-200 shrink-0 w-full py-4 px-6 flex items-center justify-between shadow-sm">
        <div class="flex items-center space-x-2" 
             [class.cursor-pointer]="!store.isTranslatingAny()" 
             [class.cursor-default]="store.isTranslatingAny()"
             title="Quay lại danh sách dự án" 
             (click)="!store.isTranslatingAny() && store.closeProject()">
          <div class="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-xl">B</div>
          <h1 class="text-xl font-semibold text-gray-900 tracking-tight flex items-center">
            <span class="hidden sm:inline">Book silaTranslator</span>
            @if (store.currentProjectName()) {
              <span class="text-gray-400 font-normal mx-2">/</span>
              <span class="text-blue-700 truncate max-w-[150px] sm:max-w-xs" [title]="store.currentProjectName()">{{store.currentProjectName()}}</span>
            }
          </h1>
        </div>
        
        <div class="flex items-center justify-end space-x-6">
          @if (store.phase() > 0) {
            <div class="hidden lg:flex items-center text-sm font-medium text-gray-400 mr-2 border-r border-gray-200 pr-6">
              <div class="flex items-center space-x-6">
                <div class="flex items-center" [class.text-blue-600]="store.phase() >= 1">
                  <span class="w-6 h-6 rounded-full border-2 flex items-center justify-center mr-2" 
                        [class.border-blue-600]="store.phase() >= 1" [class.bg-blue-600]="store.phase() > 1" [class.text-white]="store.phase() > 1">1</span>
                  Tải lên
                </div>
                <div class="w-8 h-px bg-gray-200"></div>
                <div class="flex items-center" [class.text-blue-600]="store.phase() >= 2">
                  <span class="w-6 h-6 rounded-full border-2 flex items-center justify-center mr-2"
                        [class.border-blue-600]="store.phase() >= 2" [class.bg-blue-600]="store.phase() > 2" [class.text-white]="store.phase() > 2">2</span>
                  Chia chương
                </div>
                <div class="w-8 h-px bg-gray-200"></div>
                <div class="flex items-center" [class.text-blue-600]="store.phase() === 3 || store.phase() === 4">
                  <span class="w-6 h-6 rounded-full border-2 flex items-center justify-center mr-2"
                        [class.border-blue-600]="store.phase() >= 3" [class.bg-blue-600]="store.phase() > 3" [class.text-white]="store.phase() > 3">3</span>
                  Đại từ
                </div>
                <div class="w-8 h-px bg-gray-200"></div>
                <div class="flex items-center" [class.text-blue-600]="store.phase() === 4">
                  <span class="w-6 h-6 rounded-full border-2 flex items-center justify-center mr-2"
                        [class.border-blue-600]="store.phase() === 4">4</span>
                  Dịch thuật
                </div>
              </div>
            </div>
          }
          
          <button (click)="!store.isTranslatingAny() && showProjectModal.set(true)" 
                  [class.opacity-50]="store.isTranslatingAny()" 
                  [class.cursor-not-allowed]="store.isTranslatingAny()"
                  [disabled]="store.isTranslatingAny()"
                  class="flex items-center text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors bg-gray-100 hover:bg-blue-50 px-3 py-2 rounded-lg whitespace-nowrap">
            <span class="material-icons sm:mr-1.5 text-[18px]">folder_copy</span>
            <span class="hidden sm:inline">Quản lý dự án</span>
          </button>
        </div>
      </header>
      
      <main class="flex-1 overflow-x-hidden p-6 overflow-y-auto flex flex-col">
        <div class="max-w-7xl mx-auto w-full flex-1 flex flex-col">
          @if (store.phase() === 0) {
             <app-home />
          } @else {
             @switch (store.phase()) {
               @case (1) { <app-uploader /> }
               @case (2) { <app-splitter /> }
               @case (3) { <app-pronoun-setup /> }
               @case (4) { <app-translator /> }
             }
          }
        </div>
      </main>

      <footer class="shrink-0 bg-white border-t border-gray-200 py-2.5 px-6 text-xs text-gray-500 flex justify-center items-center">
        <div class="flex items-center flex-wrap justify-center gap-x-2 gap-y-1">
          <span class="font-medium text-gray-600">v1.0.5</span>
          <span class="text-gray-300">•</span>
          <a href="https://github.com/kiencang/Book-silaTranslator" target="_blank" rel="noopener noreferrer" class="hover:text-blue-600 transition-colors">GitHub</a>
          <span class="text-gray-300">•</span>
          <span>Chỉ dùng cho mục đích cá nhân</span>
          <span class="text-gray-300">•</span>
          <span class="font-medium">Nguyễn Đức Anh</span>
          <span class="text-gray-300">•</span>
          <span>contact&#64;wpsila.com</span>
          <span class="text-gray-300">•</span>
          <a href="#" class="hover:text-blue-600 transition-colors">Hướng dẫn sử dụng</a>
        </div>
      </footer>

      @if (showProjectModal()) {
         <app-project-modal (close)="showProjectModal.set(false)" />
      }

      @if (store.toastMessage(); as toast) {
        <div class="fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center z-50 transition-all shadow-red-100"
             [class.bg-red-50]="toast.type === 'error'"
             [class.text-red-700]="toast.type === 'error'"
             [class.border-red-200]="toast.type === 'error'"
             [class.bg-green-50]="toast.type === 'success'"
             [class.text-green-700]="toast.type === 'success'"
             [class.border-green-200]="toast.type === 'success'"
             [class.shadow-green-100]="toast.type === 'success'">
          <mat-icon class="mr-2">{{ toast.type === 'error' ? 'error_outline' : 'check_circle' }}</mat-icon>
          <span>{{ toast.message }}</span>
          <button (click)="store.toastMessage.set(null)" class="ml-4 opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center">
            <mat-icon class="!w-4 !h-4 !text-base">close</mat-icon>
          </button>
        </div>
      }
    </div>
  `
})
export class App {
  store = inject(BookStore);
  showProjectModal = signal<boolean>(false);
}
