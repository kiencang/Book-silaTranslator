import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {BookStore} from './core/book.store';
import {Uploader} from './features/uploader/uploader';
import {Splitter} from './features/splitter/splitter';
import {PronounSetup} from './features/setup/pronoun-setup';
import {GlossarySetup} from './features/setup/glossary-setup';
import {Translator} from './features/translator/translator';
import {Home} from './features/home/home';
import {ProjectModal} from './shared/components/project-modal';
import {EditProjectModal} from './shared/components/edit-project-modal';
import {MatIconModule} from '@angular/material/icon';
import {ToastComponent} from './shared/components/toast.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [Uploader, Splitter, PronounSetup, GlossarySetup, Translator, Home, ProjectModal, EditProjectModal, ToastComponent, MatIconModule],
  template: `
    <div class="h-screen bg-zinc-50 flex flex-col font-sans overflow-hidden">
      <header class="bg-white border-b border-zinc-200 shrink-0 w-full py-4 px-6 flex items-center justify-between shadow-sm">
        <div class="flex items-center">
          <button class="flex items-center space-x-2 bg-transparent border-none p-0 focus:outline-none" 
               [class.cursor-pointer]="!store.isBusy()" 
               [class.cursor-default]="store.isBusy()"
               title="Quay về trang chủ" 
               (click)="!store.isBusy() && store.closeProject()">
            <div class="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold text-xl">B</div>
            <div class="text-xl font-semibold text-zinc-900 tracking-tight flex items-center">
              <span class="hidden sm:inline">Book silaTranslator</span>
            </div>
          </button>
          @if (store.currentProjectName()) {
            <div class="text-xl font-semibold tracking-tight flex items-center">
              <span class="text-zinc-400 font-normal mx-2">/</span>
              <button 
                  class="text-indigo-700 max-w-[150px] sm:max-w-xs hover:underline focus:outline-none focus:underline bg-transparent border-none p-0 cursor-pointer flex items-center group" 
                  [title]="'Sửa tên dự án: ' + store.currentProjectName()"
                  (click)="showEditProjectModal.set(true)">
                <span class="truncate">{{store.currentProjectName()}}</span>
                <mat-icon class="!text-[16px] !w-4 !h-4 ml-1.5 opacity-30 group-hover:opacity-100 transition-opacity">edit</mat-icon>
              </button>
            </div>
          }
        </div>
        
        <div class="flex items-center justify-end space-x-6">
          @if (store.phase() > 0) {
            <div class="hidden lg:flex items-center text-sm font-medium text-zinc-400 mr-2 border-r border-zinc-200 pr-6">
              <div class="flex items-center space-x-3">
                <button (click)="goToPhase(1)" [disabled]="store.phase() > 1 || store.isBusy()" class="flex items-center hover:text-indigo-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-zinc-400" [class.text-indigo-600]="store.phase() >= 1">
                  <span class="w-5 h-5 text-xs rounded-full border-2 flex items-center justify-center mr-1.5" 
                        [class.border-indigo-600]="store.phase() >= 1" [class.bg-indigo-600]="store.phase() > 1" [class.text-white]="store.phase() > 1">1</span>
                  Tải lên
                </button>
                <div class="w-3 h-0.5 rounded-full bg-zinc-200" [class.bg-indigo-600]="store.phase() > 1"></div>
                <button (click)="goToPhase(2)" [disabled]="!store.rawMarkdown() || store.isBusy()" class="flex items-center hover:text-indigo-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-zinc-400" [class.text-indigo-600]="store.phase() >= 2">
                  <span class="w-5 h-5 text-xs rounded-full border-2 flex items-center justify-center mr-1.5"
                        [class.border-indigo-600]="store.phase() >= 2" [class.bg-indigo-600]="store.phase() > 2" [class.text-white]="store.phase() > 2">2</span>
                  Chia chương
                </button>
                <div class="w-3 h-0.5 rounded-full bg-zinc-200" [class.bg-indigo-600]="store.phase() > 2"></div>
                <button (click)="goToPhase(3)" [disabled]="store.chapters().length === 0 || store.isBusy() || store.phase() === 2" class="flex items-center hover:text-indigo-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-zinc-400" [class.text-indigo-600]="store.phase() >= 3">
                  <span class="w-5 h-5 text-xs rounded-full border-2 flex items-center justify-center mr-1.5"
                        [class.border-indigo-600]="store.phase() >= 3" [class.bg-indigo-600]="store.phase() > 3" [class.text-white]="store.phase() > 3">3</span>
                  Đại từ
                </button>
                <div class="w-3 h-0.5 rounded-full bg-zinc-200" [class.bg-indigo-600]="store.phase() > 3"></div>
                <button (click)="goToPhase(4)" [disabled]="store.chapters().length === 0 || store.isBusy() || store.phase() === 2" class="flex items-center hover:text-indigo-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-zinc-400" [class.text-indigo-600]="store.phase() >= 4">
                  <span class="w-5 h-5 text-xs rounded-full border-2 flex items-center justify-center mr-1.5"
                        [class.border-indigo-600]="store.phase() >= 4" [class.bg-indigo-600]="store.phase() > 4" [class.text-white]="store.phase() > 4">4</span>
                  Từ khó
                </button>
                <div class="w-3 h-0.5 rounded-full bg-zinc-200" [class.bg-indigo-600]="store.phase() > 4"></div>
                <button (click)="goToPhase(5)" [disabled]="store.chapters().length === 0 || store.isBusy() || store.phase() === 2" class="flex items-center hover:text-indigo-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-zinc-400" [class.text-indigo-600]="store.phase() === 5">
                  <span class="w-5 h-5 text-xs rounded-full border-2 flex items-center justify-center mr-1.5"
                        [class.border-indigo-600]="store.phase() === 5">5</span>
                  Dịch
                </button>
              </div>
            </div>
          }
          
          <button (click)="!store.isBusy() && showProjectModal.set(true)" 
                  [class.opacity-50]="store.isBusy()" 
                  [class.cursor-not-allowed]="store.isBusy()"
                  [disabled]="store.isBusy()"
                  class="flex items-center text-zinc-600 hover:text-indigo-600 font-medium text-sm transition-colors bg-zinc-100 hover:bg-indigo-50 px-3 py-2 rounded-lg whitespace-nowrap">
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

      <footer class="shrink-0 bg-white border-t border-zinc-200 py-2.5 px-6 text-xs text-zinc-500 flex justify-center items-center">
        <div class="flex items-center flex-wrap justify-center gap-x-2 gap-y-1">
          <span class="font-medium text-zinc-600">v1.0.45</span>
          <span class="text-zinc-300">•</span>
          <a href="https://github.com/kiencang/Book-silaTranslator" target="_blank" rel="noopener noreferrer" class="hover:text-indigo-600 transition-colors">GitHub</a>
          <span class="text-zinc-300">•</span>
          <span>Chỉ dùng cho mục đích cá nhân</span>
          <span class="text-zinc-300">•</span>
          <span class="font-medium">Nguyễn Đức Anh</span>
          <span class="text-zinc-300">•</span>
          <span>contact&#64;wpsila.com</span>
          <span class="text-zinc-300">•</span>
          <a href="#" class="hover:text-indigo-600 transition-colors">Hướng dẫn sử dụng</a>
        </div>
      </footer>

      @if (showProjectModal()) {
         <app-project-modal (closeModal)="showProjectModal.set(false)" />
      }

      @if (showEditProjectModal()) {
         <app-edit-project-modal (closeModal)="showEditProjectModal.set(false)" />
      }

      <app-toast />
    </div>
  `
})
export class App {
  store = inject(BookStore);
  showProjectModal = signal<boolean>(false);
  showEditProjectModal = signal<boolean>(false);

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
