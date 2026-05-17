import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { openDB, IDBPDatabase, DBSchema } from 'idb';
import type { Chapter, TranslationConfig } from './book.store';

export interface ChapterEntity extends Chapter {
  projectId: string;
}

export interface PdfConversionChunk {
  index: number;
  pdfData?: Uint8Array;
  markdown?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface PdfConversionTask {
  fileName: string;
  chunks: PdfConversionChunk[];
}

export interface SplitSettings {
  activeSplitMode: 'keyword' | 'heading' | 'standalone';
  activeKeywords: string[];
  activeHeadingLevel: 'h2' | 'h3';
  activeMinWords: number;
  activeMaxWords?: number;
  selectedMethod?: string | null;
}

export interface PronounChunk {
  index: number;
  text: string;
  result?: unknown;
  status: 'pending' | 'completed' | 'error';
}

export interface PronounGenerationTask {
  status: 'processing' | 'error';
  model: string;
  totalChunks: number;
  chunks: PronounChunk[];
}

export interface GlossaryChunk {
  index: number;
  text: string;
  result?: unknown;
  status: 'pending' | 'completed' | 'error';
}

export interface GlossaryGenerationTask {
  status: 'processing' | 'error';
  model: string;
  totalChunks: number;
  chunks: GlossaryChunk[];
}

export interface ContentVersion {
  id: string;
  versionNumber: number;
  content: string;
  model: string;
  temperature: number;
  timestamp: number;
  source?: 'ai' | 'ai_edited' | 'manual';
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  phase: number;
  fileName: string | null;
  rawMarkdown: string | null;
  chapters: Chapter[];
  config: TranslationConfig;
  bookTitle?: string;
  author?: string;
  pronounTable?: string;
  usePronouns?: boolean;
  glossaryTable?: string;
  useGlossary?: boolean;
  pronounVersions?: ContentVersion[];
  activePronounVersionId?: string;
  glossaryVersions?: ContentVersion[];
  activeGlossaryVersionId?: string;
  pdfTask?: PdfConversionTask;
  pronounTask?: PronounGenerationTask;
  glossaryTask?: GlossaryGenerationTask;
  totalWords?: number;
  translatedWords?: number;
  splitSettings?: SplitSettings;
  pdfTaskMeta?: { fileName: string; chunkCount: number };
}

export type ProjectMeta = Omit<Project, 'chapters' | 'rawMarkdown' | 'pronounTable' | 'glossaryTable' | 'pdfTask' | 'pronounTask' | 'glossaryTask' | 'pronounVersions' | 'glossaryVersions'>;
export type ProjectAsset = Pick<Project, 'rawMarkdown' | 'pronounTable' | 'glossaryTable' | 'pdfTask' | 'pronounTask' | 'glossaryTask' | 'pronounVersions' | 'glossaryVersions'>;

interface AppDB extends DBSchema {
  settings: {
    key: string;
    value: { id: string; value: unknown };
  };
  projects_meta: {
    key: string;
    value: ProjectMeta;
  };
  project_assets: {
    key: string;
    value: { id: string; data: unknown } | any;
  };
  project_chapters: {
    key: string;
    value: ChapterEntity;
    indexes: { projectId: string };
  };
  project_task_chunks: {
    key: string;
    value: { id: string; taskId: string; index: number; data: any };
    indexes: { taskId: string };
  };
}

@Injectable({ providedIn: 'root' })
export class DbService {
  private dbName = 'MarkdownTranslatorDB';
  private version = 4;
  private platformId = inject(PLATFORM_ID);
  
  private dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

  private async getDB(): Promise<IDBPDatabase<AppDB>> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Not in browser');
    }
    if (!this.dbPromise) {
      this.dbPromise = openDB<AppDB>(this.dbName, this.version, {
        upgrade(db) {
          if (db.objectStoreNames.contains('projects' as any)) {
            db.deleteObjectStore('projects' as any);
          }
          if (!db.objectStoreNames.contains('projects_meta')) {
            db.createObjectStore('projects_meta', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('project_assets')) {
            db.createObjectStore('project_assets', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('project_chapters')) {
            const chapterStore = db.createObjectStore('project_chapters', { keyPath: 'id' });
            chapterStore.createIndex('projectId', 'projectId', { unique: false });
          }
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('project_task_chunks')) {
            const chunkStore = db.createObjectStore('project_task_chunks', { keyPath: 'id' });
            chunkStore.createIndex('taskId', 'taskId', { unique: false });
          }
        },
      });
    }
    return this.dbPromise;
  }

  async getSettings(id: string): Promise<unknown> {
    try {
      const db = await this.getDB();
      const val = await db.get('settings', id);
      return val?.value;
    } catch {
      return undefined;
    }
  }

  async saveSettings(id: string, value: unknown): Promise<void> {
    try {
      const db = await this.getDB();
      await db.put('settings', { id, value });
    } catch (e) {
      console.error('saveSettings error', e);
    }
  }

  async getAllProjects(): Promise<Project[]> {
    try {
      const db = await this.getDB();
      return (await db.getAll('projects_meta')) as Project[];
    } catch {
      return [];
    }
  }

  async getProject(id: string): Promise<Project | undefined> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['projects_meta', 'project_assets', 'project_chapters', 'project_task_chunks'], 'readonly');
      
      const meta = await tx.objectStore('projects_meta').get(id);
      if (!meta) return undefined;
      
      const assetStore = tx.objectStore('project_assets');
      const chunkIndex = tx.objectStore('project_task_chunks').index('taskId');
      const [
        rawMdReq, pronounsReq, glossaryReq, pVersReq, gVersReq, pdfReq, pTaskReq, gTaskReq
      ] = await Promise.all([
        assetStore.get(`${id}_rawMarkdown`),
        assetStore.get(`${id}_pronounTable`),
        assetStore.get(`${id}_glossaryTable`),
        assetStore.get(`${id}_pronounVersions`),
        assetStore.get(`${id}_glossaryVersions`),
        assetStore.get(`${id}_pdfTask`),
        assetStore.get(`${id}_pronounTask`),
        assetStore.get(`${id}_glossaryTask`)
      ]);
      
      const chapReq = await tx.objectStore('project_chapters').index('projectId').getAll(id);
      
      const [pdfChunksReq, pTaskChunksReq, gTaskChunksReq] = await Promise.all([
        chunkIndex.getAll(`${id}_pdfTask`),
        chunkIndex.getAll(`${id}_pronounTask`),
        chunkIndex.getAll(`${id}_glossaryTask`)
      ]);

      await tx.done;
      
      const asset: Partial<ProjectAsset> = {};
      if (rawMdReq) asset.rawMarkdown = rawMdReq.data;
      if (pronounsReq) asset.pronounTable = pronounsReq.data;
      if (glossaryReq) asset.glossaryTable = glossaryReq.data;
      if (pVersReq) asset.pronounVersions = pVersReq.data;
      if (gVersReq) asset.glossaryVersions = gVersReq.data;
      
      if (pdfReq) {
        asset.pdfTask = pdfReq.data;
        if (asset.pdfTask && pdfChunksReq && pdfChunksReq.length > 0) {
          asset.pdfTask.chunks = pdfChunksReq.sort((a,b)=>a.index-b.index).map(c=>c.data);
        }
      }
      if (pTaskReq) {
        asset.pronounTask = pTaskReq.data;
        if (asset.pronounTask && pTaskChunksReq && pTaskChunksReq.length > 0) {
          asset.pronounTask.chunks = pTaskChunksReq.sort((a,b)=>a.index-b.index).map(c=>c.data);
        }
      }
      if (gTaskReq) {
        asset.glossaryTask = gTaskReq.data;
        if (asset.glossaryTask && gTaskChunksReq && gTaskChunksReq.length > 0) {
          asset.glossaryTask.chunks = gTaskChunksReq.sort((a,b)=>a.index-b.index).map(c=>c.data);
        }
      }

      const chapters = chapReq || [];
      chapters.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      
      return {
        ...meta,
        rawMarkdown: asset.rawMarkdown || null,
        pdfTask: asset.pdfTask,
        pronounTask: asset.pronounTask,
        glossaryTask: asset.glossaryTask,
        pronounTable: asset.pronounTable || '',
        glossaryTable: asset.glossaryTable || '',
        pronounVersions: asset.pronounVersions || [],
        glossaryVersions: asset.glossaryVersions || [],
        chapters
      } as Project;
    } catch {
      return undefined;
    }
  }

  async saveProjectMeta(meta: ProjectMeta): Promise<void> {
    try {
      const db = await this.getDB();
      const existing = await db.get('projects_meta', meta.id) || {} as any;
      await db.put('projects_meta', { ...existing, ...meta } as any);
    } catch (e) {
      console.error('saveProjectMeta error', e);
    }
  }

  private async _saveTask(tx: any, projectId: string, assetName: string, data: any) {
    if (!data) {
      await tx.objectStore('project_assets').delete(`${projectId}_${assetName}`);
      const chunkStore = tx.objectStore('project_task_chunks');
      const keys = await chunkStore.index('taskId').getAllKeys(`${projectId}_${assetName}`);
      await Promise.all(keys.map((k: any) => chunkStore.delete(k)));
      return;
    }
    const { chunks, ...meta } = data;
    await tx.objectStore('project_assets').put({ id: `${projectId}_${assetName}`, data: meta });
    if (chunks && Array.isArray(chunks)) {
      const chunkStore = tx.objectStore('project_task_chunks');
      // Delete old chunks first
      const oldKeys = await chunkStore.index('taskId').getAllKeys(`${projectId}_${assetName}`);
      await Promise.all(oldKeys.map((k: any) => chunkStore.delete(k)));
      // Put new chunks
      await Promise.all(chunks.map((c: any, i: number) => chunkStore.put({
        id: `${projectId}_${assetName}_${i}`,
        taskId: `${projectId}_${assetName}`,
        index: i,
        data: c
      })));
    }
  }

  async saveProjectAsset(projectId: string, assetName: string, data: unknown): Promise<void> {
    try {
      const db = await this.getDB();
      const isTask = assetName === 'pdfTask' || assetName === 'pronounTask' || assetName === 'glossaryTask';
      
      if (isTask) {
        const tx = db.transaction(['project_assets', 'project_task_chunks'], 'readwrite');
        await this._saveTask(tx, projectId, assetName, data);
        await tx.done;
      } else {
        await db.put('project_assets', { id: `${projectId}_${assetName}`, data } as any);
      }
    } catch (e) {
      console.error('saveProjectAsset error', e);
    }
  }

  async saveProjectAssets(id: string, assets: ProjectAsset): Promise<void> {
    try {
      const db = await this.getDB();
      await db.put('project_assets', { id, ...assets } as any);
    } catch (e) {
      console.error('saveProjectAssets error', e);
    }
  }

  async saveChapter(projectId: string, chapter: Chapter): Promise<void> {
    try {
      const db = await this.getDB();
      await db.put('project_chapters', { ...chapter, projectId } as ChapterEntity);
    } catch (e) {
      console.error('saveChapter error', e);
    }
  }

  async saveAllChapters(projectId: string, chapters: Chapter[]): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('project_chapters', 'readwrite');
      const store = tx.objectStore('project_chapters');
      
      const idx = store.index('projectId');
      const keys = await idx.getAllKeys(IDBKeyRange.only(projectId));
      await Promise.all(keys.map(key => store.delete(key)));
      
      await Promise.all(chapters.map(chapter => 
        store.put({ ...chapter, projectId } as ChapterEntity)
      ));
      
      await tx.done;
    } catch (e) {
      console.error('saveAllChapters error', e);
    }
  }

  async updateProjectStats(projectId: string, chapters: Chapter[]): Promise<void> {
    try {
      const db = await this.getDB();
      const meta = await db.get('projects_meta', projectId);
      if (meta) {
        let totalWords = 0;
        let translatedWords = 0;
        chapters.forEach(c => {
           totalWords += c.wordCount || 0;
           if (c.status === 'done') translatedWords += c.wordCount || 0;
        });
        meta.totalWords = totalWords;
        meta.translatedWords = translatedWords;
        await db.put('projects_meta', meta);
      }
    } catch {
      // Ignored
    }
  }

  async saveProject(project: Project): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['projects_meta', 'project_assets', 'project_chapters', 'project_task_chunks'], 'readwrite');
      
      let totalWords = 0;
      let translatedWords = 0;
      project.chapters?.forEach(c => {
         totalWords += c.wordCount || 0;
         if (c.status === 'done') translatedWords += c.wordCount || 0;
      });

      const meta: any = {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        phase: project.phase,
        fileName: project.fileName,
        bookTitle: project.bookTitle,
        author: project.author,
        config: project.config,
        usePronouns: project.usePronouns,
        useGlossary: project.useGlossary,
        activePronounVersionId: project.activePronounVersionId,
        activeGlossaryVersionId: project.activeGlossaryVersionId,
        splitSettings: project.splitSettings,
        totalWords,
        translatedWords,
        pdfTaskMeta: project.pdfTask ? { fileName: project.pdfTask.fileName, chunkCount: project.pdfTask.chunks.length } : undefined
      };
      
      await tx.objectStore('projects_meta').put(meta);

      const assetStore = tx.objectStore('project_assets');
      await assetStore.put({ id: `${project.id}_rawMarkdown`, data: project.rawMarkdown } as any);
      await assetStore.put({ id: `${project.id}_pronounTable`, data: project.pronounTable } as any);
      await assetStore.put({ id: `${project.id}_glossaryTable`, data: project.glossaryTable } as any);
      await assetStore.put({ id: `${project.id}_pronounVersions`, data: project.pronounVersions } as any);
      await assetStore.put({ id: `${project.id}_glossaryVersions`, data: project.glossaryVersions } as any);
      
      await this._saveTask(tx, project.id, 'pdfTask', project.pdfTask);
      await this._saveTask(tx, project.id, 'pronounTask', project.pronounTask);
      await this._saveTask(tx, project.id, 'glossaryTask', project.glossaryTask);

      const chapStore = tx.objectStore('project_chapters');
      const idx = chapStore.index('projectId');
      const keys = await idx.getAllKeys(IDBKeyRange.only(project.id));
      await Promise.all(keys.map(key => chapStore.delete(key)));
      
      if (project.chapters) {
        await Promise.all(project.chapters.map(c => 
          chapStore.put({ ...c, projectId: project.id } as ChapterEntity)
        ));
      }

      await tx.done;
    } catch (e) {
      console.error('saveProject error', e);
    }
  }

  async deleteProject(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['projects_meta', 'project_assets', 'project_chapters', 'project_task_chunks'], 'readwrite');
      await tx.objectStore('projects_meta').delete(id);
      
      const assetStore = tx.objectStore('project_assets');
      await assetStore.delete(id);
      await assetStore.delete(`${id}_rawMarkdown`);
      await assetStore.delete(`${id}_pronounTable`);
      await assetStore.delete(`${id}_glossaryTable`);
      await assetStore.delete(`${id}_pronounVersions`);
      await assetStore.delete(`${id}_glossaryVersions`);
      
      await this._saveTask(tx, id, 'pdfTask', null);
      await this._saveTask(tx, id, 'pronounTask', null);
      await this._saveTask(tx, id, 'glossaryTask', null);
      
      const chapStore = tx.objectStore('project_chapters');
      const chapIdx = chapStore.index('projectId');
      const chapKeys = await chapIdx.getAllKeys(IDBKeyRange.only(id));
      await Promise.all(chapKeys.map(key => chapStore.delete(key)));

      await tx.done;
    } catch (e) {
      console.error('deleteProject error', e);
    }
  }
}

