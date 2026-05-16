import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/toast.service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (toastService.currentToast(); as toast) {
      <div class="fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center z-50 transition-all shadow-red-100 min-w-[300px] max-w-md"
           [class.bg-red-50]="toast.type === 'error'"
           [class.text-red-700]="toast.type === 'error'"
           [class.border-red-200]="toast.type === 'error'"
           [class.bg-green-50]="toast.type === 'success'"
           [class.text-green-700]="toast.type === 'success'"
           [class.border-green-200]="toast.type === 'success'"
           [class.shadow-green-100]="toast.type === 'success'"
           [class.bg-indigo-50]="toast.type === 'info'"
           [class.text-indigo-700]="toast.type === 'info'"
           [class.border-indigo-200]="toast.type === 'info'"
           [class.shadow-indigo-100]="toast.type === 'info'">
        
        <mat-icon class="mr-3">
          {{ toast.type === 'error' ? 'error_outline' : toast.type === 'success' ? 'check_circle' : 'info' }}
        </mat-icon>
        
        <span class="flex-1 leading-relaxed">{{ toast.message }}</span>
        
        <button (click)="toastService.close()" class="ml-4 opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center w-6 h-6 rounded-full hover:bg-black/5">
          <mat-icon class="!w-4 !h-4 !text-[18px] flex items-center justify-center">close</mat-icon>
        </button>
      </div>
    }
  `
})
export class ToastComponent {
  toastService = inject(ToastService);
}
