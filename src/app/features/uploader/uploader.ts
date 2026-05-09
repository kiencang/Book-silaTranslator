import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { BookStore } from '../../core/book.store';
import { ToastService } from '../../core/toast.service';
import { GeminiClient, parseGeminiError } from '../../core/gemini';
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
    <div class="flex-1 flex items-center justify-center min-h-[50vh] p-4">
      <div class="w-full max-w-2xl">
        
        @if (store.pdfTask(); as task) {
          <div class="bg-white border text-center border-gray-200 rounded-2xl p-8 shadow-sm">
            <h3 class="text-xl font-semibold mb-2">Đang chuyển đổi PDF</h3>
            <p class="text-sm text-gray-500 mb-6">Tài liệu: {{task.fileName}}</p>
            
            <div class="space-y-3 mb-6 text-left">
               @for (chunk of task.chunks; track chunk.index) {
                 <div class="flex items-center justify-between p-3 rounded-lg border" 
                      [class.bg-green-50]="chunk.status === 'completed'"
                      [class.border-green-200]="chunk.status === 'completed'"
                      [class.bg-blue-50]="chunk.status === 'processing'"
                      [class.border-blue-200]="chunk.status === 'processing'"
                      [class.bg-red-50]="chunk.status === 'failed'"
                      [class.border-red-200]="chunk.status === 'failed'"
                      [class.bg-gray-50]="chunk.status === 'pending'"
                      [class.border-gray-200]="chunk.status === 'pending'">
                   <span class="font-medium text-sm">Phần {{chunk.index + 1}}</span>
                   <div>
                     @if (chunk.status === 'completed') {
                       <span class="text-xs text-green-600 font-medium flex items-center gap-1"><mat-icon class="!w-[16px] !h-[16px] !text-[16px] flex items-center justify-center">check_circle</mat-icon> Hoàn tất</span>
                     }
                     @if (chunk.status === 'processing') {
                       <span class="text-xs text-blue-600 font-medium flex items-center gap-1"><mat-icon class="!w-[16px] !h-[16px] !text-[16px] flex items-center justify-center animate-spin">autorenew</mat-icon> Đang xử lý</span>
                     }
                     @if (chunk.status === 'failed') {
                       <span class="text-xs text-red-600 font-medium flex items-center gap-1"><mat-icon class="!w-[16px] !h-[16px] !text-[16px] flex items-center justify-center">error</mat-icon> Thất bại</span>
                     }
                     @if (chunk.status === 'pending') {
                       <span class="text-xs text-gray-500 font-medium">Chờ xử lý</span>
                     }
                   </div>
                 </div>
                 @if (chunk.status === 'failed' && chunk.error) {
                    <div class="text-xs text-red-500 mt-1 ml-1 text-left line-clamp-2">Lỗi: {{chunk.error}}</div>
                 }
               }
            </div>
            
            <div class="flex justify-center gap-4 border-t border-gray-100 pt-6">
              @if (isAllCompleted(task.chunks)) {
                <button (click)="finishPdfTask()" class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
                  <span>Chuyển sang bước kế tiếp</span>
                  <mat-icon class="!w-5 !h-5 !text-xl">arrow_forward</mat-icon>
                </button>
              } @else {
                <button (click)="resumePdfTask()" [disabled]="store.isConverting()" class="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                  <mat-icon class="!w-[20px] !h-[20px] !text-[20px] flex items-center justify-center">{{ store.isConverting() ? 'autorenew' : 'play_arrow' }}</mat-icon>
                  <span>{{ store.isConverting() ? 'Đang xử lý...' : 'Tiếp tục chuyển đổi' }}</span>
                </button>
              }
            </div>
          </div>
        } @else {
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
            accept=".txt,.html,.htm,.pdf,.md" 
            (change)="onFileSelected($event)" 
          />
          
          @if (store.isConverting()) {
            <div class="flex flex-col items-center justify-center space-y-4">
              <mat-icon class="animate-spin text-gray-500 w-12 h-12 text-5xl">autorenew</mat-icon>
              <h3 class="text-xl font-medium text-gray-900">Đang tạo tiến trình...</h3>
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
                  <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-mono">MD</span>
                  <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-mono">HTML</span>
                  <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-mono">PDF</span>
                </div>
              </div>
            </div>
          }
         </div>
        }
      </div>
    </div>
  `
})
export class Uploader {
  store = inject(BookStore);
  gemini = inject(GeminiClient);
  toast = inject(ToastService);
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

  isAllCompleted(chunks: import('../../core/db').PdfConversionChunk[]) {
    return chunks.every(c => c.status === 'completed');
  }

  finishPdfTask() {
    const task = this.store.pdfTask();
    if (!task) return;
    
    const combinedMarkdown = task.chunks.map(c => c.markdown || '').join('\n\n');
    this.store.setPdfTask(undefined);
    this.store.setMarkdown(combinedMarkdown, task.fileName);
    this.toast.success('Chuyển đổi PDF thành công!');
  }

  async resumePdfTask() {
    if (this.store.isConverting()) return;
    const task = this.store.pdfTask();
    if (!task) return;

    this.store.setConverting(true);

    try {
      // Create a copy of tasks to iterate over safely
      const chunks = [...task.chunks];
      
      for (let i = 0; i < chunks.length; i++) {
        // reload from signal in case of updates
        const currentTaskState = this.store.pdfTask();
        if (!currentTaskState) break; // cancelled
        
        const chunk = currentTaskState.chunks[i];
        if (chunk.status === 'completed') continue;

        // processing
        const updatedChunks = [...currentTaskState.chunks];
        updatedChunks[i] = { ...chunk, status: 'processing', error: undefined };
        this.store.setPdfTask({ ...currentTaskState, chunks: updatedChunks });
        
        try {
          if (!chunk.base64Pdf) throw new Error("Missing PDF data");
          
          let b64Data = chunk.base64Pdf;
          if (b64Data.includes(',')) b64Data = b64Data.split(',')[1];
          
          const markdown = await this.gemini.convertPdfToMarkdown(b64Data);
          
          const successTaskState = this.store.pdfTask();
          if (successTaskState) {
            const newChunks = [...successTaskState.chunks];
             newChunks[i] = { ...newChunks[i], status: 'completed', markdown, error: undefined };
            this.store.setPdfTask({ ...successTaskState, chunks: newChunks });
          }
        } catch (e: any) {
           console.error(e);
           const msg = parseGeminiError(e);
           const failTaskState = this.store.pdfTask();
           if (failTaskState) {
             const newChunks = [...failTaskState.chunks];
             newChunks[i] = { ...newChunks[i], status: 'failed', error: msg };
             this.store.setPdfTask({ ...failTaskState, chunks: newChunks });
           }
           this.store.setConverting(false);
           return; // Break processing on first error
        }
      }
    } finally {
      this.store.setConverting(false);
    }
  }

  async processFile(file: File) {
    if (this.store.isConverting()) return;
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    // File size validation
    const LIMITS: Record<string, number> = {
       'txt': 3 * 1024 * 1024,
       'md': 3 * 1024 * 1024,
       'html': 5 * 1024 * 1024,
       'htm': 5 * 1024 * 1024,
       'pdf': 50 * 1024 * 1024,
    };

    if (ext && ext in LIMITS) {
       const limit = LIMITS[ext];
       if (file.size > limit) {
         const limitMB = limit / (1024 * 1024);
         this.toast.error(this.toast.Messages.FILE_TOO_LARGE(limitMB, ext));
         this.fileInput().nativeElement.value = '';
         return;
       }
    }
    
    this.store.setConverting(true);
    let shouldResumePdf = false;
    
    try {
      if (!this.store.currentProjectId()) {
        await this.store.createNewProject(file.name.replace(/\.[^/.]+$/, ''));
      }

      if (file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.md')) {
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

        if (pageCount <= 50) {
          const base64 = await this.fileToBase64(file);
          const b64Data = base64.split(',')[1];
          const markdown = await this.gemini.convertPdfToMarkdown(b64Data);
          this.store.setMarkdown(markdown, file.name);
          this.toast.success(this.toast.Messages.FILE_PROCESS_SUCCESS);
        } else {
          // Large PDF -> chunk
          const CHUNK_SIZE = 50;
          const chunks: import('../../core/db').PdfConversionChunk[] = [];
          
          for (let i = 0; i < pageCount; i += CHUNK_SIZE) {
            const endPage = Math.min(i + CHUNK_SIZE, pageCount) - 1;
            const newPdf = await PDFDocument.create();
            const pageIndices = Array.from({ length: endPage - i + 1 }, (_, k) => k + i);
            const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
            copiedPages.forEach((page) => newPdf.addPage(page));
            const chunkBase64 = await newPdf.saveAsBase64({ dataUri: true });
            
            chunks.push({
               index: i / CHUNK_SIZE,
               base64Pdf: chunkBase64,
               status: 'pending'
            });
          }
          
          this.store.setPdfTask({
             fileName: file.name,
             chunks
          });
          
          shouldResumePdf = true;
        }
      } else {
        this.toast.error(this.toast.Messages.FILE_INVALID_FORMAT);
      }
    } catch (e: any) {
      console.error(e);
      let msg = parseGeminiError(e);
      this.toast.error(this.toast.Messages.FILE_PROCESS_ERROR(msg));
    } finally {
      this.store.setConverting(false);
      if (this.fileInput()) {
        this.fileInput().nativeElement.value = '';
      }
      if (shouldResumePdf) {
         this.resumePdfTask();
      }
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
