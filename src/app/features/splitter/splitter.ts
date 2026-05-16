import { Component, computed, inject, signal, effect } from '@angular/core';
import { BookStore, Chapter } from '../../core/book.store';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../core/toast.service';
import { analyzeAndSplitText, PreviewChapter, countWords } from './splitter.util';
import { GeminiClient, parseGeminiError } from '../../core/gemini';
import { AiAnalysisComponent } from './components/ai-analysis.component';
import { SplitLimitsComponent } from './components/split-limits.component';
import { SplitOptionsComponent } from './components/split-options.component';
import { SplitPreviewComponent } from './components/split-preview.component';

@Component({
  selector: 'app-splitter',
  standalone: true,
  imports: [
    MatIconModule,
    AiAnalysisComponent,
    SplitLimitsComponent,
    SplitOptionsComponent,
    SplitPreviewComponent
  ],
  template: `
    <div class="max-w-4xl mx-auto py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-2xl font-bold text-zinc-900">Chia theo chương dịch (hoặc khối dịch)</h2>
          <p class="text-zinc-500 mt-1">Đang phân tích "{{ store.fileName() }}" để tìm ra cách phân chia tốt nhất.</p>
        </div>
        <button 
          (click)="downloadMarkdown()"
          class="flex items-center space-x-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          title="Tải về file markdown đã được trích xuất"
        >
          <mat-icon class="!w-5 !h-5 !text-xl !flex !items-center !justify-center text-zinc-500">download</mat-icon>
          <span class="hidden sm:inline">Tải file Markdown</span>
        </button>
      </div>

      @if (store.hasAnyTranslation()) {
        <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mb-8 rounded-r-xl shadow-sm">
          <div class="flex">
            <div class="flex-shrink-0 mt-0.5">
              <mat-icon class="text-amber-500 !text-xl !w-5 !h-5">warning</mat-icon>
            </div>
            <div class="ml-3">
              <p class="text-sm text-amber-800 font-medium">
                Việc chia lại chương bị vô hiệu hóa do dự án đã có nội dung đã được dịch.
              </p>
              <p class="text-sm text-amber-700 mt-1 leading-relaxed">
                Hãy tải về file Markdown đã xử lý ở nút phía trên bên phải, và tạo một dự án mới nếu bạn muốn chia lại sách.
              </p>
            </div>
          </div>
        </div>
      }

      <div class="mb-8 transition-opacity duration-300" [class.opacity-50]="store.hasAnyTranslation()" [class.pointer-events-none]="store.hasAnyTranslation()">
        <app-ai-analysis
          [isAnalyzing]="isAnalyzing()"
          [totalWords]="totalWords()"
          [estimatedTokens]="estimatedTokens()"
          [(analysisModel)]="analysisModel"
          [(samplePercentage)]="samplePercentage"
          (onAnalyze)="runBookAnalysis()" />
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 mb-8 transition-opacity duration-300" [class.opacity-50]="store.hasAnyTranslation()" [class.pointer-events-none]="store.hasAnyTranslation()">
        <h3 class="text-lg font-semibold text-zinc-900 mb-6">Điều chỉnh cách phân chia</h3>
        
        <!-- Các thông số Tối thiểu và Tối đa biên độ -->
        <fieldset class="transition-opacity duration-300" [disabled]="isAnalyzing() || store.hasAnyTranslation()" [class.opacity-50]="isAnalyzing() || store.hasAnyTranslation()" [class.pointer-events-none]="isAnalyzing() || store.hasAnyTranslation()">
          <app-split-limits
            [(draftMinWords)]="draftMinWords"
            [(draftMaxWords)]="draftMaxWords"
            [activeMinWords]="activeMinWords()"
            [activeMaxWords]="activeMaxWords()"
            (onApply)="applyWordsRange()" />

          <app-split-options
            [activeSplitMode]="activeSplitMode()"
            [draftKeywords]="draftKeywords()"
            [draftHeadingLevel]="draftHeadingLevel()"
            (onAddKeyword)="addKeyword($event)"
            (onRemoveKeyword)="removeKeyword($event)"
            (onSelectKeywordMode)="applyKeywordMode()"
            (onSelectHeadingMode)="applyHeadingModeDefault()"
            (onHeadingLevelChange)="onHeadingLevelChange($event)"
            (onSelectStandaloneMode)="applyStandaloneMode()" />
        </fieldset>
      </div>

      <app-split-preview
        [splitMethods]="splitMethods()"
        [selectedMethodData]="selectedMethodData()"
        [disabled]="isAnalyzing() || store.hasAnyTranslation()"
        [isAnalyzing]="isAnalyzing()"
        (onSelectMethod)="selectMethod($event)"
        (onPreviewBlock)="previewBlock.set($event)"
        (onApplySplit)="applySplit()" />

      @if (previewBlock() || isClosingPreview()) {
        <div role="button" tabindex="0" (keydown.enter)="closePreview()" class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200" [class.animate-fade-out]="isClosingPreview()" (click)="closePreview()">
          <div role="presentation" class="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all cursor-default animate-in zoom-in duration-200" [class.animate-zoom-out]="isClosingPreview()" (click)="$event.stopPropagation()">
            <div class="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/80">
              <div>
                <h3 class="text-lg font-semibold text-zinc-900">{{ currentPreviewData()?.title }}</h3>
                <p class="text-sm text-zinc-500">{{ currentPreviewData()?.wordCount }} từ</p>
              </div>
              <button class="text-zinc-400 hover:text-zinc-600 transition-colors p-2 rounded-full hover:bg-zinc-200/50 flex items-center justify-center" (click)="closePreview()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="p-6 overflow-y-auto flex-1 bg-white">
              <div class="whitespace-pre-wrap font-mono text-sm text-zinc-700 leading-relaxed">
                {{ currentPreviewData()?.originalText }}
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class Splitter {
  store = inject(BookStore);
  toast = inject(ToastService);
  gemini = inject(GeminiClient);

  get isAnalyzing() { return this.store.isAnalyzingSplits; }
  analysisModel = signal<string>(this.store.config().analysisModel ?? 'gemini-flash-lite-latest');
  samplePercentage = signal<number>(50);

  draftKeywords = signal<string[]>(['Chapter', 'Part', 'Section']);
  draftMinWords = signal(5000);
  draftMaxWords = signal(15000);
  
  activeKeywords = signal<string[]>(['Chapter', 'Part', 'Section']);
  activeMinWords = signal(5000);
  activeMaxWords = signal(15000);
  
  activeSplitMode = signal<'keyword' | 'heading' | 'standalone'>('keyword');
  draftHeadingLevel = signal<'h2' | 'h3'>('h2');
  activeHeadingLevel = signal<'h2' | 'h3'>('h2');
  
  selectedMethod = signal<string | null>(null);
  previewBlock = signal<PreviewChapter | null>(null);
  isClosingPreview = signal(false);
  
  // Keep track of the preview data so it doesn't disappear during animation
  currentPreviewData = computed(() => {
    return this.previewBlock() || this._lastPreviewBlock;
  });
  private _lastPreviewBlock: PreviewChapter | null = null;
  
  closePreview() {
    this._lastPreviewBlock = this.previewBlock();
    this.isClosingPreview.set(true);
    setTimeout(() => {
      this.previewBlock.set(null);
      this._lastPreviewBlock = null;
      this.isClosingPreview.set(false);
    }, 200);
  }

  totalWords = computed(() => {
    const text = this.store.rawMarkdown() || '';
    return countWords(text);
  });

  estimatedTokens = computed(() => {
    return Math.round(this.totalWords() * 1.4);
  });

  formatNumber(val: number): string {
    if (val === 0) return '0';
    if (val < 1000) return Math.round(val).toString();
    return (val / 1000).toFixed(1) + 'K';
  }

  constructor() {
    const settings = this.store.splitSettings();
    if (settings) {
      this.draftKeywords.set(settings.activeKeywords);
      this.activeKeywords.set(settings.activeKeywords);
      
      this.draftMinWords.set(settings.activeMinWords || 5000);
      this.activeMinWords.set(settings.activeMinWords || 5000);
      
      const mx = settings.activeMaxWords || 15000;
      this.draftMaxWords.set(mx);
      this.activeMaxWords.set(mx);
      
      this.draftHeadingLevel.set(settings.activeHeadingLevel);
      this.activeHeadingLevel.set(settings.activeHeadingLevel);
      
      this.activeSplitMode.set(settings.activeSplitMode);
      if (settings.selectedMethod !== undefined) {
        this.selectedMethod.set(settings.selectedMethod);
      }
    }

    effect(() => {
      this.store.splitSettings.set({
        activeSplitMode: this.activeSplitMode(),
        activeKeywords: this.activeKeywords(),
        activeHeadingLevel: this.activeHeadingLevel(),
        activeMinWords: this.activeMinWords(),
        activeMaxWords: this.activeMaxWords(),
        selectedMethod: this.selectedMethod()
      });
    });
  }

  onHeadingLevelChange(level: 'h2' | 'h3') {
    this.draftHeadingLevel.set(level);
    if (this.activeSplitMode() !== 'heading') {
      this.activeSplitMode.set('heading');
    }
    this.applyHeadingMode();
  }

  applyHeadingModeDefault() {
    if (this.activeSplitMode() !== 'heading') {
      this.draftHeadingLevel.set('h2');
    }
    this.applyHeadingMode();
  }

  addKeyword(value: string) {
    if (value) {
      const newKws = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
      let currentKws = this.draftKeywords();
      let hasChanges = false;
      for (const nw of newKws) {
        if (!currentKws.includes(nw)) {
           currentKws = [...currentKws, nw];
           hasChanges = true;
        }
      }
      if (hasChanges) {
        this.draftKeywords.set(currentKws);
        this.applyKeywordMode();
      }
    }
  }

  removeKeyword(kwToRemove: string) {
    this.draftKeywords.update(kws => kws.filter(k => k !== kwToRemove));
    this.applyKeywordMode();
  }

  async runBookAnalysis() {
    try {
      let text = this.store.rawMarkdown();
      if (!text) {
        this.toast.error('Không tìm thấy nội dung sách để phân tích.');
        return;
      }

      const pct = this.samplePercentage();
      if (pct < 100) {
        const charCount = Math.floor(text.length * (pct / 100));
        text = text.substring(0, charCount);
      }

      // Update the model config
      this.store.updateConfig({ analysisModel: this.analysisModel() });

      this.isAnalyzing.set(true);
      const jsonString = await this.gemini.analyzeBook(
        text, 
        this.analysisModel(),
        this.store.bookTitle(), 
        this.store.author()
      );

      const data = JSON.parse(jsonString);

      // 1. Áp dụng Split Option
      if (data.splitOptions) {
        const option = data.splitOptions.recommendedOption;
        if (option === 'keyword' && data.splitOptions.recommendedKeywords) {
          const kws = data.splitOptions.recommendedKeywords;
          if (Array.isArray(kws) && kws.length > 0) {
            this.draftKeywords.set(kws);
            this.applyKeywordMode();
            this.toast.success(`AI phân tích: Theo Từ khóa. Lý do: ${data.splitOptions.reason || 'Sách có cấu trúc từ khóa rõ ràng.'}`);
          }
        } else if (option === 'regex' && data.splitOptions.recommendedRegex) {
          const rx = data.splitOptions.recommendedRegex;
          const rxLower = String(rx).toLowerCase();
          if (rxLower.includes('h2') || (rx.includes('##') && !rx.includes('###'))) {
            this.draftHeadingLevel.set('h2');
          } else if (rxLower.includes('h3') || rx.includes('###')) {
            this.draftHeadingLevel.set('h3');
          } else {
            this.draftHeadingLevel.set('h2');
          }
          this.applyHeadingMode();
          this.toast.success(`AI phân tích: Theo Thẻ Heading. Lý do: ${data.splitOptions.reason}`);
        } else {
          this.applyStandaloneMode();
          this.toast.success(`AI phân tích: Chia tự động. Lý do: ${data.splitOptions.reason}`);
        }
      }

      this.toast.success('Đã áp dụng các cài đặt được AI phân tích.');

    } catch (e) {
      console.error('Analysis failed:', e);
      this.toast.error(parseGeminiError(e));
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  applyWordsRange() {
    const minW = Math.max(1000, Math.min(7000, this.draftMinWords()));
    const maxW = Math.max(10000, Math.min(25000, this.draftMaxWords()));
    this.draftMinWords.set(minW);
    this.activeMinWords.set(minW);
    this.draftMaxWords.set(maxW);
    this.activeMaxWords.set(maxW);
  }

  applyKeywordMode() {
    const kwArray = this.draftKeywords();
    this.activeKeywords.set(kwArray.length > 0 ? kwArray : ['Chapter']);
    
    this.applyWordsRange();
    
    this.activeSplitMode.set('keyword');
  }

  applyHeadingMode() {
    this.applyWordsRange();
    
    this.activeHeadingLevel.set(this.draftHeadingLevel());
    
    this.activeSplitMode.set('heading');
  }

  applyStandaloneMode() {
    this.applyWordsRange();
    this.activeSplitMode.set('standalone');
  }

  splitMethods = computed(() => {
    return analyzeAndSplitText(
      this.store.rawMarkdown() || '',
      this.activeMinWords(),
      this.activeMaxWords(),
      this.activeSplitMode(),
      this.activeKeywords(),
      this.activeHeadingLevel()
    );
  });

  selectedMethodData = computed(() => {
    const sel = this.selectedMethod();
    const methods = this.splitMethods();
    if (methods.length === 0) return null;
    
    if (sel) {
      const found = methods.find(m => m.keyword === sel);
      if (found) return found;
    }
    return methods[0];
  });

  selectMethod(kw: string) {
    this.selectedMethod.set(kw);
  }

  downloadMarkdown() {
    try {
      const text = this.store.rawMarkdown();
      if (!text) {
        this.toast.error(this.toast.Messages.DOWNLOAD_MARKDOWN_ERROR);
        return;
      }
      const blob = new Blob([text], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      let safeName = (this.store.fileName() || 'book_content').replace(/\.[^/.]+$/, "");
      if (!safeName) safeName = 'book_content';
      a.download = `${safeName}.md`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.toast.success(this.toast.Messages.DOWNLOAD_MARKDOWN_SUCCESS);
    } catch {
      this.toast.error(this.toast.Messages.DOWNLOAD_MARKDOWN_ERROR);
    }
  }

  applySplit() {
    if (this.store.hasAnyTranslation()) {
      this.store.phase.set(3);
      return;
    }

    const data = this.selectedMethodData();
    if (!data) return;

    const chapters: Chapter[] = data.previewChapters.map((c, idx) => ({
      id: `chapter_${idx}_${Date.now()}`,
      order: idx,
      title: c.title,
      originalText: c.originalText,
      wordCount: c.wordCount,
      status: c.excludeFromTranslation ? 'done' : 'pending',
      excludeFromTranslation: c.excludeFromTranslation,
      translatedText: c.excludeFromTranslation ? c.originalText : undefined
    }));

    this.store.setChapters(chapters);
  }
}

