import { create } from 'zustand';
import type { Task, CreateTaskInput } from '../lib/types';
import * as api from '../lib/api';

interface TaskState {
  tasks: Task[];
  subtasks: Task[];
  loading: boolean;
  selectedTaskId: string | null;
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

  // Selection
  selectTask: (id: string) => void;
  clearSelection: () => void;

  // Subtasks
  fetchSubtasks: (parentId: string) => Promise<void>;
  addSubtask: (parentId: string, title: string) => Promise<void>;
  removeSubtask: (id: string) => Promise<void>;

  // Search
  searchTasks: (query: string) => Promise<Task[]>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  subtasks: [],
  loading: false,
  selectedTaskId: null,
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
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      subtasks: s.subtasks.filter((t) => t.id !== id),
    }));
  },

  toggleComplete: async (id) => {
    const result = await api.completeTask(id);
    if (result) {
      // Recurring task: update the task in the list with the new state
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === id ? result : t)),
        subtasks: s.subtasks.map((t) => (t.id === id ? result : t)),
      }));
      // Re-fetch subtasks if this was a subtask being toggled
      if (result.parent_id) {
        get().fetchSubtasks(result.parent_id);
      }
    } else {
      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === id ? { ...t, status: 'done' as const, completed_at: new Date().toISOString() } : t
        ),
        subtasks: s.subtasks.map((t) =>
          t.id === id ? { ...t, status: 'done' as const, completed_at: new Date().toISOString() } : t
        ),
      }));
    }
  },

  setFilter: (partial) =>
    set((s) => ({ filter: { ...s.filter, ...partial } })),

  clearFilter: () =>
    set({
      filter: { listId: null, status: 'active', priority: null, smartFilter: null, searchQuery: '' },
    }),

  // Selection
  selectTask: (id: string) => set({ selectedTaskId: id }),
  clearSelection: () => set({ selectedTaskId: null, subtasks: [] }),

  // Subtasks
  fetchSubtasks: async (parentId: string) => {
    try {
      const subtasks = await api.getSubtasks(parentId);
      set({ subtasks });
    } catch (e) {
      console.error('fetchSubtasks error:', e);
    }
  },

  addSubtask: async (parentId: string, title: string) => {
    try {
      const task = await api.createTask({ title, parent_id: parentId, priority: 2 });
      set((s) => ({ subtasks: [...s.subtasks, task] }));
    } catch (e) {
      console.error('addSubtask error:', e);
    }
  },

  removeSubtask: async (id: string) => {
    try {
      await api.deleteTask(id);
      set((s) => ({ subtasks: s.subtasks.filter((t) => t.id !== id) }));
    } catch (e) {
      console.error('removeSubtask error:', e);
    }
  },

  // Search
  searchTasks: async (query: string) => {
    return api.searchTasks(query);
  },
}));
