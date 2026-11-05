import { invoke } from '@tauri-apps/api/core';
import type { Note, CreateNoteInput, UpdateNoteInput } from './noteTypes';

export async function createNote(input: CreateNoteInput): Promise<Note> {
  return invoke('create_note', { input });
}

export async function getNotes(archived?: boolean, taskId?: string): Promise<Note[]> {
  return invoke('get_notes', { archived: archived ?? false, taskId: taskId ?? null });
}

export async function getNote(id: string): Promise<Note | null> {
  return invoke('get_note', { id });
}

export async function updateNote(input: UpdateNoteInput): Promise<void> {
  return invoke('update_note', { input });
}

export async function deleteNote(id: string): Promise<void> {
  return invoke('delete_note', { id });
}

export async function searchNotes(query: string): Promise<Note[]> {
  return invoke('search_notes', { query });
}
