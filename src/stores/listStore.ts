import { create } from 'zustand';
import type { TaskList } from '../lib/types';
import * as api from '../lib/api';

interface ListState {
  lists: TaskList[];
  selectedListId: string | null;
  loading: boolean;

  fetchLists: () => Promise<void>;
  selectList: (id: string | null) => void;
  addList: (name: string, color?: string, icon?: string) => Promise<TaskList>;
  updateList: (id: string, updates: Partial<TaskList>) => Promise<void>;
  removeList: (id: string) => Promise<void>;
  archiveList: (id: string) => Promise<void>;
}

export const useListStore = create<ListState>((set) => ({
  lists: [],
  selectedListId: null,
  loading: false,

  fetchLists: async () => {
    set({ loading: true });
    try {
      const lists = await api.getLists();
      set({ lists, loading: false });
    } catch (e) {
      console.error('fetchLists error:', e);
      set({ loading: false });
    }
  },

  selectList: (id) => set({ selectedListId: id }),

  addList: async (name, color, icon) => {
    const list = await api.createList({ name, color, icon });
    set((s) => ({ lists: [...s.lists, list] }));
    return list;
  },

  updateList: async (id, updates) => {
    await api.updateList({ id, ...updates });
    set((s) => ({
      lists: s.lists.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    }));
  },

  removeList: async (id) => {
    await api.deleteList(id);
    set((s) => ({
      lists: s.lists.filter((l) => l.id !== id),
      selectedListId: s.selectedListId === id ? null : s.selectedListId,
    }));
  },

  archiveList: async (id) => {
    await api.archiveList(id);
    set((s) => ({
      lists: s.lists.map((l) => (l.id === id ? { ...l, archived: true } : l)),
      selectedListId: s.selectedListId === id ? null : s.selectedListId,
    }));
  },
}));
