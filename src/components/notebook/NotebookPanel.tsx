import { useEffect, useState, useRef, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useNoteStore } from '../../stores/noteStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { NOTE_LANGUAGES } from '../../lib/noteTypes';
import NoteEditor from './NoteEditor';
import NoteTabs from './NoteTabs';
import NoteList from './NoteList';
import SearchReplace from './SearchReplace';
import ViewSwitcher from '../views/ViewSwitcher';

export default function NotebookPanel() {
  const {
    notes, activeNoteId, filter,
    fetchNotes, addNote, updateNote, setFilter,
  } = useNoteStore();
  const theme = useSettingsStore((s) => s.theme);
  const [wordWrap, setWordWrap] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [showList, setShowList] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isComposingRef = useRef(false);
  const [localTitle, setLocalTitle] = useState<string | null>(null);

  const activeNote = notes.find((n) => n.id === activeNoteId);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Listen for Ctrl+Shift+M global shortcut
  useEffect(() => {
    const unlisten = listen('quick-note', () => {
      handleNewNote();
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!activeNoteId) return;
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'n') {
        e.preventDefault();
        handleNewNote();
      }
      if (ctrl && e.key === 'w') {
        e.preventDefault();
        if (activeNoteId) useNoteStore.getState().closeTab(activeNoteId);
      }
      if (e.key === 'F11') {
        e.preventDefault();
        setIsFullscreen((v) => !v);
      }
      // Quote transform: Ctrl+Shift+Q as DOM fallback
      if (ctrl && e.shiftKey && (e.key === 'q' || e.key === 'Q')) {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('quote-transform'));
      }
    };
    window.addEventListener('keydown', handler);

    // Listen for fullscreen from editor
    const fsHandler = () => setIsFullscreen((v) => !v);
    window.addEventListener('toggle-fullscreen', fsHandler);

    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('toggle-fullscreen', fsHandler);
    };
  }, [activeNoteId]);

  const handleNewNote = useCallback(async () => {
    await addNote({ title: '未命名笔记', content: '', language: 'markdown' });
  }, [addNote]);

  const handleContentChange = useCallback((content: string) => {
    if (!activeNoteId) return;
    // Debounced auto-save: 500ms
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateNote(activeNoteId, { content });
    }, 500);
  }, [activeNoteId, updateNote]);

  const handleManualSave = useCallback(() => {
    if (!activeNoteId || !activeNote) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    updateNote(activeNoteId, { content: activeNote.content });
  }, [activeNoteId, activeNote, updateNote]);

  const handleTitleChange = useCallback((title: string) => {
    if (!activeNoteId) return;
    if (isComposingRef.current) {
      setLocalTitle(title);
      return;
    }
    setLocalTitle(null);
    updateNote(activeNoteId, { title });
  }, [activeNoteId, updateNote]);

  // Reset local title when switching notes
  useEffect(() => {
    setLocalTitle(null);
  }, [activeNoteId]);

  const handleLanguageChange = useCallback((lang: string) => {
    if (!activeNoteId) return;
    updateNote(activeNoteId, { language: lang });
  }, [activeNoteId, updateNote]);

  const handleSearch = useCallback((_query: string, _case: boolean, _regex: boolean) => {
    // CodeMirror search is handled internally
    setMatchCount(0);
  }, []);

  const handleReplace = useCallback((_from: string, _to: string) => {
    // CodeMirror replace handled internally
  }, []);

  const handleReplaceAll = useCallback((_from: string, _to: string) => {
    // CodeMirror replace all handled internally
  }, []);

  const isDark = theme === 'dark' || (theme === 'system' &&
    (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches));

  const lineCount = activeNote ? activeNote.content.split('\n').length : 0;
  const charCount = activeNote ? activeNote.content.length : 0;

  return (
    <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-slate-900' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowList(!showList)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
            title="切换笔记列表"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">📓 笔记本</h2>
        </div>

        <div className="flex items-center gap-3">
          <ViewSwitcher />

          <div className="flex items-center gap-2">
          {/* Language selector */}
          {activeNoteId && (
            <select
              value={activeNote?.language || 'markdown'}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 outline-none"
            >
              {NOTE_LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
          )}

          {/* Word wrap */}
          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              wordWrap
                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-300'
                : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
            }`}
            title="自动换行"
          >
            ↩
          </button>

          {/* Search/Replace toggles */}
          <button
            onClick={() => { setSearchOpen(!searchOpen); setReplaceOpen(false); }}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              searchOpen
                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-600'
                : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
            }`}
            title="搜索 (Ctrl+F)"
          >
            🔍
          </button>
          <button
            onClick={() => { setReplaceOpen(!replaceOpen); setSearchOpen(true); }}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              replaceOpen
                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-600'
                : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
            }`}
            title="替换 (Ctrl+H)"
          >
            🔄
          </button>

          <button
            onClick={handleNewNote}
            className="text-xs px-2 py-1 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
            title="新建笔记 (Ctrl+N)"
          >
            + 新建
          </button>
        </div>
      </div>
      </div>

      {/* Search/Replace bar */}
      <SearchReplace
        searchOpen={searchOpen}
        replaceOpen={replaceOpen}
        onSearch={handleSearch}
        onReplace={handleReplace}
        onReplaceAll={handleReplaceAll}
        matchCount={matchCount}
      />

      {/* Tabs */}
      <NoteTabs notes={notes} />

      {/* Main content area */}
      <div className="flex flex-1 min-h-0">
        {/* Note list sidebar */}
        {showList && (
          <div className="w-56 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <NoteList notes={notes} filter={filter} onTagClick={setFilter} />
          </div>
        )}

        {/* Editor area */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeNote ? (
            <>
              {/* Title input */}
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700/50">
                <input
                  type="text"
                  value={localTitle ?? activeNote.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onCompositionStart={() => { isComposingRef.current = true; }}
                  onCompositionEnd={(e) => {
                    isComposingRef.current = false;
                    const val = e.currentTarget.value;
                    setLocalTitle(null);
                    if (activeNoteId) updateNote(activeNoteId, { title: val });
                  }}
                  className="w-full text-sm font-medium bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400"
                  placeholder="笔记标题..."
                />
              </div>

              {/* Editor */}
              <div className="flex-1 overflow-hidden">
                <NoteEditor
                  content={activeNote.content}
                  language={activeNote.language}
                  darkMode={isDark}
                  wordWrap={wordWrap}
                  onChange={handleContentChange}
                  onSave={handleManualSave}
                  onSearchOpen={() => setSearchOpen(true)}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
              <span className="text-5xl">📓</span>
              <p className="text-sm">选择或创建一个笔记开始编辑</p>
              <div className="flex gap-2 text-xs">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">Ctrl+N</kbd>
                <span>新建</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">Ctrl+Shift+M</kbd>
                <span>全局快捷</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      {activeNote && (
        <div className="flex items-center justify-between px-3 py-1 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>{activeNote.language.toUpperCase()}</span>
            <span>行 {lineCount}</span>
            <span>{charCount} 字符</span>
          </div>
          <div className="flex items-center gap-3">
            <span>自动保存 {saveTimerRef.current ? '◉' : '✓'}</span>
            <span>{new Date(activeNote.updated_at).toLocaleString('zh-CN')}</span>
          </div>
        </div>
      )}
    </div>
  );
}