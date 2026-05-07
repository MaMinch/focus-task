import { invoke } from '@tauri-apps/api/core';
import type {
  Task, TaskList,
  CreateTaskInput, UpdateTaskInput,
  CreateListInput, UpdateListInput,
} from './types';

// ── Task API ──
export async function createTask(input: CreateTaskInput): Promise<Task> {
  return invoke('create_task', { input });
}

export async function getTasks(params: {
  list_id?: string;
  status?: string;
  priority?: number;
}): Promise<Task[]> {
  return invoke('get_tasks', {
    listId: params.list_id || null,
    status: params.status || null,
    priority: params.priority ?? null,
  });
}

export async function updateTask(input: UpdateTaskInput): Promise<void> {
  return invoke('update_task', { input });
}

export async function deleteTask(id: string): Promise<void> {
  return invoke('delete_task', { id });
}

export async function completeTask(id: string): Promise<void> {
  return invoke('complete_task', { id });
}

// ── List API ──
export async function createList(input: CreateListInput): Promise<TaskList> {
  return invoke('create_list', { input });
}

export async function getLists(includeArchived?: boolean): Promise<TaskList[]> {
  return invoke('get_lists', { includeArchived });
}

export async function updateList(input: UpdateListInput): Promise<void> {
  return invoke('update_list', { input });
}

export async function deleteList(id: string): Promise<void> {
  return invoke('delete_list', { id });
}

export async function archiveList(id: string): Promise<void> {
  return invoke('archive_list', { id });
}
