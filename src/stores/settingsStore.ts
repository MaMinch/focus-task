import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsState {
  theme: ThemeMode;
  autoStart: boolean;
  notifications: boolean;
  language: 'zh' | 'en';
  setTheme: (theme: ThemeMode) => void;
  setAutoStart: (v: boolean) => void;
  setNotifications: (v: boolean) => void;
  setLanguage: (v: 'zh' | 'en') => void;
  applyTheme: () => void;
}

const STORAGE_KEY = 'focustask-settings';

function loadSettings(): Partial<SettingsState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveSettings(state: Partial<SettingsState>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      theme: state.theme,
      autoStart: state.autoStart,
      notifications: state.notifications,
      language: state.language,
    }));
  } catch {}
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const saved = loadSettings();

  return {
    theme: saved.theme || 'system',
    autoStart: saved.autoStart ?? false,
    notifications: saved.notifications ?? true,
    language: saved.language || 'zh',

    setTheme: (theme) => {
      set({ theme });
      saveSettings({ ...get(), theme });
      get().applyTheme();
    },

    setAutoStart: (autoStart) => {
      set({ autoStart });
      saveSettings({ ...get(), autoStart });
    },

    setNotifications: (notifications) => {
      set({ notifications });
      saveSettings({ ...get(), notifications });
    },

    setLanguage: (language) => {
      set({ language });
      saveSettings({ ...get(), language });
    },

    applyTheme: () => {
      const { theme } = get();
      const root = document.documentElement;
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
      } else {
        root.classList.toggle('dark', theme === 'dark');
      }
    },
  };
});
