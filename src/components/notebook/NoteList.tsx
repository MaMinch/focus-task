import { useNoteStore } from '../../stores/noteStore';
import type { Note } from '../../lib/noteTypes';

interface Props {
  notes: Note[];
  filter: string;
  onTagClick: (tag: string) => void;
}

export default function NoteList({ notes, filter, onTagClick }: Props) {
  const { openTab, activeNoteId, togglePin, toggleArchive } = useNoteStore();

  const displayed = notes.filter((n) => {
    if (filter) {
      try {
        const tags: string[] = JSON.parse(n.tags || '[]');
        return tags.includes(filter);
      } catch { return false; }
    }
    return true;
  });

  // Collect all unique tags
  const allTags = [...new Set(notes.flatMap((n) => {
    try { return JSON.parse(n.tags || '[]') as string[]; }
    catch { return []; }
  }))].sort();

  return (
    <div className="flex flex-col h-full">
      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-1">
          {filter && (
            <button
              onClick={() => onTagClick('')}
              className="text-xs px-2 py-0.5 rounded-full bg-primary-500 text-white"
            >
              × 清除
            </button>
          )}
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick(tag === filter ? '' : tag)}
              className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                filter === tag
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Note list */}
      <div className="flex-1 overflow-y-auto">
        {displayed.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            暂无笔记
          </div>
        ) : (
          displayed.map((note) => {
            const isActive = note.id === activeNoteId;
            return (
              <div
                key={note.id}
                onClick={() => openTab(note.id)}
                className={`group flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-700/50 cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/20'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {note.is_pinned && <span className="text-xs">📌</span>}
                    <span className={`text-sm truncate ${isActive ? 'text-primary-700 dark:text-primary-300 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                      {note.title || '未命名'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400">{note.language}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(note.updated_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePin(note.id); }}
                    className="p-0.5 text-slate-400 hover:text-amber-500"
                    title={note.is_pinned ? '取消置顶' : '置顶'}
                  >
                    📌
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleArchive(note.id); }}
                    className="p-0.5 text-slate-400 hover:text-blue-500"
                    title="归档"
                  >
                    📦
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
