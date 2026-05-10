import { Injectable, signal, effect, PLATFORM_ID, inject, untracked, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DbService, Project } from './db';
import { ToastService } from './toast.service';
import { marked } from 'marked';
import { OFFLINE_READER_SCRIPT, OFFLINE_READER_STYLES, OFFLINE_READER_TOOLBAR_HTML } from './html-export.util';

export interface TranslationVersion {
  versionNumber: number;
  text: string;
  model: string;
  temperature: number;
  timestamp: number;
}

export interface Chapter {
  id: string;
  title: string;
  originalText: string;
  wordCount: number;
  translatedText?: string;
  status: 'pending' | 'translating' | 'done' | 'error';
  versions?: TranslationVersion[];
  activeVersionNumber?: number;
  latestVersionNumber?: number;
}

export interface TranslationConfig {
  model: 'gemini-flash-latest' | 'gemini-pro-latest';
  temperature: number;
  pronounGenRatio?: number;
  pronounGenModel?: string;
  glossaryGenRatio?: number;
  glossaryGenModel?: string;
}

@Injectable({ providedIn: 'root' })
export class BookStore {
  private platformId = inject(PLATFORM_ID);
  private db = inject(DbService);
  private toastService = inject(ToastService);
  
  readonly currentProjectId = signal<string | null>(null);
  readonly currentProjectName = signal<string>('');
  readonly bookTitle = signal<string>('');
  readonly author = signal<string>('');
  readonly pronounTable = signal<string>('');
  readonly usePronouns = signal<boolean>(false);
  readonly glossaryTable = signal<string>('');
  readonly useGlossary = signal<boolean>(false);
  private currentProjectCreatedAt = signal<number>(Date.now());

  readonly phase = signal<0 | 1 | 2 | 3 | 4 | 5>(0);
  readonly fileName = signal<string | null>(null);
  readonly rawMarkdown = signal<string | null>(null);
  readonly pdfTask = signal<import('./db').PdfConversionTask | undefined>(undefined);
  readonly isConverting = signal<boolean>(false);
  readonly isGeneratingMetadata = signal<boolean>(false);
  readonly chapters = signal<Chapter[]>([]);
  readonly estimatedEnglishWords = computed(() => this.chapters().reduce((sum, c) => sum + (c.wordCount || 0), 0));
  readonly estimatedEnglishTokens = computed(() => this.estimatedEnglishWords() * 1.4);
  readonly estimatedVietnameseWords = computed(() => this.estimatedEnglishWords() * 1.45);
  readonly estimatedVietnameseTokens = computed(() => this.estimatedVietnameseWords() * 1.5);
  readonly hasAnyTranslation = computed(() => this.chapters().some(c => !!c.translatedText));
  readonly isTranslatingAny = computed(() => this.chapters().some(c => c.status === 'translating'));
  readonly config = signal<TranslationConfig>({
    model: 'gemini-pro-latest',
    temperature: 0.5
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
       const lastId = localStorage.getItem('md-translator-last-id');
       if (lastId) {
         this.loadProject(lastId);
       }
    }

    effect(() => {
      const projectId = this.currentProjectId();
      if (!projectId) return;

      const state: Project = {
        id: projectId,
        name: this.currentProjectName(),
        phase: this.phase(),
        fileName: this.fileName(),
        rawMarkdown: this.rawMarkdown(),
        chapters: this.chapters(),
        config: this.config(),
        updatedAt: Date.now(),
        createdAt: untracked(() => this.currentProjectCreatedAt()),
        bookTitle: this.bookTitle(),
        author: this.author(),
        pronounTable: this.pronounTable(),
        usePronouns: this.usePronouns(),
        glossaryTable: this.glossaryTable(),
        useGlossary: this.useGlossary(),
        pdfTask: this.pdfTask()
      };
      
      if (isPlatformBrowser(this.platformId)) {
        this.saveCurrentProjectState(state);
      }
    });
  }

  private async saveCurrentProjectState(state: Project) {
    try {
      await this.db.saveProject(state);
      localStorage.setItem('md-translator-last-id', state.id);
    } catch (e) {
      console.error('Failed to auto-save to IndexedDB', e);
    }
  }

  async createNewProject(name: string, title: string = '', author: string = '') {
    const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    this.currentProjectId.set(newId);
    this.currentProjectName.set(name);
    this.bookTitle.set(title);
    this.author.set(author);
    this.pronounTable.set('');
    this.usePronouns.set(false);
    this.glossaryTable.set('');
    this.useGlossary.set(false);
    this.currentProjectCreatedAt.set(Date.now());
    
    this.fileName.set(null);
    this.rawMarkdown.set(null);
    this.pdfTask.set(undefined);
    this.chapters.set([]);
    this.phase.set(1);
  }

  async loadProject(id: string) {
    const proj = await this.db.getProject(id);
    if (proj) {
      this.currentProjectId.set(proj.id);
      this.currentProjectName.set(proj.name);
      this.bookTitle.set(proj.bookTitle || '');
      this.author.set(proj.author || '');
      this.pronounTable.set(proj.pronounTable || '');
      this.usePronouns.set(!!proj.usePronouns);
      this.glossaryTable.set(proj.glossaryTable || '');
      this.useGlossary.set(!!proj.useGlossary);
      this.currentProjectCreatedAt.set(proj.createdAt || Date.now());
      
      this.fileName.set(proj.fileName);
      this.rawMarkdown.set(proj.rawMarkdown);
      this.pdfTask.set(proj.pdfTask);
      
      const adjustedChapters = proj.chapters.map((c: Chapter) => 
        c.status === 'translating' ? { ...c, status: 'error' as const } : c
      );
      this.chapters.set(adjustedChapters);
      this.config.set(proj.config);
      this.phase.set(proj.phase as any);
      
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('md-translator-last-id', proj.id);
      }
    }
  }
  
  closeProject() {
    this.currentProjectId.set(null);
    this.currentProjectName.set('');
    this.bookTitle.set('');
    this.author.set('');
    this.pronounTable.set('');
    this.usePronouns.set(false);
    this.glossaryTable.set('');
    this.useGlossary.set(false);
    this.pdfTask.set(undefined);
    this.phase.set(0);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('md-translator-last-id');
    }
  }

  setPdfTask(task: import('./db').PdfConversionTask | undefined) {
    this.pdfTask.set(task);
  }

  setMarkdown(md: string, name: string) {
    this.rawMarkdown.set(md);
    this.fileName.set(name);
    this.phase.set(2);
    this.isConverting.set(false);
  }

  setConverting(converting: boolean) {
    this.isConverting.set(converting);
  }

  setChapters(chs: Chapter[]) {
    this.chapters.set(chs);
    this.phase.set(3);
  }

  savePronounsConf(table: string, use: boolean) {
    this.pronounTable.set(table);
    this.usePronouns.set(use);
  }

  saveGlossaryConf(table: string, use: boolean) {
    this.glossaryTable.set(table);
    this.useGlossary.set(use);
  }

  updateConfig(partial: Partial<TranslationConfig>) {
    this.config.update(c => ({ ...c, ...partial }));
  }

  updateChapter(id: string, partial: Partial<Chapter>) {
    this.chapters.update(chs => chs.map(c => c.id === id ? { ...c, ...partial } : c));
  }

  selectVersion(chapterId: string, versionNumber: number) {
    const chaps = this.chapters();
    const chapter = chaps.find(c => c.id === chapterId);
    if (chapter && chapter.versions) {
      const version = chapter.versions.find(v => v.versionNumber === versionNumber);
      if (version) {
        this.updateChapter(chapterId, {
          activeVersionNumber: versionNumber,
          translatedText: version.text
        });
      }
    }
  }
  
  resetToPhase1() {
    this.phase.set(1);
    this.fileName.set(null);
    this.rawMarkdown.set(null);
    this.pdfTask.set(undefined);
    this.chapters.set([]);
  }

  async exportProjectToHtml(project?: Project) {
    if (!isPlatformBrowser(this.platformId)) return;

    const name = project ? project.name : this.currentProjectName();
    const chaps = project ? project.chapters : this.chapters();

    let combinedMarkdown = '';
    for (const c of chaps) {
      if (c.status === 'done' && c.translatedText) {
        combinedMarkdown += c.translatedText + '\n\n';
      } else {
        combinedMarkdown += c.originalText + '\n\n';
      }
    }

    try {
      const htmlBody = await marked.parse(combinedMarkdown);
      const htmlDoc = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${name}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
${OFFLINE_READER_STYLES}
</style>
</head>
<body>
${OFFLINE_READER_TOOLBAR_HTML}
<div class="content-wrapper">
${htmlBody}
</div>
${OFFLINE_READER_SCRIPT}
</body>
</html>`;

      const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}_silaTranslator_vi.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.toastService.success(this.toastService.Messages.EXPORT_HTML_SUCCESS);
    } catch (e: any) {
      console.error('Error exporting to HTML:', e);
      this.toastService.error(this.toastService.Messages.EXPORT_HTML_ERROR);
    }
  }
}
