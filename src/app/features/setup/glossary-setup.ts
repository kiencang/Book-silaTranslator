import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookStore } from '../../core/book.store';
import { ToastService } from '../../core/toast.service';
import { GeminiClient, parseGeminiError } from '../../core/gemini';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MarkdownTableEditorComponent } from '../../shared/components/markdown-table-editor.component';
import { smartHardSplit } from '../splitter/splitter.util';

@Component({
  selector: 'app-glossary-setup',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, MarkdownTableEditorComponent],
  template: `
    <div class="max-w-7xl mx-auto py-8 lg:px-8 px-4">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-2xl font-bold text-zinc-900">Thiết lập Bảng Thuật Ngữ / Từ Khó (Tùy chọn)</h2>
          <p class="text-zinc-500 mt-1">Sử dụng mô hình AI mạnh để quét cuốn sách và trích xuất bảng thuật ngữ/từ khó dịch. Giúp bản dịch có chất lượng cao và thống nhất hơn. Đặc biệt cần thiết với sách khó dịch. Mặc dù đây là tùy chọn, không bắt buộc, nhưng khi tạo thường cho kết quả tốt hơn với bất kỳ thể loại sách nào.</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 mb-8">
        <div class="space-y-6">
          <div class="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-4">
            <div class="flex flex-col sm:flex-row gap-4">
              <div class="flex-1">
                <label for="glossaryModel" class="block text-xs font-semibold text-zinc-700 uppercase tracking-widest mb-2">Mô hình nhận diện</label>
                <select id="glossaryModel" [value]="glossaryModel()" (change)="glossaryModel.set($any($event.target).value)" [disabled]="isGenerating() || !!glossaryTask()" class="w-full pl-3 pr-8 py-2 text-sm border-zinc-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg border disabled:cursor-not-allowed">
                  <option value="gemini-flash-latest">Flash (Nhanh & Tiết kiệm)</option>
                  <option value="gemini-pro-latest">Pro (Tư duy sâu & Chuẩn xác)</option>
                </select>
              </div>
            </div>
            
            <div class="space-y-3">
              @if (glossaryTask() && !isGenerating()) {
                <div class="text-sm text-amber-700 bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <p class="font-medium mb-1">Tiến trình bị gián đoạn</p>
                  <p class="text-amber-600">Bạn có một tiến trình tạo bảng thuật ngữ đang dở dang (đã hoàn thành {{ completedChunksCount() }}/{{ glossaryTask()?.totalChunks }} phần). Bạn có thể tiếp tục hoặc hủy bỏ để bắt đầu lại.</p>
                </div>
                <div class="flex gap-3">
                  <button 
                    (click)="resumeGeneration()"
                    [disabled]="isGenerating()"
                    class="flex-1 flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <mat-icon class="mr-2 !w-5 !h-5 !text-[20px]">play_circle</mat-icon>
                    Tiếp tục quá trình tạo ({{ completedChunksCount() }}/{{ glossaryTask()?.totalChunks }})
                  </button>
                  <button 
                    (click)="cancelTask()"
                    [disabled]="isGenerating()"
                    class="px-4 py-2 border border-red-200 text-sm font-medium rounded-lg shadow-sm text-red-600 bg-white hover:bg-red-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Hủy tiến trình cũ
                  </button>
                </div>
              } @else {
                <button 
                  (click)="startGeneration()"
                  [disabled]="isGenerating()"
                  class="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
                >
                  @if (isGenerating()) {
                    <mat-icon class="animate-spin mr-2 !w-5 !h-5 !text-[20px]">sync</mat-icon>
                    {{ generationStatus() || 'Đang phân tích sách và tạo bảng thuật ngữ...' }}
                  } @else if (draftTable().trim().length > 0) {
                    <mat-icon class="mr-2 !w-5 !h-5 !text-[20px]">refresh</mat-icon>
                    Tạo lại bảng dữ liệu Thuật ngữ
                  } @else {
                    <mat-icon class="mr-2 !w-5 !h-5 !text-[20px]">auto_awesome</mat-icon>
                    Bắt đầu tạo bảng Thuật ngữ tự động
                  }
                </button>
              }
            </div>
          </div>

          <div class="mt-8">
            <app-markdown-table-editor
              [value]="draftTable()"
              (valueChange)="onTableChange($event)"
              [disabled]="isGenerating()"
              placeholder="Ví dụ:&#10;| Tiếng Anh | Từ loại | Tiếng Việt | Ghi chú văn cảnh |&#10;|---|---|---|---|&#10;| Hogwarts | Noun | Hogwarts | Trường đào tạo phù thủy |"
            >
              @if (store.glossaryVersions().length > 0) {
                <div class="flex items-center justify-between py-2 border-b border-zinc-100 mb-2">
                  <div class="flex items-center space-x-2">
                    @for (v of store.glossaryVersions(); track v.id; let i = $index) {
                      <button 
                        (click)="selectVersion(v)"
                        [class.bg-indigo-50]="store.activeGlossaryVersionId() === v.id"
                        [class.text-indigo-700]="store.activeGlossaryVersionId() === v.id"
                        [class.border-indigo-200]="store.activeGlossaryVersionId() === v.id"
                        [class.bg-white]="store.activeGlossaryVersionId() !== v.id"
                        [class.text-zinc-600]="store.activeGlossaryVersionId() !== v.id"
                        [class.border-zinc-200]="store.activeGlossaryVersionId() !== v.id"
                        class="px-3 py-1 text-xs font-medium border rounded-md transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        V{{ v.versionNumber }}
                      </button>
                    }
                  </div>
                  @if (activeVersion()) {
                    <div class="flex items-center space-x-3 text-xs text-zinc-500">
                      <span class="flex items-center" title="Model"><mat-icon class="!w-4 !h-4 !text-[16px] mr-1">model_training</mat-icon> {{ activeVersion()?.model === 'gemini-pro-latest' ? 'Pro' : 'Flash' }}</span>
                      <span class="flex items-center" title="Temperature"><mat-icon class="!w-4 !h-4 !text-[16px] mr-1">thermostat</mat-icon> {{ activeVersion()?.temperature }}</span>
                      <span class="flex items-center" title="Thời gian"><mat-icon class="!w-4 !h-4 !text-[16px] mr-1">schedule</mat-icon> {{ activeVersion()?.timestamp | date:'HH:mm:ss dd/MM' }}</span>
                    </div>
                  }
                </div>
              }
            </app-markdown-table-editor>
          </div>
        </div>
      </div>

      <div class="flex justify-between items-center">
        <button 
          (click)="skipAndContinue()"
          [disabled]="isGenerating()"
          class="flex items-center space-x-2 text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 px-6 py-3 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
        >
          <span>Bỏ qua phần này</span>
          <mat-icon class="!w-5 !h-5 !text-xl !flex !items-center !justify-center">fast_forward</mat-icon>
        </button>

        <button 
          (click)="saveChanges()"
          [disabled]="isGenerating() || !isManuallyEdited()"
          class="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mx-4"
        >
          <span>Lưu thay đổi</span>
          <mat-icon class="!w-5 !h-5 !text-xl !flex !items-center !justify-center">save</mat-icon>
        </button>

        <button 
          (click)="saveAndContinue()"
          [disabled]="isGenerating() || store.glossaryVersions().length === 0"
          class="flex items-center space-x-2 bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
        >
          <span>Tiếp tục</span>
          <mat-icon class="!w-5 !h-5 !text-xl !flex !items-center !justify-center">arrow_forward</mat-icon>
        </button>
      </div>
    </div>
  `
})
export class GlossarySetup {
  store = inject(BookStore);
  gemini = inject(GeminiClient);
  toast = inject(ToastService);

  isGenerating = signal<boolean>(false);
  generationStatus = signal<string>('');
  draftTable = signal<string>('');
  
  glossaryTask = this.store.glossaryTask;
  completedChunksCount = computed(() => this.glossaryTask()?.chunks.filter(c => c.status === 'completed').length || 0);

  glossaryModel = signal<string>(this.store.glossaryTask()?.model ?? this.store.config().glossaryGenModel ?? 'gemini-pro-latest');
  isManuallyEdited = signal<boolean>(false);

  constructor() {
    effect(() => {
      const activeContent = this.store.glossaryTable();
      if (!this.isManuallyEdited()) {
        this.draftTable.set(activeContent);
      }
    });
  }

  activeVersion() {
    const id = this.store.activeGlossaryVersionId();
    if (!id) return null;
    return this.store.glossaryVersions().find(v => v.id === id);
  }

  selectVersion(v: import('../../core/db').ContentVersion) {
    this.store.selectGlossaryVersion(v.id);
    this.draftTable.set(v.content);
    this.isManuallyEdited.set(false);
  }

  onTableChange(val: string) {
    this.draftTable.set(val);
    this.isManuallyEdited.set(true);
  }

  cancelTask() {
    this.store.setGlossaryTask(undefined);
  }

  getFullText() {
    let fullText = '';
    const chapters = this.store.chapters();
    if (chapters && chapters.length > 0) {
       fullText = chapters.filter(c => !c.excludeFromTranslation).map(c => c.title + '\n' + c.originalText).join('\n\n');
    } else {
       fullText = this.store.rawMarkdown() || '';
    }
    return fullText;
  }

  async startGeneration() {
    const fullText = this.getFullText();

    if (!fullText) {
       this.toast.error(this.toast.Messages.NO_CONTENT_TO_ANALYZE);
       return;
    }

    const maxWordsPerChunk = 10000;
    const chunkTexts = smartHardSplit(fullText, maxWordsPerChunk);
    
    this.store.setGlossaryTask({
      status: 'processing',
      model: this.glossaryModel(),
      totalChunks: chunkTexts.length,
      chunks: chunkTexts.map((text, i) => ({
        index: i,
        text,
        status: 'pending'
      }))
    });

    await this.processGlossaryTask();
  }

  async resumeGeneration() {
    const task = this.store.glossaryTask();
    if (task) {
      this.glossaryModel.set(task.model);
      await this.processGlossaryTask();
    }
  }

  async processGlossaryTask() {
    const task = this.store.glossaryTask();
    if (!task) return;

    try {
      this.isGenerating.set(true);
      this.store.isGeneratingMetadata.set(true);
      
      this.store.updateConfig({
        glossaryGenModel: task.model
      });

      const isProModel = task.model.includes('pro');
      const maxConcurrent = isProModel ? 2 : 4;
      
      const chunksToProcess = task.chunks.filter(c => c.status !== 'completed');
      
      this.generationStatus.set(`Đang tiếp tục phân tích... (${task.chunks.length - chunksToProcess.length}/${task.totalChunks})`);

      for (let i = 0; i < chunksToProcess.length; i += maxConcurrent) {
        const batch = chunksToProcess.slice(i, i + maxConcurrent);
        const promises = batch.map(async chunk => {
          try {
            const result = await this.gemini.generateGlossaryRaw(chunk.text, task.model, this.store.bookTitle(), this.store.author(), 0.2);
            chunk.result = result;
            chunk.status = 'completed';
          } catch (err) {
            chunk.status = 'error';
            throw err;
          }
        });
        
        await Promise.all(promises);
        
        // Save intermediate state
        this.store.setGlossaryTask({ ...task });
        
        const completedCount = task.chunks.filter(c => c.status === 'completed').length;
        this.generationStatus.set(`Đang nhận diện Thuật ngữ (${completedCount}/${task.totalChunks})...`);
      }

      // If all completed, generate final
      const allCompleted = task.chunks.every(c => c.status === 'completed');
      if (allCompleted) {
        this.generationStatus.set('Đang tổng hợp bảng thuật ngữ...');
        const allGlossaryItems = task.chunks.flatMap(c => Array.isArray(c.result) ? c.result : []);
        
        // Deduplicate by english + pos
        const uniqueItems = new Map<string, any>();
        for (const item of allGlossaryItems) {
          if (!item.english) continue;
          const key = `${String(item.english).toLowerCase().trim()}_${String(item.pos || '').toLowerCase().trim()}`;
          if (!uniqueItems.has(key)) {
            uniqueItems.set(key, item);
          }
        }
        
        const deduplicatedGlossary = Array.from(uniqueItems.values());
        deduplicatedGlossary.sort((a, b) => String(a.english).localeCompare(String(b.english)));

        let result = '';
        if (deduplicatedGlossary.length > 0) {
          result = '| Tiếng Anh | Từ loại | Tiếng Việt | Ghi chú văn cảnh |\n|---|---|---|---|\n';
          for (const pt of deduplicatedGlossary) {
            result += `| ${pt.english || ''} | ${pt.pos || ''} | ${pt.vietnamese || ''} | ${pt.contextNotes || ''} |\n`;
          }
        }

        this.draftTable.set(result);
        this.isManuallyEdited.set(false);
        this.store.addGlossaryVersion(result, task.model, 0.2);
        this.store.saveGlossaryConf(true);
        this.store.setGlossaryTask(undefined);
        this.toast.success(this.toast.Messages.GLOSSARY_SUCCESS);
      }
    } catch (e: unknown) {
      console.error(e);
      this.store.setGlossaryTask({ ...task, status: 'error' });
      this.toast.error(this.toast.Messages.GLOSSARY_ERROR(parseGeminiError(e)));
    } finally {
      this.isGenerating.set(false);
      this.store.isGeneratingMetadata.set(false);
    }
  }

  saveChanges() {
    if (this.isManuallyEdited()) {
      const active = this.activeVersion();
      const model = active ? active.model : this.glossaryModel();
      const temp = active ? active.temperature : 0.2;
      this.store.addGlossaryVersion(this.draftTable(), model, temp);
      this.store.saveGlossaryConf(true);
      this.isManuallyEdited.set(false);
      this.toast.success('Đã lưu version mới');
    }
  }

  saveAndContinue() {
    if (this.isManuallyEdited()) {
      this.saveChanges();
    }
    this.store.saveGlossaryConf(true);
    this.store.phase.set(5);
  }

  skipAndContinue() {
    this.store.saveGlossaryConf(false);
    this.store.phase.set(5);
  }
}
