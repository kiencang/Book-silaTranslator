import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {BookStore} from './core/book.store';
import {Uploader} from './features/uploader/uploader';
import {Splitter} from './features/splitter/splitter';
import {PronounSetup} from './features/setup/pronoun-setup';
import {GlossarySetup} from './features/setup/glossary-setup';
import {Translator} from './features/translator/translator';
import {Home} from './features/home/home';
import {ProjectModal} from './shared/components/project-modal';
import {MatIconModule} from '@angular/material/icon';
import {ToastComponent} from './shared/components/toast.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [Uploader, Splitter, PronounSetup, GlossarySetup, Translator, Home, ProjectModal, ToastComponent, MatIconModule],
  template: `
    <div class="h-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
      <header class="bg-white border-b border-gray-200 shrink-0 w-full py-4 px-6 flex items-center justify-between shadow-sm">
        <button class="flex items-center space-x-2 bg-transparent border-none p-0 focus:outline-none" 
             [class.cursor-pointer]="!store.isTranslatingAny() && !store.isGeneratingMetadata()" 
             [class.cursor-default]="store.isTranslatingAny() || store.isGeneratingMetadata()"
             title="Quay lại danh sách dự án" 
             (click)="!store.isTranslatingAny() && !store.isGeneratingMetadata() && store.closeProject()">
          <div class="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-xl">B</div>
          <div class="text-xl font-semibold text-gray-900 tracking-tight flex items-center">
            <span class="hidden sm:inline">Book silaTranslator</span>
            @if (store.currentProjectName()) {
              <span class="text-gray-400 font-normal mx-2">/</span>
              <span class="text-blue-700 truncate max-w-[150px] sm:max-w-xs" [title]="store.currentProjectName()">{{store.currentProjectName()}}</span>
            }
          </div>
        </button>
        
        <div class="flex items-center justify-end space-x-6">
          @if (store.phase() > 0) {
            <div class="hidden lg:flex items-center text-sm font-medium text-gray-400 mr-2 border-r border-gray-200 pr-6">
              <div class="flex items-center space-x-6">
                <button (click)="goToPhase(1)" [disabled]="store.phase() > 1" class="flex items-center hover:text-blue-600 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:hover:text-gray-400" [class.text-blue-600]="store.phase() >= 1">
                  <span class="w-6 h-6 rounded-full border-2 flex items-center justify-center mr-2" 
                        [class.border-blue-600]="store.phase() >= 1" [class.bg-blue-600]="store.phase() > 1" [class.text-white]="store.phase() > 1">1</span>
                  Tải lên
                </button>
                <div class="w-8 h-px bg-gray-200" [class.bg-blue-600]="store.phase() > 1"></div>
                <button (click)="goToPhase(2)" [disabled]="!store.rawMarkdown()" class="flex items-center hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-gray-400" [class.text-blue-600]="store.phase() >= 2">
                  <span class="w-6 h-6 rounded-full border-2 flex items-center justify-center mr-2"
                        [class.border-blue-600]="store.phase() >= 2" [class.bg-blue-600]="store.phase() > 2" [class.text-white]="store.phase() > 2">2</span>
                  Chia chương
                </button>
                <div class="w-8 h-px bg-gray-200" [class.bg-blue-600]="store.phase() > 2"></div>
                <button (click)="goToPhase(3)" [disabled]="store.chapters().length === 0" class="flex items-center hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-gray-400" [class.text-blue-600]="store.phase() >= 3">
                  <span class="w-6 h-6 rounded-full border-2 flex items-center justify-center mr-2"
                        [class.border-blue-600]="store.phase() >= 3" [class.bg-blue-600]="store.phase() > 3" [class.text-white]="store.phase() > 3">3</span>
                  Đại từ
                </button>
                <div class="w-8 h-px bg-gray-200" [class.bg-blue-600]="store.phase() > 3"></div>
                <button (click)="goToPhase(4)" [disabled]="store.chapters().length === 0" class="flex items-center hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-gray-400" [class.text-blue-600]="store.phase() >= 4">
                  <span class="w-6 h-6 rounded-full border-2 flex items-center justify-center mr-2"
                        [class.border-blue-600]="store.phase() >= 4" [class.bg-blue-600]="store.phase() > 4" [class.text-white]="store.phase() > 4">4</span>
                  Từ khó
                </button>
                <div class="w-8 h-px bg-gray-200" [class.bg-blue-600]="store.phase() > 4"></div>
                <button (click)="goToPhase(5)" [disabled]="store.chapters().length === 0" class="flex items-center hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-gray-400" [class.text-blue-600]="store.phase() === 5">
                  <span class="w-6 h-6 rounded-full border-2 flex items-center justify-center mr-2"
                        [class.border-blue-600]="store.phase() === 5">5</span>
                  Dịch thuật
                </button>
              </div>
            </div>
          }
          
          <button (click)="!store.isTranslatingAny() && !store.isGeneratingMetadata() && showProjectModal.set(true)" 
                  [class.opacity-50]="store.isTranslatingAny() || store.isGeneratingMetadata()" 
                  [class.cursor-not-allowed]="store.isTranslatingAny() || store.isGeneratingMetadata()"
                  [disabled]="store.isTranslatingAny() || store.isGeneratingMetadata()"
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
               @case (4) { <app-glossary-setup /> }
               @case (5) { <app-translator /> }
             }
          }
        </div>
      </main>

      <footer class="shrink-0 bg-white border-t border-gray-200 py-2.5 px-6 text-xs text-gray-500 flex justify-center items-center">
        <div class="flex items-center flex-wrap justify-center gap-x-2 gap-y-1">
          <span class="font-medium text-gray-600">v1.0.15</span>
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
         <app-project-modal (closeModal)="showProjectModal.set(false)" />
      }

      <app-toast />
    </div>
  `
})
export class App {
  store = inject(BookStore);
  showProjectModal = signal<boolean>(false);

  goToPhase(phase: number) {
    if (phase === 1 && this.store.phase() === 1) {
      this.store.phase.set(1);
    } else if (phase === 2 && this.store.rawMarkdown()) {
      this.store.phase.set(2);
    } else if (phase >= 3 && this.store.chapters().length > 0) {
      this.store.phase.set(phase as 1 | 2 | 3 | 4 | 5);
    }
  }
}
