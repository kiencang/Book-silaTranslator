import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Chapter, TranslationConfig } from './book.store';

export interface ChapterEntity extends Chapter {
  projectId: string;
}

export interface PdfConversionChunk {
  index: number;
  base64Pdf?: string;
  markdown?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface PdfConversionTask {
  fileName: string;
  chunks: PdfConversionChunk[];
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
  pdfTask?: PdfConversionTask;
  totalWords?: number;
  translatedWords?: number;
}

export type ProjectMeta = Omit<Project, 'chapters' | 'rawMarkdown' | 'pronounTable' | 'glossaryTable' | 'pdfTask'>;
export type ProjectAsset = Pick<Project, 'rawMarkdown' | 'pronounTable' | 'glossaryTable' | 'pdfTask'>;

@Injectable({ providedIn: 'root' })
export class DbService {
  private dbName = 'MarkdownTranslatorDB';
  private storeName = 'projects';
  private version = 3;
  private platformId = inject(PLATFORM_ID);

  private getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (!isPlatformBrowser(this.platformId)) {
        return reject('Not in browser');
      }
      const request = indexedDB.open(this.dbName, this.version);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (db.objectStoreNames.contains('projects')) {
          db.deleteObjectStore('projects');
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
      };
    });
  }

  async getSettings(id: string): Promise<unknown> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('settings', 'readonly');
        const store = transaction.objectStore('settings');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result?.value);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return undefined;
    }
  }

  async saveSettings(id: string, value: unknown): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('settings', 'readwrite');
        const store = transaction.objectStore('settings');
        const request = store.put({ id, value });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('saveSettings error', e);
    }
  }

  async getAllProjects(): Promise<Project[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('projects_meta', 'readonly');
        const store = transaction.objectStore('projects_meta');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }

  async getProject(id: string): Promise<Project | undefined> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['projects_meta', 'project_assets', 'project_chapters'], 'readonly');
        
        const metaReq = tx.objectStore('projects_meta').get(id);
        const assetStore = tx.objectStore('project_assets');
        const rawMdReq = assetStore.get(`${id}_rawMarkdown`);
        const pronounsReq = assetStore.get(`${id}_pronounTable`);
        const glossaryReq = assetStore.get(`${id}_glossaryTable`);
        const pdfReq = assetStore.get(`${id}_pdfTask`);
        
        const chapReq = tx.objectStore('project_chapters').index('projectId').getAll(id);
        
        tx.oncomplete = () => {
          const meta = metaReq.result;
          if (!meta) return resolve(undefined);
          
          const asset: Partial<ProjectAsset> = {};
          if (rawMdReq.result) asset.rawMarkdown = rawMdReq.result.data;
          if (pronounsReq.result) asset.pronounTable = pronounsReq.result.data;
          if (glossaryReq.result) asset.glossaryTable = glossaryReq.result.data;
          if (pdfReq.result) asset.pdfTask = pdfReq.result.data;

          const chapters = chapReq.result || [];
          chapters.sort((a: ChapterEntity, b: ChapterEntity) => (a.order ?? 0) - (b.order ?? 0));
          
          resolve({
            ...meta,
            rawMarkdown: asset.rawMarkdown || null,
            pdfTask: asset.pdfTask,
            pronounTable: asset.pronounTable || '',
            glossaryTable: asset.glossaryTable || '',
            chapters
          });
        };
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      return undefined;
    }
  }

  async saveProjectMeta(meta: ProjectMeta): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('projects_meta', 'readwrite');
        const store = tx.objectStore('projects_meta');
        
        const req = store.get(meta.id);
        req.onsuccess = () => {
           const existing = req.result || {};
           const request = store.put({ ...existing, ...meta });
           request.onsuccess = () => resolve();
           request.onerror = () => reject(request.error);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error('saveProjectMeta error', e);
    }
  }

  async saveProjectAsset(projectId: string, assetName: string, data: unknown): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('project_assets', 'readwrite');
        const store = tx.objectStore('project_assets');
        const request = store.put({ id: `${projectId}_${assetName}`, data });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('saveProjectAsset error', e);
    }
  }

  async saveProjectAssets(id: string, assets: ProjectAsset): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('project_assets', 'readwrite');
        const store = tx.objectStore('project_assets');
        const request = store.put({ id, ...assets });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('saveProjectAssets error', e);
    }
  }

  async saveChapter(projectId: string, chapter: Chapter): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('project_chapters', 'readwrite');
        const store = tx.objectStore('project_chapters');
        const request = store.put({ ...chapter, projectId });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('saveChapter error', e);
    }
  }

  async saveAllChapters(projectId: string, chapters: Chapter[]): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('project_chapters', 'readwrite');
        const store = tx.objectStore('project_chapters');
        
        let i = 0;
        function putNext() {
            if (i < chapters.length) {
                store.put({ ...chapters[i], projectId }).onsuccess = putNext;
                i++;
            }
        }
        putNext();

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.error('saveAllChapters error', e);
    }
  }

  async updateProjectStats(projectId: string, chapters: Chapter[]): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('projects_meta', 'readwrite');
        const store = tx.objectStore('projects_meta');
        const req = store.get(projectId);
        req.onsuccess = () => {
           const meta = req.result;
           if (meta) {
              let totalWords = 0;
              let translatedWords = 0;
              chapters.forEach(c => {
                 totalWords += c.wordCount || 0;
                 if (c.status === 'done') translatedWords += c.wordCount || 0;
              });
              meta.totalWords = totalWords;
              meta.translatedWords = translatedWords;
              store.put(meta);
           }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Ignored
    }
  }

  async saveProject(project: Project): Promise<void> {
    // Keep for full backup imports
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['projects_meta', 'project_assets', 'project_chapters'], 'readwrite');
        
        let totalWords = 0;
        let translatedWords = 0;
        project.chapters?.forEach(c => {
           totalWords += c.wordCount || 0;
           if (c.status === 'done') translatedWords += c.wordCount || 0;
        });

        const meta = {
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
          totalWords,
          translatedWords,
          pdfTaskMeta: project.pdfTask ? { fileName: project.pdfTask.fileName, chunkCount: project.pdfTask.chunks.length } : undefined
        };
        tx.objectStore('projects_meta').put(meta);

        const assetStore = tx.objectStore('project_assets');
        assetStore.put({ id: `${project.id}_rawMarkdown`, data: project.rawMarkdown });
        assetStore.put({ id: `${project.id}_pronounTable`, data: project.pronounTable });
        assetStore.put({ id: `${project.id}_glossaryTable`, data: project.glossaryTable });
        assetStore.put({ id: `${project.id}_pdfTask`, data: project.pdfTask });

        const chapStore = tx.objectStore('project_chapters');
        project.chapters?.forEach(c => chapStore.put({ ...c, projectId: project.id }));

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.error('saveProject error', e);
    }
  }

  async deleteProject(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['projects_meta', 'project_assets', 'project_chapters'], 'readwrite');
        tx.objectStore('projects_meta').delete(id);
        const assetStore = tx.objectStore('project_assets');
        assetStore.delete(id);
        assetStore.delete(`${id}_rawMarkdown`);
        assetStore.delete(`${id}_pronounTable`);
        assetStore.delete(`${id}_glossaryTable`);
        assetStore.delete(`${id}_pdfTask`);
        
        // Remove chapters manually since we don't have cascade
        const chapStore = tx.objectStore('project_chapters');
        const idx = chapStore.index('projectId');
        const req = idx.openCursor(IDBKeyRange.only(id));
        req.onsuccess = (e: Event) => {
           const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
           if (cursor) {
              cursor.delete();
              cursor.continue();
           }
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.error('deleteProject error', e);
    }
  }
}
