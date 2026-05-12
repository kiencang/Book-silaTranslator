import { Component, Output, EventEmitter, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BookStore } from '../../core/book.store';

@Component({
  selector: 'app-edit-project-modal',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  template: `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 selection:bg-indigo-100 selection:text-indigo-900">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-zinc-100 flex justify-between items-start">
          <div>
            <h2 class="text-xl font-bold text-zinc-900 tracking-tight">Sửa tên dự án của bạn</h2>
            <p class="text-sm text-zinc-500 mt-1">Cập nhật thông tin tác phẩm hoặc tác giả.</p>
          </div>
          <button (click)="closeModal.emit()" 
                  class="text-zinc-400 hover:text-zinc-600 transition-colors p-2 -mr-2 -mt-2 rounded-full hover:bg-zinc-100 focus:outline-none flex items-center justify-center">
            <mat-icon class="text-[20px]">close</mat-icon>
          </button>
        </div>
        
        <div class="p-6 space-y-4 overflow-y-auto">
          <div>
            <label for="bookTitle" class="block text-sm font-medium text-zinc-700 mb-1">Tên tác phẩm <span class="text-red-500">*</span></label>
            <input id="bookTitle" type="text" [(ngModel)]="bookTitle" placeholder="Ví dụ: Moby Dick" 
                   (keydown.enter)="canSave() && saveProject()"
                   class="w-full px-4 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base transition-shadow">
          </div>
          <div>
            <label for="author" class="block text-sm font-medium text-zinc-700 mb-1">Tác giả <span class="text-red-500">*</span></label>
            <input id="author" type="text" [(ngModel)]="author" placeholder="Ví dụ: Herman Melville" 
                   (keydown.enter)="canSave() && saveProject()"
                   class="w-full px-4 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base transition-shadow">
          </div>
        </div>
        
        <div class="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-end space-x-3">
          <button (click)="closeModal.emit()" 
                  class="px-5 py-2.5 bg-white border border-zinc-300 text-zinc-700 font-medium hover:bg-zinc-50 rounded-xl transition-colors shadow-sm focus:ring-2 focus:ring-zinc-200 focus:outline-none">
            Hủy
          </button>
          <button (click)="saveProject()" 
                  [disabled]="!canSave()"
                  [class.opacity-50]="!canSave()"
                  [class.cursor-not-allowed]="!canSave()"
                  class="px-5 py-2.5 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            Lưu
          </button>
        </div>
      </div>
    </div>
  `
})
export class EditProjectModal {
  @Output() closeModal = new EventEmitter<void>();
  store = inject(BookStore);
  
  bookTitle = this.store.bookTitle();
  author = this.store.author();

  canSave(): boolean {
    return this.bookTitle?.trim().length > 0 && this.author?.trim().length > 0;
  }

  saveProject() {
    if (!this.canSave()) return;
    
    this.store.updateProjectInfo(this.bookTitle.trim(), this.author?.trim() || '');
    this.closeModal.emit();
  }
}
