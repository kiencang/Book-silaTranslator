import { Component, inject, signal } from '@angular/core';
import { BookStore } from '../../core/book.store';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  host: {
    class: 'flex-1 flex flex-col'
  },
  template: `
    <div class="flex-1 flex items-center justify-center min-h-[50vh]">
      <div class="w-full max-w-2xl p-8 bg-white rounded-2xl shadow-sm border border-zinc-100">
        <div class="text-center mb-5">
        <h2 class="text-3xl font-bold text-zinc-900 tracking-tight">Tạo dự án dịch mới</h2>
        <p class="text-zinc-500 mt-3 text-lg">Bắt đầu bằng cách nhập thông tin cho dự án sách của bạn.</p>
      </div>
      
      <div class="space-y-4">
        <div>
          <label for="bookTitle" class="block text-sm font-medium text-zinc-700 mb-1">Tên tác phẩm <span class="text-red-500">*</span></label>
          <div class="relative group">
            <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 !w-5 !h-5 !text-[20px] text-zinc-400 group-focus-within:text-indigo-600 transition-colors">menu_book</mat-icon>
            <input id="bookTitle" type="text" [(ngModel)]="bookTitle" placeholder="Ví dụ: Moby Dick" 
                   (keydown.enter)="canCreate() && createProject()"
                   class="w-full pl-11 pr-4 py-3 border border-zinc-300 rounded-xl focus:ring-0 focus:border-indigo-600 focus:border-2 outline-none text-lg transition-all">
          </div>
        </div>
        <div>
          <label for="author" class="block text-sm font-medium text-zinc-700 mb-1">Tác giả <span class="text-red-500">*</span></label>
          <div class="relative group">
            <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 !w-5 !h-5 !text-[20px] text-zinc-400 group-focus-within:text-indigo-600 transition-colors">person</mat-icon>
            <input id="author" type="text" [(ngModel)]="author" placeholder="Ví dụ: Herman Melville (hoặc Vô danh)" 
                   (keydown.enter)="canCreate() && createProject()"
                   class="w-full pl-11 pr-4 py-3 border border-zinc-300 rounded-xl focus:ring-0 focus:border-indigo-600 focus:border-2 outline-none text-lg transition-all">
          </div>
        </div>
        
        <div class="pt-2">
          <button [disabled]="!canCreate()" (click)="createProject()" 
                  class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-sm text-lg">
            Tạo dự án & Bắt đầu
          </button>
        </div>
      </div>
      </div>
    </div>
  `
})
export class Home {
  store = inject(BookStore);
  toast = inject(ToastService);
  bookTitle = signal('');
  author = signal('');

  canCreate() {
    return this.bookTitle().trim().length > 0 && this.author().trim().length > 0;
  }

  createProject() {
    if (this.canCreate()) {
      const title = this.bookTitle().trim().replace(/\s+/g, ' ');
      const author = this.author().trim().replace(/\s+/g, ' ');
      const projectName = author ? `${title} - ${author}` : title;
      
      if (typeof window !== 'undefined') {
        const key = localStorage.getItem('user_gemini_api_key');
        if (!key || key.trim() === '') {
          this.toast.error('Bạn cần nhập API Key để dịch, nó là button nằm bên trái ở chân trang.');
        }
      }

      this.store.createNewProject(projectName, title, author);
    }
  }
}
