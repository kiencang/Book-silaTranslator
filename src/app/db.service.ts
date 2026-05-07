import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  phase: number;
  fileName: string | null;
  rawMarkdown: string | null;
  chapters: any[];
  config: any;
  bookTitle?: string;
  author?: string;
}

@Injectable({ providedIn: 'root' })
export class DbService {
  private dbName = 'MarkdownTranslatorDB';
  private storeName = 'projects';
  private version = 1;
  private platformId = inject(PLATFORM_ID);

  private getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (!isPlatformBrowser(this.platformId)) {
        return reject('Not in browser');
      }
      const request = indexedDB.open(this.dbName, this.version);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async getAllProjects(): Promise<Project[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
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
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return undefined;
    }
  }

  async saveProject(project: Project): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(project);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {}
  }

  async deleteProject(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {}
  }
}
