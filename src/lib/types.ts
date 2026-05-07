export interface Task {
  id: string;
  title: string;
  description: string;
  priority: number;
  status: 'todo' | 'in_progress' | 'done' | 'archived';
  due_date: string | null;
  reminder_time: string | null;
  repeat_rule: string | null;
  parent_id: string | null;
  list_id: string | null;
  tags: string; // JSON array string
  sort_order: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TaskList {
  id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  archived: boolean;
  created_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: number;
  due_date?: string | null;
  reminder_time?: string | null;
  repeat_rule?: string | null;
  parent_id?: string | null;
  list_id?: string | null;
  tags?: string[];
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string;
  priority?: number;
  status?: string;
  due_date?: string | null;
  reminder_time?: string | null;
  repeat_rule?: string | null;
  parent_id?: string | null;
  list_id?: string | null;
  tags?: string[];
  sort_order?: number;
}

export interface CreateListInput {
  name: string;
  color?: string;
  icon?: string;
}

export interface UpdateListInput {
  id: string;
  name?: string;
  color?: string;
  icon?: string;
  sort_order?: number;
  archived?: boolean;
}

export type Priority = 0 | 1 | 2 | 3;

export const PRIORITY_CONFIG = {
  0: { label: 'P0 紧急', color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400' },
  1: { label: 'P1 高', color: 'bg-orange-500', textColor: 'text-orange-600 dark:text-orange-400' },
  2: { label: 'P2 中', color: 'bg-blue-500', textColor: 'text-blue-600 dark:text-blue-400' },
  3: { label: 'P3 低', color: 'bg-gray-400', textColor: 'text-gray-500 dark:text-gray-400' },
} as const;

export const SMART_LISTS = [
  { id: 'smart-today', name: '今天', icon: '📅', filter: { type: 'today' as const } },
  { id: 'smart-week', name: '本周', icon: '📆', filter: { type: 'week' as const } },
  { id: 'smart-overdue', name: '逾期', icon: '⚠️', filter: { type: 'overdue' as const } },
  { id: 'smart-important', name: '重要', icon: '⭐', filter: { type: 'important' as const } },
  { id: 'smart-all', name: '全部', icon: '📋', filter: { type: 'all' as const } },
] as const;

export type ViewMode = 'list' | 'board' | 'calendar';
