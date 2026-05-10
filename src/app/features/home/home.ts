import { Component, inject, signal } from '@angular/core';
import { BookStore } from '../../core/book.store';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule],
  host: {
    class: 'flex-1 flex flex-col'
  },
  template: `
    <div class="flex-1 flex items-center justify-center min-h-[50vh]">
      <div class="w-full max-w-2xl p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div class="text-center mb-5">
        <h2 class="text-3xl font-bold text-gray-900 tracking-tight">Tạo dự án dịch mới</h2>
        <p class="text-gray-500 mt-3 text-lg">Bắt đầu bằng cách nhập thông tin cho dự án sách của bạn.</p>
      </div>
      
      <div class="space-y-4">
        <div>
          <label for="bookTitle" class="block text-sm font-medium text-gray-700 mb-1">Tên tác phẩm <span class="text-red-500">*</span></label>
          <input id="bookTitle" type="text" [(ngModel)]="bookTitle" placeholder="Ví dụ: Moby Dick" 
                 (keydown.enter)="canCreate() && createProject()"
                 class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg transition-shadow">
        </div>
        <div>
          <label for="author" class="block text-sm font-medium text-gray-700 mb-1">Tác giả <span class="text-red-500">*</span></label>
          <input id="author" type="text" [(ngModel)]="author" placeholder="Ví dụ: Herman Melville (hoặc Vô danh)" 
                 (keydown.enter)="canCreate() && createProject()"
                 class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg transition-shadow">
        </div>
        
        <div class="pt-2">
          <button [disabled]="!canCreate()" (click)="createProject()" 
                  class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-sm text-lg">
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
  bookTitle = signal('');
  author = signal('');

  canCreate() {
    return this.bookTitle().trim().length > 0 && this.author().trim().length > 0;
  }

  createProject() {
    if (this.canCreate()) {
      const title = this.bookTitle().trim();
      const author = this.author().trim();
      const projectName = author ? `${title} - ${author}` : title;
      this.store.createNewProject(projectName, title, author);
    }
  }
}
