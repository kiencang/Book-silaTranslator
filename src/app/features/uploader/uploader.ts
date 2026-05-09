import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { BookStore } from '../../core/book.store';
import { GeminiClient } from '../../core/gemini';
import { MatIconModule } from '@angular/material/icon';
import TurndownService from 'turndown';
import { PDFDocument } from 'pdf-lib';

@Component({
  selector: 'app-uploader',
  standalone: true,
  imports: [MatIconModule],
  host: {
    class: 'flex-1 flex flex-col'
  },
  template: `
    <div class="flex-1 flex items-center justify-center min-h-[50vh]">
      <div class="w-full max-w-2xl">
        <div 
          class="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer relative"
        (click)="fileInput.click()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        [class.bg-gray-50]="isDragging"
        [class.border-gray-400]="isDragging"
        [class.opacity-50]="store.isConverting()"
        [class.pointer-events-none]="store.isConverting()"
      >
        <input 
          type="file" 
          #fileInput 
          class="hidden" 
          accept=".txt,.html,.htm,.pdf" 
          (change)="onFileSelected($event)" 
        />
        
        @if (store.isConverting()) {
          <div class="flex flex-col items-center justify-center space-y-4">
            <mat-icon class="animate-spin text-gray-500 w-12 h-12 text-5xl">autorenew</mat-icon>
            <h3 class="text-xl font-medium text-gray-900">Đang xử lý tài liệu...</h3>
            <p class="text-sm text-gray-500">Quá trình này có thể mất một lúc tùy thuộc vào dung lượng file.</p>
          </div>
        } @else {
          <div class="flex flex-col items-center space-y-4">
            <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <mat-icon class="!text-3xl !w-8 !h-8 !flex !items-center !justify-center">upload_file</mat-icon>
            </div>
            <div>
              <h3 class="text-lg font-medium text-gray-900">Tải lên cuốn sách cần dịch</h3>
              <p class="text-sm text-gray-500 mt-1">Click chọn hoặc kéo thả vào đây.</p>
              <div class="flex gap-2 justify-center mt-3">
                <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-mono">TXT</span>
                <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-mono">HTML</span>
                <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-mono">PDF</span>
              </div>
            </div>
          </div>
        }
      </div>
      </div>
    </div>
  `
})
export class Uploader {
  store = inject(BookStore);
  gemini = inject(GeminiClient);
  fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  
  isDragging = false;
  turndownService = new TurndownService().remove(['style', 'script', 'head', 'meta', 'title', 'noscript']);

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const items = event.dataTransfer?.items;
    if (items) {
      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) this.processFile(file);
          break;
        }
      }
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  async processFile(file: File) {
    if (this.store.isConverting()) return;
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    // File size validation
    const LIMITS: Record<string, number> = {
       'txt': 3 * 1024 * 1024,
       'html': 5 * 1024 * 1024,
       'htm': 5 * 1024 * 1024,
       'pdf': 50 * 1024 * 1024,
    };

    if (ext && ext in LIMITS) {
       const limit = LIMITS[ext];
       if (file.size > limit) {
         const limitMB = limit / (1024 * 1024);
         this.store.showToast(`Dung lượng file vượt giới hạn (${limitMB}MB đối với file .${ext}). Vui lòng chọn file nhẹ hơn.`);
         this.fileInput().nativeElement.value = '';
         return;
       }
    }
    
    this.store.setConverting(true);
    
    try {
      if (file.name.toLowerCase().endsWith('.txt')) {
        const text = await file.text();
        this.store.setMarkdown(text, file.name);
      } else if (file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm')) {
        const text = await file.text();
        const markdown = this.turndownService.turndown(text);
        this.store.setMarkdown(markdown, file.name);
      } else if (file.name.toLowerCase().endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pageCount = pdfDoc.getPageCount();

        let markdown = '';
        
        if (pageCount <= 50) {
          const base64 = await this.fileToBase64(file);
          const b64Data = base64.split(',')[1];
          markdown = await this.gemini.convertPdfToMarkdown(b64Data);
        } else {
          const CHUNK_SIZE = 50;
          for (let i = 0; i < pageCount; i += CHUNK_SIZE) {
            const endPage = Math.min(i + CHUNK_SIZE, pageCount) - 1;
            this.store.showToast(`Đang xử lý trang ${i + 1} đến ${endPage + 1} / ${pageCount}...`);
            const newPdf = await PDFDocument.create();
            const pageIndices = Array.from({ length: endPage - i + 1 }, (_, k) => k + i);
            const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
            copiedPages.forEach((page) => newPdf.addPage(page));
            const chunkBase64 = await newPdf.saveAsBase64();
            
            const chunkMarkdown = await this.gemini.convertPdfToMarkdown(chunkBase64);
            markdown += chunkMarkdown + '\n\n';
          }
        }
        
        this.store.setMarkdown(markdown, file.name);
      } else {
        this.store.showToast('Định dạng file không được hỗ trợ. Vui lòng tải lên file TXT, HTML hoặc PDF.');
      }
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      this.store.showToast('Lỗi khi xử lý file: ' + msg);
    } finally {
      this.store.setConverting(false);
      this.fileInput().nativeElement.value = '';
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
}
