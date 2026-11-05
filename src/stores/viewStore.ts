import { create } from 'zustand';

export type ViewMode = 'list' | 'board' | 'calendar' | 'notebook';

interface ViewState {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  mode: 'list',
  setMode: (mode) => set({ mode }),
}));
