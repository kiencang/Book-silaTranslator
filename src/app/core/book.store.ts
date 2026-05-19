import { Injectable, signal, effect, PLATFORM_ID, inject, untracked, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DbService, Project, ProjectMeta, SplitSettings } from './db';
import { ToastService } from './toast.service';
import { getConfiguredMarked } from './marked-setup';
import { OFFLINE_READER_SCRIPT, OFFLINE_READER_STYLES, OFFLINE_READER_TOOLBAR_HTML } from './html-export.util';

export interface TranslationVersion {
  versionNumber: number;
  text: string;
  model: string;
  temperature: number;
  timestamp: number;
  customGlossary?: string;
  glossaryStatus?: 'none' | 'full' | 'filtered';
  glossaryRatio?: number;
  summary?: string;
  usePronouns?: boolean;
  pronounSnapshot?: string;
  pronounVersionNumber?: number;
  useGlossary?: boolean;
  glossaryVersionNumber?: number;
  useContextSummary?: boolean;
  contextSummarySnapshot?: string;
  contextSummaryChapterTitle?: string;
  useCustomInstructions?: boolean;
  customInstructionsSnapshot?: string;
}

export interface Chapter {
  id: string;
  order: number;
  title: string;
  originalText: string;
  wordCount: number;
  translatedText?: string;
  status: 'pending' | 'translating' | 'done' | 'error';
  versions?: TranslationVersion[];
  activeVersionNumber?: number;
  latestVersionNumber?: number;
  excludeFromTranslation?: boolean;
}

export interface TranslationConfig {
  model: 'gemini-flash-latest' | 'gemini-pro-latest';
  temperature: number;
  pronounGenModel?: string;
  glossaryGenModel?: string;
  analysisModel?: string;
  generateSummary?: boolean;
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
  readonly pronounVersions = signal<import('./db').ContentVersion[]>([]);
  readonly activePronounVersionId = signal<string | undefined>(undefined);
  readonly pronounTable = computed(() => {
    const versions = this.pronounVersions();
    if (!versions.length) return '';
    const activeId = this.activePronounVersionId();
    if (activeId) {
      const v = versions.find(v => v.id === activeId);
      if (v) return v.content;
    }
    return versions[versions.length - 1].content;
  });
  readonly activePronounVersionNumber = computed(() => {
    const versions = this.pronounVersions();
    if (!versions.length) return undefined;
    const activeId = this.activePronounVersionId();
    if (activeId) {
      const v = versions.find(v => v.id === activeId);
      if (v) return v.versionNumber;
    }
    return versions[versions.length - 1].versionNumber;
  });
  readonly usePronouns = signal<boolean>(false);
  
  readonly glossaryVersions = signal<import('./db').ContentVersion[]>([]);
  readonly activeGlossaryVersionId = signal<string | undefined>(undefined);
  readonly glossaryTable = computed(() => {
    const versions = this.glossaryVersions();
    if (!versions.length) return '';
    const activeId = this.activeGlossaryVersionId();
    if (activeId) {
      const v = versions.find(v => v.id === activeId);
      if (v) return v.content;
    }
    return versions[versions.length - 1].content;
  });
  readonly activeGlossaryVersionNumber = computed(() => {
    const versions = this.glossaryVersions();
    if (!versions.length) return undefined;
    const activeId = this.activeGlossaryVersionId();
    if (activeId) {
      const v = versions.find(v => v.id === activeId);
      if (v) return v.versionNumber;
    }
    return versions[versions.length - 1].versionNumber;
  });
  readonly useGlossary = signal<boolean>(false);
  private currentProjectCreatedAt = signal<number>(Date.now());
  private currentProjectImportedAt = signal<number | undefined>(undefined);

  readonly phase = signal<0 | 1 | 2 | 3 | 4 | 5>(0);
  readonly fileName = signal<string | null>(null);
  readonly rawMarkdown = signal<string | null>(null);
  readonly pdfTask = signal<import('./db').PdfConversionTask | undefined>(undefined);
  readonly pronounTask = signal<import('./db').PronounGenerationTask | undefined>(undefined);
  readonly glossaryTask = signal<import('./db').GlossaryGenerationTask | undefined>(undefined);
  readonly isConverting = signal<boolean>(false);
  readonly isGeneratingMetadata = signal<boolean>(false);
  readonly isAnalyzingSplits = signal<boolean>(false);
  readonly chapters = signal<Chapter[]>([]);
  readonly estimatedEnglishWords = computed(() => this.chapters().filter(c => !c.excludeFromTranslation).reduce((sum, c) => sum + (c.wordCount || 0), 0));
  readonly estimatedEnglishTokens = computed(() => this.estimatedEnglishWords() * 1.4);
  readonly estimatedVietnameseWords = computed(() => this.estimatedEnglishWords() * 1.45);
  readonly estimatedVietnameseTokens = computed(() => this.estimatedVietnameseWords() * 1.5);
  readonly hasAnyTranslation = computed(() => this.chapters().filter(c => !c.excludeFromTranslation).some(c => !!c.translatedText));
  readonly isTranslatingAny = computed(() => this.chapters().some(c => c.status === 'translating'));
  readonly isBusy = computed(() => this.isConverting() || this.isGeneratingMetadata() || this.isTranslatingAny() || this.isAnalyzingSplits());
  readonly config = signal<TranslationConfig>({
    model: 'gemini-pro-latest',
    temperature: 0.5,
    generateSummary: true
  });
  readonly splitSettings = signal<SplitSettings | undefined>(undefined);
  readonly customInstructions = signal<string | undefined>(undefined);

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

      const meta: ProjectMeta = {
        id: projectId,
        name: this.currentProjectName(),
        phase: this.phase(),
        fileName: this.fileName(),
        config: this.config(),
        updatedAt: Date.now(),
        createdAt: untracked(() => this.currentProjectCreatedAt()),
        importedAt: untracked(() => this.currentProjectImportedAt()),
        bookTitle: this.bookTitle(),
        author: this.author(),
        usePronouns: this.usePronouns(),
        useGlossary: this.useGlossary(),
        activePronounVersionId: this.activePronounVersionId(),
        activeGlossaryVersionId: this.activeGlossaryVersionId(),
        customInstructions: this.customInstructions(),
        splitSettings: this.splitSettings()
      };
      
      if (isPlatformBrowser(this.platformId)) {
        this.saveCurrentProjectState(meta);
      }
    });

    effect(() => {
      const projectId = this.currentProjectId();
      if (!projectId) return;

      const rawMarkdown = this.rawMarkdown();
      untracked(() => {
        if (isPlatformBrowser(this.platformId)) {
          this.db.saveProjectAsset(projectId, 'rawMarkdown', rawMarkdown);
        }
      });
    });

    effect(() => {
      const projectId = this.currentProjectId();
      if (!projectId) return;

      const pronounVersions = this.pronounVersions();
      untracked(() => {
        if (isPlatformBrowser(this.platformId)) {
          this.db.saveProjectAsset(projectId, 'pronounVersions', pronounVersions);
        }
      });
    });

    effect(() => {
      const projectId = this.currentProjectId();
      if (!projectId) return;

      const glossaryVersions = this.glossaryVersions();
      untracked(() => {
        if (isPlatformBrowser(this.platformId)) {
          this.db.saveProjectAsset(projectId, 'glossaryVersions', glossaryVersions);
        }
      });
    });
  }

  private async saveCurrentProjectState(meta: ProjectMeta) {
    try {
      await this.db.saveProjectMeta(meta);
      localStorage.setItem('md-translator-last-id', meta.id);
    } catch (e) {
      console.error('Failed to auto-save to IndexedDB', e);
    }
  }

  updateProjectInfo(title: string, author: string) {
    this.bookTitle.set(title);
    this.author.set(author);
    const name = [title, author].filter(Boolean).join(' - ');
    this.currentProjectName.set(name);
  }

  async createNewProject(name: string, title = '', author = '') {
    const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    this.currentProjectId.set(newId);
    this.currentProjectName.set(name);
    this.bookTitle.set(title);
    this.author.set(author);
    this.pronounVersions.set([]);
    this.activePronounVersionId.set(undefined);
    this.usePronouns.set(false);
    this.glossaryVersions.set([]);
    this.activeGlossaryVersionId.set(undefined);
    this.useGlossary.set(false);
    this.currentProjectCreatedAt.set(Date.now());
    this.currentProjectImportedAt.set(undefined);
    
    this.fileName.set(null);
    this.rawMarkdown.set(null);
    this.pdfTask.set(undefined);
    this.chapters.set([]);
    this.splitSettings.set(undefined);
    this.customInstructions.set(undefined);
    this.phase.set(1);
  }

  async loadProject(id: string) {
    const proj = await this.db.getProject(id);
    if (proj) {
      this.currentProjectId.set(proj.id);
      this.currentProjectName.set(proj.name);
      this.bookTitle.set(proj.bookTitle || '');
      this.author.set(proj.author || '');
      
      this.pronounVersions.set(proj.pronounVersions || []);
      this.activePronounVersionId.set(proj.activePronounVersionId);
      this.usePronouns.set(!!proj.usePronouns);
      
      this.glossaryVersions.set(proj.glossaryVersions || []);
      this.activeGlossaryVersionId.set(proj.activeGlossaryVersionId);
      this.useGlossary.set(!!proj.useGlossary);
      
      this.currentProjectCreatedAt.set(proj.createdAt || Date.now());
      this.currentProjectImportedAt.set(proj.importedAt);
      
      this.fileName.set(proj.fileName);
      this.rawMarkdown.set(proj.rawMarkdown);
      this.pdfTask.set(proj.pdfTask);
      this.pronounTask.set(proj.pronounTask);
      this.glossaryTask.set(proj.glossaryTask);
      
      const adjustedChapters = proj.chapters.map((c: Chapter) => 
        c.status === 'translating' ? { ...c, status: 'error' as const } : c
      );
      this.chapters.set(adjustedChapters);
      this.config.set(proj.config);
      this.splitSettings.set(proj.splitSettings);
      this.customInstructions.set(proj.customInstructions);
      this.phase.set(proj.phase as 0 | 1 | 2 | 3 | 4 | 5);
      
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
    this.pronounVersions.set([]);
    this.activePronounVersionId.set(undefined);
    this.usePronouns.set(false);
    this.glossaryVersions.set([]);
    this.activeGlossaryVersionId.set(undefined);
    this.useGlossary.set(false);
    this.pdfTask.set(undefined);
    this.pronounTask.set(undefined);
    this.glossaryTask.set(undefined);
    this.splitSettings.set(undefined);
    this.customInstructions.set(undefined);
    this.phase.set(0);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('md-translator-last-id');
    }
  }

  setPdfTask(task: import('./db').PdfConversionTask | undefined) {
    this.pdfTask.set(task);
    const projectId = this.currentProjectId();
    if (projectId && isPlatformBrowser(this.platformId)) {
      if (task) {
        this.db.saveProjectAsset(projectId, 'pdfTask', task).catch(console.error);
      } else {
        this.db.saveProjectAsset(projectId, 'pdfTask', undefined).catch(console.error);
      }
    }
  }

  setPronounTask(task: import('./db').PronounGenerationTask | undefined) {
    this.pronounTask.set(task);
    const projectId = this.currentProjectId();
    if (projectId && isPlatformBrowser(this.platformId)) {
       if (task) {
        this.db.saveProjectAsset(projectId, 'pronounTask', task).catch(console.error);
      } else {
        this.db.saveProjectAsset(projectId, 'pronounTask', undefined).catch(console.error);
      }
    }
  }

  setGlossaryTask(task: import('./db').GlossaryGenerationTask | undefined) {
    this.glossaryTask.set(task);
    const projectId = this.currentProjectId();
    if (projectId && isPlatformBrowser(this.platformId)) {
       if (task) {
        this.db.saveProjectAsset(projectId, 'glossaryTask', task).catch(console.error);
      } else {
        this.db.saveProjectAsset(projectId, 'glossaryTask', undefined).catch(console.error);
      }
    }
  }

  updateTaskBatch(taskName: 'pdfTask' | 'pronounTask' | 'glossaryTask', taskState: { chunks: unknown[] } & Record<string, unknown>, updatedIndices: number[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (taskName === 'pdfTask') this.pdfTask.set({ ...taskState } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else if (taskName === 'pronounTask') this.pronounTask.set({ ...taskState } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else if (taskName === 'glossaryTask') this.glossaryTask.set({ ...taskState } as any);

    const projectId = this.currentProjectId();
    if (projectId && isPlatformBrowser(this.platformId)) {
      this.db.saveProjectAsset(projectId, taskName, { ...taskState, chunks: undefined }).catch(console.error);
      const chunksMap: Record<number, unknown> = {};
      updatedIndices.forEach(i => {
        chunksMap[i] = taskState.chunks[i];
      });
      this.db.updateTaskChunks(projectId, taskName, chunksMap).catch(console.error);
    }
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
    if (isPlatformBrowser(this.platformId)) {
       const id = this.currentProjectId();
       if (id) {
          this.db.saveAllChapters(id, chs);
          this.db.updateProjectStats(id, chs);
       }
    }
  }

  savePronounsConf(use: boolean) {
    this.usePronouns.set(use);
  }

  saveGlossaryConf(use: boolean) {
    this.useGlossary.set(use);
  }

  addPronounVersion(content: string, model: string, temperature: number, source: 'ai' | 'ai_edited' | 'manual' = 'ai') {
    if (!content.trim()) return;
    const versions = [...this.pronounVersions()];
    const lastVersion = versions.length > 0 ? (versions[versions.length - 1].versionNumber ?? versions.length) : 0;
    const newVersion: import('./db').ContentVersion = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      versionNumber: lastVersion + 1,
      content,
      model,
      temperature,
      timestamp: Date.now(),
      source
    };
    versions.push(newVersion);
    if (versions.length > 3) {
      versions.shift(); // remove oldest
    }
    this.pronounVersions.set(versions);
    this.activePronounVersionId.set(newVersion.id);
  }

  selectPronounVersion(id: string) {
    this.activePronounVersionId.set(id);
  }

  addGlossaryVersion(content: string, model: string, temperature: number, source: 'ai' | 'ai_edited' | 'manual' = 'ai') {
    if (!content.trim()) return;
    const versions = [...this.glossaryVersions()];
    const lastVersion = versions.length > 0 ? (versions[versions.length - 1].versionNumber ?? versions.length) : 0;
    const newVersion: import('./db').ContentVersion = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      versionNumber: lastVersion + 1,
      content,
      model,
      temperature,
      timestamp: Date.now(),
      source
    };
    versions.push(newVersion);
    if (versions.length > 3) {
      versions.shift(); // remove oldest
    }
    this.glossaryVersions.set(versions);
    this.activeGlossaryVersionId.set(newVersion.id);
  }

  selectGlossaryVersion(id: string) {
    this.activeGlossaryVersionId.set(id);
  }

  updateConfig(partial: Partial<TranslationConfig>) {
    this.config.update(c => ({ ...c, ...partial }));
  }

  updateChapter(id: string, partial: Partial<Chapter>) {
    this.chapters.update(chs => chs.map(c => c.id === id ? { ...c, ...partial } : c));
    if (isPlatformBrowser(this.platformId)) {
       const chaps = this.chapters();
       const updated = chaps.find(c => c.id === id);
       const pid = this.currentProjectId();
       if (updated && pid) {
          this.db.saveChapter(pid, updated);
          this.db.updateProjectStats(pid, chaps);
       }
    }
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
      const htmlBody = await getConfiguredMarked().parse(combinedMarkdown);
      const htmlDoc = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-sila-project-id" content="${this.currentProjectId()}">
<meta name="x-sila-chapter-id" content="full">
<title>${name}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Lexend:wght@400;500;600;700;800&display=swap" rel="stylesheet">
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
    } catch (e: unknown) {
      console.error('Error exporting to HTML:', e);
      this.toastService.error(this.toastService.Messages.EXPORT_HTML_ERROR);
    }
  }
}
