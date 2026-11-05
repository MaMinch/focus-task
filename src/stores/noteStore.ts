import { create } from 'zustand';
import type { Note, CreateNoteInput } from '../lib/noteTypes';
import * as api from '../lib/noteApi';

interface TabInfo {
  noteId: string;
  lastCursor?: number;
}

interface NoteState {
  notes: Note[];
  openTabs: TabInfo[];
  activeNoteId: string | null;
  loading: boolean;
  filter: string; // tag filter

  fetchNotes: () => Promise<void>;
  addNote: (input: CreateNoteInput) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  removeNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;

  // Tabs
  openTab: (noteId: string) => void;
  closeTab: (noteId: string) => void;
  setActiveNote: (noteId: string) => void;
  moveTab: (from: number, to: number) => void;
  setTabCursor: (noteId: string, cursor: number) => void;

  // Filter
  setFilter: (tag: string) => void;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  openTabs: [],
  activeNoteId: null,
  loading: false,
  filter: '',

  fetchNotes: async () => {
    set({ loading: true });
    try {
      const notes = await api.getNotes(false);
      set({ notes, loading: false });
    } catch (e) {
      console.error('fetchNotes error:', e);
      set({ loading: false });
    }
  },

  addNote: async (input) => {
    const note = await api.createNote(input);
    set((s) => ({
      notes: [note, ...s.notes],
      openTabs: [{ noteId: note.id }, ...s.openTabs],
      activeNoteId: note.id,
    }));
    return note;
  },

  updateNote: async (id, updates) => {
    const apiUpdates: any = { id };
    for (const [key, val] of Object.entries(updates)) {
      if (key === 'tags' && typeof val === 'string') {
        try { apiUpdates.tags = JSON.parse(val); } catch { apiUpdates.tags = []; }
      } else if (key === 'is_pinned' || key === 'is_archived') {
        apiUpdates[key] = val;
      } else {
        apiUpdates[key] = val;
      }
    }
    await api.updateNote(apiUpdates);
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    }));
  },

  removeNote: async (id) => {
    await api.deleteNote(id);
    const state = get();
    // Close tab if open
    const newTabs = state.openTabs.filter((t) => t.noteId !== id);
    const activeId = state.activeNoteId === id
      ? (newTabs.length > 0 ? newTabs[0].noteId : null)
      : state.activeNoteId;
    set({
      notes: state.notes.filter((n) => n.id !== id),
      openTabs: newTabs,
      activeNoteId: activeId,
    });
  },

  togglePin: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    await api.updateNote({ id, is_pinned: !note.is_pinned });
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, is_pinned: !n.is_pinned } : n)),
    }));
  },

  toggleArchive: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    await api.updateNote({ id, is_archived: !note.is_archived });
    // Close tab & remove from list
    const newTabs = get().openTabs.filter((t) => t.noteId !== id);
    const activeId = get().activeNoteId === id
      ? (newTabs.length > 0 ? newTabs[0].noteId : null)
      : get().activeNoteId;
    set({
      notes: get().notes.filter((n) => n.id !== id),
      openTabs: newTabs,
      activeNoteId: activeId,
    });
  },

  // Tabs
  openTab: (noteId) => {
    set((s) => {
      if (s.openTabs.some((t) => t.noteId === noteId)) {
        return { activeNoteId: noteId };
      }
      return {
        openTabs: [...s.openTabs, { noteId }],
        activeNoteId: noteId,
      };
    });
  },

  closeTab: (noteId) => {
    const state = get();
    const idx = state.openTabs.findIndex((t) => t.noteId === noteId);
    const newTabs = state.openTabs.filter((t) => t.noteId !== noteId);
    let activeId = state.activeNoteId;
    if (activeId === noteId) {
      if (newTabs.length === 0) {
        activeId = null;
      } else if (idx < newTabs.length) {
        activeId = newTabs[idx].noteId;
      } else {
        activeId = newTabs[newTabs.length - 1].noteId;
      }
    }
    set({ openTabs: newTabs, activeNoteId: activeId });
  },

  setActiveNote: (noteId) => set({ activeNoteId: noteId }),

  moveTab: (from, to) => {
    set((s) => {
      const tabs = [...s.openTabs];
      const [moved] = tabs.splice(from, 1);
      tabs.splice(to, 0, moved);
      return { openTabs: tabs };
    });
  },

  setTabCursor: (noteId, cursor) => {
    set((s) => ({
      openTabs: s.openTabs.map((t) => (t.noteId === noteId ? { ...t, lastCursor: cursor } : t)),
    }));
  },

  setFilter: (filter) => set({ filter }),
}));
