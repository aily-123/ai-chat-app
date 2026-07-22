import { create } from 'zustand';
import type { AppSettings } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/types';
import { backendApi } from '../api/backendApi';

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (partial: Partial<AppSettings>) => Promise<void>;
  reset: () => Promise<void>;
}

// 获取API实例
const getApi = () => {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return (window as any).electronAPI;
  }
  return backendApi;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  loaded: false,

  load: async () => {
    try {
      const api = getApi();
      const all = await api.settings.getAll();
      set({ settings: all, loaded: true });
    } catch (err) {
      console.error('Failed to load settings:', err);
      set({ loaded: true });
    }
  },

  update: async (partial: Partial<AppSettings>) => {
    const newSettings = { ...get().settings, ...partial };
    set({ settings: newSettings });

    // 持久化到存储
    try {
      const api = getApi();
      if (partial.apiKey !== undefined)
        await api.settings.set('apiKey', partial.apiKey);
      if (partial.apiBase !== undefined)
        await api.settings.set('apiBase', partial.apiBase);
      if (partial.model !== undefined)
        await api.settings.set('model', partial.model);
      if (partial.temperature !== undefined)
        await api.settings.set('temperature', String(partial.temperature));
      if (partial.maxTokens !== undefined)
        await api.settings.set('maxTokens', String(partial.maxTokens));
      if (partial.theme !== undefined)
        await api.settings.set('theme', partial.theme);
      if (partial.wallpaper !== undefined)
        await api.settings.set('wallpaper', partial.wallpaper);
      if (partial.wallpaperOpacity !== undefined)
        await api.settings.set('wallpaperOpacity', String(partial.wallpaperOpacity));
      if (partial.wallpaperFilter !== undefined)
        await api.settings.set('wallpaperFilter', partial.wallpaperFilter);
      if (partial.wallpaperAnimation !== undefined)
        await api.settings.set('wallpaperAnimation', partial.wallpaperAnimation);
      if (partial.webSearchEnabled !== undefined)
        await api.settings.set('webSearchEnabled', String(partial.webSearchEnabled));
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  },

  reset: async () => {
    set({ settings: { ...DEFAULT_SETTINGS } });
    try {
      const api = getApi();
      await api.settings.set('apiKey', '');
      await api.settings.set('apiBase', DEFAULT_SETTINGS.apiBase);
      await api.settings.set('model', DEFAULT_SETTINGS.model);
      await api.settings.set('temperature', String(DEFAULT_SETTINGS.temperature));
      await api.settings.set('maxTokens', String(DEFAULT_SETTINGS.maxTokens));
      await api.settings.set('theme', DEFAULT_SETTINGS.theme);
      await api.settings.set('wallpaper', DEFAULT_SETTINGS.wallpaper);
      await api.settings.set('wallpaperOpacity', String(DEFAULT_SETTINGS.wallpaperOpacity));
      await api.settings.set('wallpaperFilter', DEFAULT_SETTINGS.wallpaperFilter);
      await api.settings.set('wallpaperAnimation', DEFAULT_SETTINGS.wallpaperAnimation);
      await api.settings.set('webSearchEnabled', String(DEFAULT_SETTINGS.webSearchEnabled));
    } catch (err) {
      console.error('Failed to reset settings:', err);
    }
  },
}));
