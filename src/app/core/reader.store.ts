import { Injectable, inject, signal } from '@angular/core';
import { DbService } from './db';

export interface ReaderPreferences {
  fontSize: number;
  theme: 'white' | 'sepia' | 'dark';
  fontFamily: 'Inter' | 'Lora' | 'Lexend';
  isToolbarExpanded: boolean;
}

const DEFAULT_PREFS: ReaderPreferences = {
  fontSize: 18,
  theme: 'sepia',
  fontFamily: 'Inter',
  isToolbarExpanded: true
};

const SETTINGS_KEY = 'sila_reader_prefs_vx1';

@Injectable({ providedIn: 'root' })
export class ReaderStore {
  private db = inject(DbService);
  
  prefs = signal<ReaderPreferences>(DEFAULT_PREFS);
  
  constructor() {
    this.loadPrefs();
  }
  
  private async loadPrefs() {
    const saved = await this.db.getSettings(SETTINGS_KEY);
    if (saved) {
      this.prefs.set({ ...DEFAULT_PREFS, ...saved });
    }
  }
  
  async updatePrefs(newPrefs: Partial<ReaderPreferences>) {
    const updated = { ...this.prefs(), ...newPrefs };
    this.prefs.set(updated);
    await this.db.saveSettings(SETTINGS_KEY, updated);
  }

  async resetPrefs() {
    this.prefs.set({ ...DEFAULT_PREFS });
    await this.db.saveSettings(SETTINGS_KEY, DEFAULT_PREFS);
  }
}
