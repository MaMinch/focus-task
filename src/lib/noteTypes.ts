export interface Note {
  id: string;
  title: string;
  content: string;
  language: string;
  task_id: string | null;
  list_id: string | null;
  tags: string;
  is_pinned: boolean;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const NOTE_LANGUAGES: { id: string; label: string }[] = [
  { id: 'markdown', label: 'Markdown' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'json', label: 'JSON' },
  { id: 'css', label: 'CSS' },
  { id: 'python', label: 'Python' },
  { id: 'yaml', label: 'YAML' },
  { id: 'plaintext', label: 'Plain Text' },
];

export interface CreateNoteInput {
  title: string;
  content?: string;
  language?: string;
  task_id?: string | null;
  list_id?: string | null;
  tags?: string[];
}

export interface UpdateNoteInput {
  id: string;
  title?: string;
  content?: string;
  language?: string;
  task_id?: string | null;
  list_id?: string | null;
  tags?: string[];
  is_pinned?: boolean;
  is_archived?: boolean;
  sort_order?: number;
}
