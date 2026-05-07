import { create } from 'zustand';
import type { Task, CreateTaskInput } from '../lib/types';
import * as api from '../lib/api';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  filter: {
    listId: string | null;
    status: string;
    priority: number | null;
    smartFilter: string | null;
    searchQuery: string;
  };

  fetchTasks: () => Promise<void>;
  addTask: (input: CreateTaskInput) => Promise<Task>;
  editTask: (id: string, updates: Partial<Task>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  setFilter: (filter: Partial<TaskState['filter']>) => void;
  clearFilter: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  filter: {
    listId: null,
    status: 'active',
    priority: null,
    smartFilter: null,
    searchQuery: '',
  },

  fetchTasks: async () => {
    set({ loading: true });
    try {
      const { filter } = get();
      // If a smart filter is active, handle it on the frontend
      const status = filter.smartFilter ? 'all' : filter.status;
      const tasks = await api.getTasks({
        list_id: filter.listId || undefined,
        status,
        priority: filter.priority || undefined,
      });

      // Apply smart filter on the frontend
      let filtered = tasks;
      if (filter.smartFilter) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekEnd = new Date(today.getTime() + 7 * 86400000);

        switch (filter.smartFilter) {
          case 'today':
            filtered = tasks.filter((t) => {
              if (!t.due_date) return false;
              const d = new Date(t.due_date);
              return d >= today && d < new Date(today.getTime() + 86400000);
            });
            break;
          case 'week':
            filtered = tasks.filter((t) => {
              if (!t.due_date) return false;
              const d = new Date(t.due_date);
              return d >= today && d < weekEnd;
            });
            break;
          case 'overdue':
            filtered = tasks.filter((t) => {
              if (!t.due_date || t.status === 'done') return false;
              return new Date(t.due_date) < today;
            });
            break;
          case 'important':
            filtered = tasks.filter((t) => t.priority <= 1);
            break;
          case 'all':
            // no filter
            break;
        }
      }

      set({ tasks: filtered, loading: false });
    } catch (e) {
      console.error('fetchTasks error:', e);
      set({ loading: false });
    }
  },

  addTask: async (input: CreateTaskInput) => {
    const task = await api.createTask(input);
    set((s) => ({ tasks: [...s.tasks, task] }));
    return task;
  },

  editTask: async (id, updates) => {
    const apiUpdates: any = { id };
    for (const [key, val] of Object.entries(updates)) {
      if (key === 'tags' && typeof val === 'string') {
        try { apiUpdates.tags = JSON.parse(val); } catch { apiUpdates.tags = []; }
      } else {
        apiUpdates[key] = val;
      }
    }
    await api.updateTask(apiUpdates);
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },

  removeTask: async (id) => {
    await api.deleteTask(id);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  toggleComplete: async (id) => {
    await api.completeTask(id);
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, status: 'done' as const, completed_at: new Date().toISOString() } : t
      ),
    }));
  },

  setFilter: (partial) =>
    set((s) => ({ filter: { ...s.filter, ...partial } })),

  clearFilter: () =>
    set({
      filter: { listId: null, status: 'active', priority: null, smartFilter: null, searchQuery: '' },
    }),
}));
