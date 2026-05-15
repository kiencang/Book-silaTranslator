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
  selector: 'app-pronoun-setup',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, MarkdownTableEditorComponent],
  template: `
    <div class="max-w-7xl mx-auto py-8 lg:px-8 px-4">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-2xl font-bold text-zinc-900">Thiết lập Đại từ Nhân xưng (Tùy chọn)</h2>
          <p class="text-zinc-500 mt-1">Sử dụng mô hình AI mạnh để phân tích nội dung truyện giúp xây dựng bảng đại từ nhân xưng hoàn chỉnh, nhằm đảm bảo nhất quán khi dịch & phù hợp hơn với văn hóa người Việt. Đặc biệt cần thiết cho thể loại tiểu thuyết, truyện ngắn. Các loại sách khác có thể không cần thiết.</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 mb-8">
        <div class="space-y-6">
          <div class="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-4">
            <div class="flex flex-col sm:flex-row gap-4">
              <div class="flex-1">
                <label for="pronounModel" class="block text-xs font-semibold text-zinc-700 uppercase tracking-widest mb-2">Mô hình nhận diện</label>
                <select id="pronounModel" [value]="pronounModel()" (change)="pronounModel.set($any($event.target).value)" [disabled]="isGeneratingPronouns() || !!pronounTask()" class="w-full pl-3 pr-8 py-2 text-sm border-zinc-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg border disabled:cursor-not-allowed">
                  <option value="gemini-flash-latest">Flash (Nhanh & Tiết kiệm)</option>
                  <option value="gemini-pro-latest">Pro (Tư duy sâu & Chuẩn xác)</option>
                </select>
              </div>
            </div>
            
            <div class="space-y-3">
              @if (pronounTask() && !isGeneratingPronouns()) {
                <div class="text-sm text-amber-700 bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <p class="font-medium mb-1">Tiến trình bị gián đoạn</p>
                  <p class="text-amber-600">Bạn có một tiến trình tạo bảng đại từ đang dở dang (đã hoàn thành {{ completedChunksCount() }}/{{ pronounTask()?.totalChunks }} phần). Bạn có thể tiếp tục hoặc hủy bỏ để bắt đầu lại.</p>
                </div>
                <div class="flex gap-3">
                  <button 
                    (click)="resumeGeneration()"
                    [disabled]="isGeneratingPronouns()"
                    class="flex-1 flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <mat-icon class="mr-2 !w-5 !h-5 !text-[20px]">play_circle</mat-icon>
                    Tiếp tục quá trình tạo ({{ completedChunksCount() }}/{{ pronounTask()?.totalChunks }})
                  </button>
                  <button 
                    (click)="cancelTask()"
                    [disabled]="isGeneratingPronouns()"
                    class="px-4 py-2 border border-red-200 text-sm font-medium rounded-lg shadow-sm text-red-600 bg-white hover:bg-red-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Hủy tiến trình cũ
                  </button>
                </div>
              } @else {
                <button 
                  (click)="startGeneration()"
                  [disabled]="isGeneratingPronouns()"
                  class="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
                >
                  @if (isGeneratingPronouns()) {
                    <mat-icon class="animate-spin mr-2 !w-5 !h-5 !text-[20px]">sync</mat-icon>
                    {{ generationStatus() || 'Đang phân tích...' }}
                  } @else if (draftPronounTable().trim().length > 0) {
                    <mat-icon class="mr-2 !w-5 !h-5 !text-[20px]">refresh</mat-icon>
                    Tạo lại bảng dữ liệu Đại từ
                  } @else {
                    <mat-icon class="mr-2 !w-5 !h-5 !text-[20px]">auto_awesome</mat-icon>
                    Bắt đầu tạo bảng Đại từ tự động
                  }
                </button>
              }
            </div>
          </div>

          <div class="mt-8">
            <app-markdown-table-editor
              [value]="draftPronounTable()"
              (valueChange)="onTableChange($event)"
              [disabled]="isGeneratingPronouns()"
              placeholder="Ví dụ:&#10;| Nhân vật (Original) | Giới tính | Đặc điểm & Vai trò | Xưng hô / Tước vị (Dịch) | Ngôi thứ 3 (Narrator) | Xưng - Hô (Với người khác) | Ghi chú / Sắc thái |&#10;|---|---|---|---|---|---|---|&#10;| Harry Potter | Nam | Cô nhi | Cậu bé sống sót | Cậu, hắn | Với Ron: Bồ - Mình | Tự tin hơi bốc đồng |"
            >
              @if (store.pronounVersions().length > 0) {
                <div class="flex items-center justify-between py-2 border-b border-zinc-100 mb-2">
                  <div class="flex items-center space-x-2">
                    @for (v of store.pronounVersions(); track v.id; let i = $index) {
                      <button 
                        (click)="selectVersion(v)"
                        [class.bg-indigo-50]="store.activePronounVersionId() === v.id"
                        [class.text-indigo-700]="store.activePronounVersionId() === v.id"
                        [class.border-indigo-200]="store.activePronounVersionId() === v.id"
                        [class.bg-white]="store.activePronounVersionId() !== v.id"
                        [class.text-zinc-600]="store.activePronounVersionId() !== v.id"
                        [class.border-zinc-200]="store.activePronounVersionId() !== v.id"
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
          [disabled]="isGeneratingPronouns()"
          class="flex items-center space-x-2 text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 px-6 py-3 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
        >
          <span>Bỏ qua phần này</span>
          <mat-icon class="!w-5 !h-5 !text-xl !flex !items-center !justify-center">fast_forward</mat-icon>
        </button>

        <button 
          (click)="saveChanges()"
          [disabled]="isGeneratingPronouns() || !isManuallyEdited()"
          class="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mx-4"
        >
          <span>Lưu thay đổi</span>
          <mat-icon class="!w-5 !h-5 !text-xl !flex !items-center !justify-center">save</mat-icon>
        </button>

        <button 
          (click)="saveAndContinue()"
          [disabled]="isGeneratingPronouns() || store.pronounVersions().length === 0"
          class="flex items-center space-x-2 bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
        >
          <span>Tiếp tục</span>
          <mat-icon class="!w-5 !h-5 !text-xl !flex !items-center !justify-center">arrow_forward</mat-icon>
        </button>
      </div>
    </div>
  `
})
export class PronounSetup {
  store = inject(BookStore);
  gemini = inject(GeminiClient);
  toast = inject(ToastService);

  isGeneratingPronouns = signal<boolean>(false);
  generationStatus = signal<string>('');
  draftPronounTable = signal<string>('');
  
  pronounTask = this.store.pronounTask;
  completedChunksCount = computed(() => this.pronounTask()?.chunks.filter(c => c.status === 'completed').length || 0);
  
  pronounModel = signal<string>(this.store.pronounTask()?.model ?? this.store.config().pronounGenModel ?? 'gemini-pro-latest');
  isManuallyEdited = signal<boolean>(false);

  constructor() {
    effect(() => {
      const activeContent = this.store.pronounTable();
      if (!this.isManuallyEdited()) {
        this.draftPronounTable.set(activeContent);
      }
    });
  }

  activeVersion() {
    const id = this.store.activePronounVersionId();
    if (!id) return null;
    return this.store.pronounVersions().find(v => v.id === id);
  }

  selectVersion(v: import('../../core/db').ContentVersion) {
    this.store.selectPronounVersion(v.id);
    this.draftPronounTable.set(v.content);
    this.isManuallyEdited.set(false);
  }

  onTableChange(val: string) {
    this.draftPronounTable.set(val);
    this.isManuallyEdited.set(true);
  }

  cancelTask() {
    this.store.setPronounTask(undefined);
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

    const maxWordsPerChunk = 20000;
    const chunkTexts = smartHardSplit(fullText, maxWordsPerChunk);
    
    this.store.setPronounTask({
      status: 'processing',
      model: this.pronounModel(),
      totalChunks: chunkTexts.length,
      chunks: chunkTexts.map((text, i) => ({
        index: i,
        text,
        status: 'pending'
      }))
    });

    await this.processPronounTask();
  }

  async resumeGeneration() {
    const task = this.store.pronounTask();
    if (task) {
      this.pronounModel.set(task.model);
      await this.processPronounTask();
    }
  }

  async processPronounTask() {
    const task = this.store.pronounTask();
    if (!task) return;

    try {
      this.isGeneratingPronouns.set(true);
      this.store.isGeneratingMetadata.set(true);
      
      this.store.updateConfig({
        pronounGenModel: task.model
      });

      const isProModel = task.model.includes('pro');
      const maxConcurrent = isProModel ? 2 : 4;
      
      const chunksToProcess = task.chunks.filter(c => c.status !== 'completed');

      this.generationStatus.set(`Đang tiếp tục phân tích... (${task.chunks.length - chunksToProcess.length}/${task.totalChunks})`);

      for (let i = 0; i < chunksToProcess.length; i += maxConcurrent) {
        const batch = chunksToProcess.slice(i, i + maxConcurrent);
        const promises = batch.map(async chunk => {
          try {
            const result = await this.gemini.generatePronounsRaw(chunk.text, task.model, this.store.bookTitle(), this.store.author(), 0.1);
            chunk.result = result;
            chunk.status = 'completed';
          } catch (err) {
            chunk.status = 'error';
            throw err; // Re-throw to stop batch execution
          }
        });
        
        await Promise.all(promises);
        
        // Save intermediate state
        this.store.setPronounTask({ ...task });
        
        const completedCount = task.chunks.filter(c => c.status === 'completed').length;
        this.generationStatus.set(`Đang nhận diện Đại từ (${completedCount}/${task.totalChunks})...`);
      }

      // If all completed, generate final
      const allCompleted = task.chunks.every(c => c.status === 'completed');
      if (allCompleted) {
        const allPronounItems = task.chunks.flatMap(c => Array.isArray(c.result) ? c.result : []);
        let rawResult = '';
        if (allPronounItems.length > 0) {
          rawResult = '| Nhân vật (Original) | Giới tính | Đặc điểm & Vai trò | Xưng hô / Tước vị (Dịch) | Ngôi thứ 3 (Narrator) | Xưng - Hô (Với người khác) | Ghi chú / Sắc thái |\n|---|---|---|---|---|---|---|\n';
          for (const pt of allPronounItems) {
            rawResult += `| ${pt.originalName || ''} | ${pt.gender || ''} | ${pt.role || ''} | ${pt.translatedTitles || ''} | ${pt.narratorPronoun || ''} | ${pt.dialoguePronouns || ''} | ${pt.notes || ''} |\n`;
          }
        }

        this.generationStatus.set('Đang chuẩn hóa bảng đại từ...');
        const fullText = this.getFullText();
        const result = await this.gemini.normalizePronouns(fullText, rawResult, task.model, 0.1, this.store.bookTitle(), this.store.author());

        this.draftPronounTable.set(result);
        this.isManuallyEdited.set(false);
        this.store.addPronounVersion(result, task.model, 0.1);
        this.store.savePronounsConf(true);
        this.store.setPronounTask(undefined);
        this.toast.success(this.toast.Messages.PRONOUNS_SUCCESS);
      }
    } catch (e: unknown) {
      console.error(e);
      // Mark as error
      this.store.setPronounTask({ ...task, status: 'error' });
      this.toast.error(this.toast.Messages.PRONOUNS_ERROR(parseGeminiError(e)));
    } finally {
      this.isGeneratingPronouns.set(false);
      this.store.isGeneratingMetadata.set(false);
    }
  }

  saveChanges() {
    if (this.isManuallyEdited()) {
      const active = this.activeVersion();
      const model = active ? active.model : this.pronounModel();
      const temp = active ? active.temperature : 0.1;
      this.store.addPronounVersion(this.draftPronounTable(), model, temp);
      this.store.savePronounsConf(true);
      this.isManuallyEdited.set(false);
      this.toast.success('Đã lưu version mới');
    }
  }

  saveAndContinue() {
    if (this.isManuallyEdited()) {
      this.saveChanges();
    }
    this.store.savePronounsConf(true);
    this.store.phase.set(4);
  }

  skipAndContinue() {
    this.store.savePronounsConf(false);
    this.store.phase.set(4);
  }
}
