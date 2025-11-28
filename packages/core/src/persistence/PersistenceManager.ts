import type { PlaygroundSnapshot } from '../engine/types';

export class PersistenceManager {
  private storageKey: string;
  private autoSaveInterval: number | null = null;

  constructor(playgroundId: string = 'default') {
    this.storageKey = `playground-${playgroundId}`;
  }

  async saveSnapshot(snapshot: PlaygroundSnapshot): Promise<void> {
    try {
      const serialized = JSON.stringify(snapshot);
      localStorage.setItem(this.storageKey, serialized);
    } catch (error) {
      console.error('Failed to save snapshot:', error);
      throw new Error('Failed to save playground state');
    }
  }

  async loadSnapshot(): Promise<PlaygroundSnapshot | null> {
    try {
      const serialized = localStorage.getItem(this.storageKey);
      if (!serialized) return null;

      return JSON.parse(serialized);
    } catch (error) {
      console.error('Failed to load snapshot:', error);
      return null;
    }
  }

  enableAutoSave(callback: () => Promise<PlaygroundSnapshot>, interval: number = 30000): void {
    this.disableAutoSave();

    this.autoSaveInterval = window.setInterval(async () => {
      try {
        const snapshot = await callback();
        await this.saveSnapshot(snapshot);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, interval);
  }

  disableAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  clearSnapshot(): void {
    localStorage.removeItem(this.storageKey);
  }

  exportSnapshot(snapshot: PlaygroundSnapshot): string {
    return JSON.stringify(snapshot, null, 2);
  }

  importSnapshot(data: string): PlaygroundSnapshot | null {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to import snapshot:', error);
      return null;
    }
  }
}
