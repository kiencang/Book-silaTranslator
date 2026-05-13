import { Component, inject, signal, effect } from '@angular/core';
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
          <p class="text-zinc-500 mt-1">Sử dụng AI phân tích nội dung truyện và xây dựng bảng đại từ nhân xưng, đảm bảo nhất quán khi dịch. Phù hợp cho thể loại tiểu thuyết, truyện ngắn. Các loại sách khác có thể không cần thiết.</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 mb-8">
        <div class="space-y-6">
          <div class="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-4">
            <div class="flex flex-col sm:flex-row gap-4">
              <div class="flex-1">
                <label for="pronounExtractRatio" class="block text-xs font-semibold text-zinc-700 uppercase tracking-widest mb-2">Trích xuất nội dung từ bản text đã lọc</label>
                <select id="pronounExtractRatio" [value]="pronounExtractRatio()" (change)="pronounExtractRatio.set(+$any($event.target).value)" disabled class="w-full pl-3 pr-8 py-2 text-sm border-zinc-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg border disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:opacity-75">
                  <option value="1">100% nội dung sách</option>
                </select>
              </div>
              <div class="flex-1">
                <label for="pronounModel" class="block text-xs font-semibold text-zinc-700 uppercase tracking-widest mb-2">Mô hình nhận diện</label>
                <select id="pronounModel" [value]="pronounModel()" (change)="pronounModel.set($any($event.target).value)" [disabled]="isGeneratingPronouns()" class="w-full pl-3 pr-8 py-2 text-sm border-zinc-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg border disabled:cursor-not-allowed">
                  <option value="gemini-flash-latest">Flash (Nhanh & Tiết kiệm)</option>
                  <option value="gemini-pro-latest">Pro (Tư duy sâu & Chuẩn xác)</option>
                </select>
              </div>
            </div>
            
            <button 
              (click)="generatePronouns()"
              [disabled]="isGeneratingPronouns()"
              class="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
            >
              @if (isGeneratingPronouns()) {
                <mat-icon class="animate-spin mr-2 !w-5 !h-5 !text-[20px]">sync</mat-icon>
                Đang phân tích và tạo bảng...
              } @else if (draftPronounTable().trim().length > 0) {
                <mat-icon class="mr-2 !w-5 !h-5 !text-[20px]">refresh</mat-icon>
                Tạo lại bảng dữ liệu Đại từ
              } @else {
                <mat-icon class="mr-2 !w-5 !h-5 !text-[20px]">auto_awesome</mat-icon>
                Bắt đầu tạo bảng Đại từ tự động
              }
            </button>
          </div>

          <div class="mt-8">
            <app-markdown-table-editor
              [value]="draftPronounTable()"
              (valueChange)="onTableChange($event)"
              [disabled]="isGeneratingPronouns()"
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
  draftPronounTable = signal<string>('');
  pronounExtractRatio = signal<number>(1);
  pronounModel = signal<string>(this.store.config().pronounGenModel ?? 'gemini-pro-latest');
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

  async generatePronouns() {
    let fullText = '';
    const chapters = this.store.chapters();
    if (chapters && chapters.length > 0) {
       fullText = chapters.filter(c => !c.excludeFromTranslation).map(c => c.title + '\n' + c.originalText).join('\n\n');
    } else {
       fullText = this.store.rawMarkdown() || '';
    }

    if (!fullText) {
       this.toast.error(this.toast.Messages.NO_CONTENT_TO_ANALYZE);
       return;
    }

    try {
      this.isGeneratingPronouns.set(true);
      this.store.isGeneratingMetadata.set(true);
      
      this.store.updateConfig({
        pronounGenRatio: this.pronounExtractRatio(),
        pronounGenModel: this.pronounModel()
      });

      const ratio = this.pronounExtractRatio();
      const lengthToTake = Math.floor(fullText.length * ratio);
      const textToAnalyze = fullText.substring(0, lengthToTake);

      const maxWordsPerChunk = 30000;
      const chunks = smartHardSplit(textToAnalyze, maxWordsPerChunk);
      
      let allPronounItems: any[] = [];
      const maxConcurrent = 4;
      
      for (let i = 0; i < chunks.length; i += maxConcurrent) {
        const batch = chunks.slice(i, i + maxConcurrent);
        const promises = batch.map(chunk => 
          this.gemini.generatePronounsRaw(chunk, this.pronounModel(), this.store.bookTitle(), this.store.author(), 0.1)
        );
        const results = await Promise.all(promises);
        for (const res of results) {
          if (Array.isArray(res)) {
            allPronounItems.push(...res);
          }
        }
      }

      function getGenderScore(gender?: string): number {
        if (!gender) return 0;
        const g = String(gender).toLowerCase().trim();
        if (g === 'male' || g === 'female') return 2;
        if (g === 'non-binary' || g === 'unknown') return 1;
        return 0;
      }

      const uniqueItems = new Map<string, any>();
      for (const item of allPronounItems) {
        if (!item.originalName) continue;
        const key = String(item.originalName).toLowerCase().trim();
        
        const existing = uniqueItems.get(key);
        if (!existing) {
          uniqueItems.set(key, item);
        } else {
          const existingScore = getGenderScore(existing.gender);
          const newScore = getGenderScore(item.gender);
          
          if (newScore > existingScore) {
            uniqueItems.set(key, item);
          } else if (newScore === existingScore) {
            const existingNotesLen = existing.notes ? String(existing.notes).length : 0;
            const newNotesLen = item.notes ? String(item.notes).length : 0;
            if (newNotesLen > existingNotesLen) {
              uniqueItems.set(key, item);
            }
          }
        }
      }

      const deduplicatedPronouns = Array.from(uniqueItems.values());
      deduplicatedPronouns.sort((a, b) => String(a.originalName).localeCompare(String(b.originalName)));

      let result = '';
      if (deduplicatedPronouns.length > 0) {
        result = '| Nhân vật (Original) | Giới tính | Đặc điểm & Vai trò | Xưng hô / Tước vị (Dịch) | Ngôi thứ 3 (Narrator) | Xưng - Hô (Với người khác) | Ghi chú / Sắc thái |\n|---|---|---|---|---|---|---|\n';
        for (const pt of deduplicatedPronouns) {
          result += `| ${pt.originalName || ''} | ${pt.gender || ''} | ${pt.role || ''} | ${pt.translatedTitles || ''} | ${pt.narratorPronoun || ''} | ${pt.dialoguePronouns || ''} | ${pt.notes || ''} |\n`;
        }
      }

      this.draftPronounTable.set(result);
      this.isManuallyEdited.set(false);
      this.store.addPronounVersion(result, this.pronounModel(), 0.1);
      this.store.savePronounsConf(true);
      this.toast.success(this.toast.Messages.PRONOUNS_SUCCESS);
    } catch (e: unknown) {
      console.error(e);
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
