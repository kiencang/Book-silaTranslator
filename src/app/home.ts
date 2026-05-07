import { Component, inject, signal } from '@angular/core';
import { BookStore } from './book.store';
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
        <div class="text-center mb-10">
        <div class="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6 shadow-md">B</div>
        <h2 class="text-3xl font-bold text-gray-900 tracking-tight">Tạo dự án dịch mới</h2>
        <p class="text-gray-500 mt-3 text-lg">Bắt đầu bằng cách đặt tên cho dự án sách của bạn.</p>
      </div>
      
      <div class="space-y-6">
        <div>
          <input type="text" [(ngModel)]="projectName" placeholder="Nhập tên dự án, ví dụ: Moby Dick - Herman Melville" 
                 (keydown.enter)="projectName().trim() && createProject()"
                 class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg transition-shadow">
        </div>
        
        <button [disabled]="!projectName().trim()" (click)="createProject()" 
                class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-sm text-lg">
          Tạo dự án & Bắt đầu
        </button>
      </div>
      </div>
    </div>
  `
})
export class Home {
  store = inject(BookStore);
  projectName = signal('');

  createProject() {
    if (this.projectName().trim()) {
      this.store.createNewProject(this.projectName().trim());
    }
  }
}
