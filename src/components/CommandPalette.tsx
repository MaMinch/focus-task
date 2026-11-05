import { useEffect, useState, useRef, useCallback } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useListStore } from '../stores/listStore';
import { useViewStore } from '../stores/viewStore';
import { SMART_LISTS } from '../lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
  const { searchTasks, selectTask, setFilter } = useTaskStore();
  const { selectList } = useListStore();
  const { setMode } = useViewStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    tasks: Awaited<ReturnType<typeof searchTasks>>;
    actions: Action[];
  }>({ tasks: [], actions: [] });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Register Escape listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const actions = useCallback((): Action[] => {
    const act: Action[] = [];

    act.push({ id: 'view-list', label: '切换到列表视图', icon: '☰', action: () => { setMode('list'); onClose(); } });
    act.push({ id: 'view-board', label: '切换到看板视图', icon: '📋', action: () => { setMode('board'); onClose(); } });
    act.push({ id: 'view-calendar', label: '切换到日历视图', icon: '📅', action: () => { setMode('calendar'); onClose(); } });
    act.push({ id: 'view-notebook', label: '切换到笔记本', icon: '📓', action: () => { setMode('notebook'); onClose(); } });

    for (const sl of SMART_LISTS) {
      act.push({
        id: `smart-${sl.id}`,
        label: `前往 ${sl.name}`,
        icon: sl.icon,
        action: () => { selectList(null); setFilter({ smartFilter: sl.filter.type, listId: null, status: 'all' }); onClose(); },
      });
    }

    // Quote transform commands
    const quoteActions: Action[] = [
      {
        id: 'quote-mode-0',
        label: '文本加引号: 双引号+逗号(默认)',
        icon: '"',
        action: () => { setMode('notebook'); onClose(); },
      },
      {
        id: 'quote-mode-1',
        label: '文本加引号: 单引号+逗号',
        icon: "'",
        action: () => { setMode('notebook'); onClose(); },
      },
      {
        id: 'quote-mode-2',
        label: '文本加引号: 双引号+空格',
        icon: '␣',
        action: () => { setMode('notebook'); onClose(); },
      },
    ];

    if (query.trim()) {
      // Only show quote actions if query matches 引号/quote/wrap
      const q = query.toLowerCase();
      if (q.includes('引号') || q.includes('quote') || q.includes('wrap') || q.includes('包裹')) {
        act.push(...quoteActions);
      }

      act.push({
        id: 'create-task',
        label: `创建任务: "${query.trim()}"`,
        icon: '➕',
        action: () => {
          useTaskStore.getState().addTask({ title: query.trim(), priority: 2 });
          onClose();
        },
      });
      act.push({
        id: 'create-note',
        label: `创建笔记: "${query.trim()}"`,
        icon: '📝',
        action: () => {
          import('../stores/noteStore').then((mod) => {
            mod.useNoteStore.getState().addNote({ title: query.trim(), language: 'markdown' });
            setMode('notebook');
            onClose();
          });
        },
      });
    }

    return act;
  }, [query, setMode, selectList, setFilter, onClose]);

  useEffect(() => {
    const fetch = async () => {
      if (query.trim()) {
        const r = await searchTasks(query.trim());
        setResults({ tasks: r, actions: actions() });
      } else {
        setResults({ tasks: [], actions: actions() });
      }
      setSelectedIndex(0);
    };
    fetch();
  }, [query, searchTasks, actions]);

  const allItems = [
    ...results.tasks.map((t) => ({ type: 'task' as const, data: t })),
    ...(results.tasks.length > 0 ? [{ type: 'separator' as const }] : []),
    ...results.actions.map((a) => ({ type: 'action' as const, data: a })),
  ].filter(Boolean);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeItem(allItems[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const executeItem = (item: (typeof allItems)[number]) => {
    if (!item) return;
    if (item.type === 'task') {
      selectTask(item.data.id);
      onClose();
    } else if (item.type === 'action') {
      item.data.action();
    }
  };

  if (!open) return null;

  let itemIndex = -1;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-[520px] max-h-[60vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索任务、切换视图、执行操作..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400"
          />
          <kbd className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-400 border border-slate-200 dark:border-slate-600">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2">
          {allItems.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              输入关键词搜索任务，或选择下方操作
            </div>
          )}

          {allItems.map((item) => {
            if (item.type === 'separator') {
              return (
                <div key="sep" className="mx-2 my-2 border-t border-slate-100 dark:border-slate-700">
                  <span className="px-2 text-xs text-slate-400 bg-white dark:bg-slate-800 relative -top-2">
                    操作
                  </span>
                </div>
              );
            }

            itemIndex++;
            const isSelected = itemIndex === selectedIndex;

            if (item.type === 'task' && item.data && typeof item.data === 'object' && 'id' in item.data) {
              const task = item.data as Awaited<ReturnType<typeof searchTasks>>[number];
              return (
                <button
                  key={task.id}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-colors ${
                    isSelected ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setSelectedIndex(itemIndex)}
                >
                  <span className="text-slate-400">📝</span>
                  <span className="flex-1 truncate">{task.title}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    task.status === 'done' ? 'bg-green-100 text-green-600' :
                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {task.status === 'done' ? '已完成' : task.status === 'in_progress' ? '进行中' : '待办'}
                  </span>
                </button>
              );
            }

            if (item.type === 'action' && item.data && typeof item.data === 'object' && 'id' in item.data) {
              const action = item.data as Action;
              return (
                <button
                  key={action.id}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-colors ${
                    isSelected ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setSelectedIndex(itemIndex)}
                >
                  <span>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              );
            }

            return null;
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3 text-xs text-slate-400">
          <span>↑↓ 导航</span>
          <span>↵ 选择</span>
          <span>Esc 关闭</span>
        </div>
      </div>
    </div>
  );
}

interface Action {
  id: string;
  label: string;
  icon: string;
  action: () => void;
}