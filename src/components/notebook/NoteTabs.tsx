import { useNoteStore } from '../../stores/noteStore';
import type { Note } from '../../lib/noteTypes';

interface Props {
  notes: Note[];
}

export default function NoteTabs({ notes }: Props) {
  const { openTabs, activeNoteId, setActiveNote, closeTab, moveTab } = useNoteStore();

  if (openTabs.length === 0) return null;

  const handleContextMenu = (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    // Simple context menu via native menu
    const choice = window.confirm(`关闭笔记 "${notes.find((n) => n.id === noteId)?.title || noteId}"?`);
    if (choice) closeTab(noteId);
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
    if (!isNaN(fromIdx) && fromIdx !== toIdx) {
      moveTab(fromIdx, toIdx);
    }
  };

  return (
    <div className="flex items-center bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
      {openTabs.map((tab, idx) => {
        const note = notes.find((n) => n.id === tab.noteId);
        if (!note) return null;
        const isActive = tab.noteId === activeNoteId;

        return (
          <div
            key={tab.noteId}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, idx)}
            onClick={() => setActiveNote(tab.noteId)}
            onContextMenu={(e) => handleContextMenu(e, tab.noteId)}
            className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r border-slate-200 dark:border-slate-700 flex-shrink-0 max-w-[180px] transition-colors ${
              isActive
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <span className="text-slate-400 flex-shrink-0">
              {note.is_pinned ? '📌' : '📝'}
            </span>
            <span className="truncate flex-1">{note.title || '未命名'}</span>
            <button
              onClick={(e) => { e.stopPropagation(); closeTab(tab.noteId); }}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
