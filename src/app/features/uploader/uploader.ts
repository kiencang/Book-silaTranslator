import { Component, ElementRef, inject, viewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BookStore } from '../../core/book.store';
import { ToastService } from '../../core/toast.service';
import { GeminiClient, parseGeminiError } from '../../core/gemini';
import { MatIconModule } from '@angular/material/icon';
import TurndownService from 'turndown';
import { PDFDocument } from 'pdf-lib';

@Component({
  selector: 'app-uploader',
  standalone: true,
  imports: [MatIconModule, FormsModule, CommonModule],
  host: {
    class: 'flex-1 flex flex-col'
  },
  template: `
    <div class="flex-1 flex items-center justify-center min-h-[50vh] p-4">
      <div class="w-full max-w-2xl">
        
        @if (pendingPdfFile(); as pFile) {
          <div class="bg-white border text-center border-zinc-200 rounded-2xl p-8 shadow-sm max-w-md mx-auto">
            <h3 class="text-xl font-semibold text-zinc-800 mb-1 truncate" [title]="pFile.name">{{pFile.name}}</h3>
            <p class="text-sm text-zinc-500 mb-8">{{ pdfFileSizeMB() }}</p>

            <div class="border border-zinc-200 rounded-xl p-4 mb-8 bg-zinc-50/50">
              <div class="flex items-center gap-2 mb-3 text-zinc-700 font-medium text-[15px]">
                <mat-icon class="!w-[20px] !h-[20px] !text-[20px]">content_cut</mat-icon>
                <span>Cắt trang (Tổng: {{ pdfTotalPages() }})</span>
              </div>
              <div class="flex items-center gap-3">
                <div class="flex-1 flex items-center bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-sm focus-within:border-indigo-500 transition-colors">
                  <span class="text-sm text-zinc-500 w-8">Từ</span>
                  <input type="number" min="1" [max]="pdfEndPage()" [(ngModel)]="pdfStartPage" (ngModelChange)="onPageChange()" class="w-full text-center outline-none bg-transparent font-medium text-zinc-800">
                </div>
                <span class="text-zinc-300 font-medium">-</span>
                <div class="flex-1 flex items-center bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-sm focus-within:border-indigo-500 transition-colors">
                  <span class="text-sm text-zinc-500 w-8">Đến</span>
                  <input type="number" [min]="pdfStartPage()" [max]="pdfTotalPages()" [(ngModel)]="pdfEndPage" (ngModelChange)="onPageChange()" class="w-full text-center outline-none bg-transparent font-medium text-zinc-800">
                </div>
              </div>
            </div>

            <div class="text-left mb-8 relative">
              <label class="block text-sm font-medium text-zinc-700 mb-2">
                Chọn model xử lý
                <select [(ngModel)]="pdfModel" (ngModelChange)="onModelChange()" class="mt-2 w-full px-4 pr-10 py-3 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors appearance-none font-normal text-base">
                  <option value="gemini-flash-lite-latest">Lite (rẻ & nhanh nhất)</option>
                  <option value="gemini-flash-latest">Flash (cho nội dung trình bày phức tạp)</option>
                </select>
              </label>
              <div class="pointer-events-none absolute inset-y-0 right-0 top-[36px] pl-2 pr-4 flex items-center text-zinc-500">
                <mat-icon class="!w-5 !h-5 !text-[20px]">expand_more</mat-icon>
              </div>
            </div>

            <div class="mb-8">
              <div class="flex justify-between text-xs font-semibold uppercase tracking-wider mb-2">
                <span class="text-zinc-500">Token Usage</span>
                @if (isCountingTokens()) {
                   <span class="text-indigo-500 flex items-center gap-1">
                     <mat-icon class="!w-3 !h-3 !text-[12px] animate-spin">autorenew</mat-icon> Đang tính...
                   </span>
                } @else if (tokenCountError()) {
                   <span class="text-red-500">{{ tokenCountError() }}</span>
                } @else {
                   <span [class.text-red-500]="(tokenCount() || 0) > 1000000" class="text-emerald-600">
                     {{ formattedTokenCount() }} / 1M
                   </span>
                }
              </div>
              <div class="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                 @if (isCountingTokens()) {
                   <div class="h-full bg-indigo-500/50 w-full animate-pulse transition-all"></div>
                 } @else {
                   <div class="h-full transition-all duration-500"
                        [class.bg-emerald-500]="(tokenCount() || 0) <= 1000000"
                        [class.bg-red-500]="(tokenCount() || 0) > 1000000"
                        [style.width.%]="tokenPercentage()">
                   </div>
                 }
              </div>
            </div>

            <div class="flex flex-col gap-3">
              <button (click)="startPdfConversion(pFile)" [disabled]="store.isConverting() || isCountingTokens() || (tokenCount() || 0) > 1000000" class="w-full justify-center flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                @if (store.isConverting()) {
                  <mat-icon class="!w-[20px] !h-[20px] !text-[20px] flex items-center justify-center animate-spin">autorenew</mat-icon>
                  <span>Đang xử lý...</span>
                } @else {
                  <span>Bắt đầu xử lý PDF</span>
                }
              </button>
              <button (click)="cancelPdfPending()" [disabled]="store.isConverting()" class="w-full justify-center flex items-center gap-2 px-6 py-3 rounded-lg border border-zinc-200 font-medium text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50">
                <mat-icon class="!w-[20px] !h-[20px] !text-[20px] flex items-center justify-center">insert_drive_file</mat-icon>
                Chọn file khác
              </button>
            </div>
            
            <p class="mt-6 text-[13px] text-zinc-400 italic text-left leading-relaxed">
              Tài liệu PDF trước khi dịch sẽ được <strong class="font-medium text-zinc-500">chuyển sang định dạng thân thiện với AI hơn</strong>. Việc này có thể dễ dàng thực hiện với các model thấp để có tốc độ cao và tiết kiệm ngưỡng miễn phí (giúp bạn dùng miễn phí được nhiều hơn). Khi tiến hành dịch thuật chính thức bạn có tùy chọn với các model AI cao nhất để có chất lượng dịch tốt nhất.
            </p>
          </div>
        } @else if (store.pdfTask(); as task) {
          <div class="bg-white border text-center border-zinc-200 rounded-2xl p-8 shadow-sm">
            <h3 class="text-xl font-semibold mb-2">Đang chuyển đổi PDF</h3>
            <p class="text-sm text-zinc-500 mb-6">Tài liệu: {{task.fileName}}</p>
            
            <div class="space-y-3 mb-6 text-left">
               @for (chunk of task.chunks; track chunk.index) {
                 <div class="flex items-center justify-between p-3 rounded-lg border" 
                      [class.bg-green-50]="chunk.status === 'completed'"
                      [class.border-green-200]="chunk.status === 'completed'"
                      [class.bg-indigo-50]="chunk.status === 'processing'"
                      [class.border-indigo-200]="chunk.status === 'processing'"
                      [class.bg-red-50]="chunk.status === 'failed'"
                      [class.border-red-200]="chunk.status === 'failed'"
                      [class.bg-zinc-50]="chunk.status === 'pending'"
                      [class.border-zinc-200]="chunk.status === 'pending'">
                   <span class="font-medium text-sm">Phần {{chunk.index + 1}}</span>
                   <div>
                     @if (chunk.status === 'completed') {
                       <span class="text-xs text-green-600 font-medium flex items-center gap-1"><mat-icon class="!w-[16px] !h-[16px] !text-[16px] flex items-center justify-center">check_circle</mat-icon> Hoàn tất</span>
                     }
                     @if (chunk.status === 'processing') {
                       <span class="text-xs text-indigo-600 font-medium flex items-center gap-1"><mat-icon class="!w-[16px] !h-[16px] !text-[16px] flex items-center justify-center animate-spin">autorenew</mat-icon> Đang xử lý</span>
                     }
                     @if (chunk.status === 'failed') {
                       <span class="text-xs text-red-600 font-medium flex items-center gap-1"><mat-icon class="!w-[16px] !h-[16px] !text-[16px] flex items-center justify-center">error</mat-icon> Thất bại</span>
                     }
                     @if (chunk.status === 'pending') {
                       <span class="text-xs text-zinc-500 font-medium">Chờ xử lý</span>
                     }
                   </div>
                 </div>
                 @if (chunk.status === 'failed' && chunk.error) {
                    <div class="text-xs text-red-500 mt-1 ml-1 text-left line-clamp-2">Lỗi: {{chunk.error}}</div>
                 }
               }
            </div>
            
            <div class="flex justify-center gap-4 border-t border-zinc-100 pt-6">
              @if (isAllCompleted(task.chunks)) {
                <button (click)="finishPdfTask()" class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
                  <span>Chuyển sang bước kế tiếp</span>
                  <mat-icon class="!w-5 !h-5 !text-xl">arrow_forward</mat-icon>
                </button>
              } @else {
                <button (click)="resumePdfTask()" [disabled]="store.isConverting()" class="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                  <mat-icon class="!w-[20px] !h-[20px] !text-[20px] flex items-center justify-center">{{ store.isConverting() ? 'autorenew' : 'play_arrow' }}</mat-icon>
                  <span>{{ store.isConverting() ? 'Đang xử lý...' : 'Tiếp tục chuyển đổi' }}</span>
                </button>
              }
            </div>
          </div>
        } @else {
          <div 
            class="border-2 border-dashed border-zinc-300 rounded-2xl p-12 text-center hover:bg-zinc-50 hover:border-zinc-400 transition-colors cursor-pointer relative group"
          role="button"
          tabindex="0"
          (keydown.enter)="fileInput.click()"
          (click)="fileInput.click()"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
          (drop)="onDrop($event)"
          [class.bg-zinc-50]="isDragging"
          [class.border-zinc-400]="isDragging"
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
              <mat-icon class="animate-spin text-zinc-500 w-12 h-12 text-5xl">autorenew</mat-icon>
              <h3 class="text-xl font-medium text-zinc-900">Đang tạo tiến trình...</h3>
              <p class="text-sm text-zinc-500">Quá trình này có thể mất một lúc tùy thuộc vào dung lượng file.</p>
            </div>
          } @else {
            <div class="flex flex-col items-center space-y-4">
              <div class="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                <mat-icon class="!text-3xl !w-8 !h-8 !flex !items-center !justify-center">upload_file</mat-icon>
              </div>
              <div>
                <h3 class="text-lg font-medium text-zinc-900">Tải lên cuốn sách cần dịch</h3>
                <p class="text-sm text-zinc-500 mt-1">Click chọn hoặc kéo thả vào đây.</p>
                <div class="flex flex-wrap gap-2 justify-center mt-4">
                  <span class="px-2 py-1 bg-zinc-100 group-hover:bg-zinc-200 text-zinc-600 group-hover:text-zinc-900 text-xs rounded-md font-mono transition-colors">HTML (5MB)</span>
                  <span class="px-2 py-1 bg-zinc-100 group-hover:bg-zinc-200 text-zinc-600 group-hover:text-zinc-900 text-xs rounded-md font-mono transition-colors">PDF (50MB)</span>
                  <span class="px-2 py-1 bg-zinc-100 group-hover:bg-zinc-200 text-zinc-600 group-hover:text-zinc-900 text-xs rounded-md font-mono transition-colors">TXT (3MB)</span>
                  <span class="px-2 py-1 bg-zinc-100 group-hover:bg-zinc-200 text-zinc-600 group-hover:text-zinc-900 text-xs rounded-md font-mono transition-colors">MARKDOWN (3MB)</span>
                </div>
                <div class="mt-5 pt-4 border-t border-zinc-100">
                  <p class="text-xs text-zinc-400 flex items-center justify-center gap-1">
                    <mat-icon class="!w-[14px] !h-[14px] !text-[14px]">info</mat-icon>
                    Giới hạn xử lý tối đa: <span class="font-medium text-zinc-500">1M Tokens</span>
                  </p>
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

  pendingPdfFile = signal<File | null>(null);
  pdfModel = signal<string>('gemini-flash-lite-latest');
  
  pdfFileSizeMB = signal<string | null>(null);
  pdfTotalPages = signal<number>(0);
  pdfStartPage = signal<number>(1);
  pdfEndPage = signal<number>(0);
  tokenCount = signal<number | null>(null);
  isCountingTokens = signal<boolean>(false);
  tokenCountError = signal<string | null>(null);
  
  countTokensTimeout: any;

  tokenPercentage() {
    return Math.min(100, (this.tokenCount() || 0) / 10000);
  }

  formattedTokenCount(): string {
    const count = this.tokenCount() || 0;
    if (count === 0) return '0';
    if (count < 1000) return count.toString();
    return Math.round(count / 1000) + 'K';
  }

  cancelPdfPending() {
     this.pendingPdfFile.set(null);
     this.pdfFileSizeMB.set(null);
     this.tokenCount.set(null);
     this.isCountingTokens.set(false);
     this.tokenCountError.set(null);
     if (this.fileInput()) {
       this.fileInput().nativeElement.value = '';
     }
  }

  onPageChange() {
    this.triggerTokenCount();
  }

  onModelChange() {
    this.triggerTokenCount();
  }

  triggerTokenCount() {
    clearTimeout(this.countTokensTimeout);
    this.countTokensTimeout = setTimeout(() => {
      this.calculateTokens();
    }, 1000);
  }

  async calculateTokens() {
    const file = this.pendingPdfFile();
    if (!file) return;

    this.isCountingTokens.set(true);
    this.tokenCountError.set(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      const start = Math.max(1, this.pdfStartPage());
      const end = Math.min(this.pdfTotalPages(), this.pdfEndPage());
      
      if (start > end) {
        this.isCountingTokens.set(false);
        this.tokenCount.set(0);
        return;
      }

      const newPdf = await PDFDocument.create();
      const pageIndices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
      const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach((page) => newPdf.addPage(page));
      
      const b64Data = await newPdf.saveAsBase64();
      
      const count = await this.gemini.countTokens(b64Data, 'application/pdf', this.pdfModel());
      this.tokenCount.set(count);
    } catch (e) {
      console.error('Lỗi khi đếm token:', e);
      this.tokenCountError.set('Không thể đếm Token');
    } finally {
      this.isCountingTokens.set(false);
    }
  }

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
        this.store.updateTaskBatch('pdfTask', { ...currentTaskState, chunks: updatedChunks }, [i]);
        
        try {
          if (!chunk.pdfData && !(chunk as any).base64Pdf) throw new Error("Missing PDF data");
          
          let b64Data: string;
          if (chunk.pdfData) {
            b64Data = await this.uint8ArrayToBase64(chunk.pdfData);
          } else {
            b64Data = (chunk as any).base64Pdf;
            if (b64Data.includes(',')) b64Data = b64Data.split(',')[1];
          }
          
          const markdown = await this.gemini.convertPdfToMarkdown(b64Data, this.pdfModel());
          
          const successTaskState = this.store.pdfTask();
          if (successTaskState) {
            const newChunks = [...successTaskState.chunks];
             newChunks[i] = { ...newChunks[i], status: 'completed', markdown, error: undefined };
            this.store.updateTaskBatch('pdfTask', { ...successTaskState, chunks: newChunks }, [i]);
          }
        } catch (e: unknown) {
           console.error(e);
           const msg = parseGeminiError(e);
           const failTaskState = this.store.pdfTask();
           if (failTaskState) {
             const newChunks = [...failTaskState.chunks];
             newChunks[i] = { ...newChunks[i], status: 'failed', error: msg };
             this.store.updateTaskBatch('pdfTask', { ...failTaskState, chunks: newChunks }, [i]);
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
    
    if (ext === 'pdf') {
       this.pendingPdfFile.set(file);
       this.pdfFileSizeMB.set((file.size / (1024 * 1024)).toFixed(2) + ' MB');
       if (this.fileInput()) {
         this.fileInput().nativeElement.value = '';
       }
       
       this.isCountingTokens.set(true);
       file.arrayBuffer().then(buffer => PDFDocument.load(buffer)).then(pdfDoc => {
         const count = pdfDoc.getPageCount();
         this.pdfTotalPages.set(count);
         this.pdfStartPage.set(1);
         this.pdfEndPage.set(count);
         this.triggerTokenCount();
       }).catch(e => {
         console.error('Failed to parse PDF', e);
         this.isCountingTokens.set(false);
         this.tokenCountError.set('Lỗi đọc PDF');
       });

       return;
    }

    this.store.setConverting(true);
    
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
      } else {
        this.toast.error(this.toast.Messages.FILE_INVALID_FORMAT);
      }
    } catch (e: unknown) {
      console.error(e);
      const msg = parseGeminiError(e);
      this.toast.error(this.toast.Messages.FILE_PROCESS_ERROR(msg));
    } finally {
      this.store.setConverting(false);
      if (this.fileInput()) {
        this.fileInput().nativeElement.value = '';
      }
    }
  }

  async startPdfConversion(file: File) {
    if (this.store.isConverting()) return;
    this.store.setConverting(true);
    let shouldResumePdf = false;
    
    // Nhường quyền cho UI render trạng thái loading trước khi thực hiện tác vụ nặng
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
      if (!this.store.currentProjectId()) {
        await this.store.createNewProject(file.name.replace(/\.[^/.]+$/, ''));
      }

      const arrayBuffer = await file.arrayBuffer();
      const originalPdfDoc = await PDFDocument.load(arrayBuffer);
      
      const start = Math.max(1, this.pdfStartPage());
      const end = Math.min(this.pdfTotalPages(), this.pdfEndPage());
      
      const pdfDoc = await PDFDocument.create();
      const pageIndices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
      const copiedPages = await pdfDoc.copyPages(originalPdfDoc, pageIndices);
      copiedPages.forEach((page) => pdfDoc.addPage(page));
      
      const pageCount = pdfDoc.getPageCount();

      if (pageCount <= 30) {
        const base64 = await pdfDoc.saveAsBase64();
        const b64Data = base64.includes(',') ? base64.split(',')[1] : base64;
        const markdown = await this.gemini.convertPdfToMarkdown(b64Data, this.pdfModel());
        this.store.setMarkdown(markdown, file.name);
        this.toast.success(this.toast.Messages.FILE_PROCESS_SUCCESS);
      } else {
        // Large PDF -> chunk
        const CHUNK_SIZE = 30;
        const chunks: import('../../core/db').PdfConversionChunk[] = [];
        
        for (let i = 0; i < pageCount; i += CHUNK_SIZE) {
          const endPage = Math.min(i + CHUNK_SIZE, pageCount) - 1;
          const newPdf = await PDFDocument.create();
          const chunkIndices = Array.from({ length: endPage - i + 1 }, (_, k) => k + i);
          const copiedPages = await newPdf.copyPages(pdfDoc, chunkIndices);
          copiedPages.forEach((page) => newPdf.addPage(page));
          const chunkData = await newPdf.save();
          
          chunks.push({
             index: i / CHUNK_SIZE,
             pdfData: chunkData,
             status: 'pending'
          });
        }
        
        this.store.setPdfTask({
           fileName: file.name,
           chunks
        });
        
        shouldResumePdf = true;
      }
    } catch (e: unknown) {
      console.error(e);
      const msg = parseGeminiError(e);
      this.toast.error(this.toast.Messages.FILE_PROCESS_ERROR(msg));
    } finally {
      this.pendingPdfFile.set(null);
      this.store.setConverting(false);
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

  private uint8ArrayToBase64(uint8Array: Uint8Array): Promise<string> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([uint8Array as unknown as BlobPart], { type: 'application/pdf' });
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
