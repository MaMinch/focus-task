import { useEffect, useState, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useTaskStore } from '../../stores/taskStore';
import { useListStore } from '../../stores/listStore';
import TaskItem from './TaskItem';
import TaskInput from './TaskInput';
import TaskEditPanel from './TaskEditPanel';
import QuickAdd from './QuickAdd';

export default function TaskListPanel() {
  const { tasks, loading, filter, selectedTaskId, fetchTasks, addTask, removeTask, toggleComplete, selectTask, searchTasks } = useTaskStore();
  const { selectedListId, lists } = useListStore();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof tasks>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [filter.listId, filter.smartFilter, filter.status, filter.priority, fetchTasks]);

  // Listen for global shortcut event
  useEffect(() => {
    const unlisten = listen('quick-add', () => {
      setShowQuickAdd(true);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  const selectedList = lists.find((l) => l.id === selectedListId);

  const getHeader = () => {
    if (filter.smartFilter) {
      const smartLabels: Record<string, string> = {
        today: '📅 今天',
        week: '📆 本周',
        overdue: '⚠️ 逾期',
        important: '⭐ 重要',
        all: '📋 全部任务',
      };
      return smartLabels[filter.smartFilter] || '任务';
    }
    if (selectedList) {
      return `${selectedList.icon} ${selectedList.name}`;
    }
    return '📋 全部任务';
  };

  const handleAddTask = async (title: string) => {
    await addTask({
      title,
      list_id: filter.listId || undefined,
      priority: 2,
    });
  };

  const handleQuickAdd = async (input: {
    title: string;
    due_date?: string | null;
    priority?: number;
    list_id?: string | null;
  }) => {
    await addTask({
      title: input.title,
      due_date: input.due_date || undefined,
      priority: input.priority ?? 2,
      list_id: input.list_id || filter.listId || undefined,
    });
    setShowQuickAdd(false);
  };

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchTasks(q.trim());
      setSearchResults(results);
    } catch (e) {
      console.error('Search error:', e);
    }
    setIsSearching(false);
  }, [searchTasks]);

  const activeTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'archived');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  const displayTasks = searchQuery.trim() ? searchResults : tasks;
  const displayActive = searchQuery.trim()
    ? searchResults.filter((t) => t.status !== 'done' && t.status !== 'archived')
    : activeTasks;
  const displayDone = searchQuery.trim()
    ? searchResults.filter((t) => t.status === 'done')
    : doneTasks;

  return (
    <div className="flex flex-1 h-full min-w-0">
      {/* Main task list area */}
      <div className={`flex-1 flex flex-col h-full ${selectedTaskId ? 'md:w-[calc(100%-320px)]' : ''}`}>
        {/* Header + Search */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 flex-shrink-0">
            {getHeader()}
          </h2>
          <div className="flex items-center gap-2 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-xs ml-auto">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="搜索任务... (Ctrl+K)"
                className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              )}
            </div>
            <span className="text-xs text-slate-400 flex-shrink-0">
              {displayActive.length} 个进行中
            </span>
          </div>
        </div>

        {/* Task input */}
        <TaskInput onSubmit={handleAddTask} />

        {/* Task list */}
        <div className="flex-1 overflow-y-auto">
          {loading || isSearching ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
              加载中...
            </div>
          ) : displayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <span className="text-4xl mb-3">{searchQuery ? '🔍' : '📝'}</span>
              <p className="text-sm">
                {searchQuery ? '没有匹配的任务' : '还没任务，用上方输入框添加一个吧'}
              </p>
            </div>
          ) : (
            <>
              {displayActive.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={toggleComplete}
                  onDelete={removeTask}
                  onEdit={(task) => selectTask(task.id)}
                />
              ))}
              {displayDone.length > 0 && !searchQuery.trim() && (
                <>
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/50">
                    <span className="text-xs font-medium text-slate-400">
                      ✅ 已完成 · {displayDone.length}
                    </span>
                  </div>
                  {displayDone.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={toggleComplete}
                      onDelete={removeTask}
                      onEdit={(task) => selectTask(task.id)}
                    />
                  ))}
                </>
              )}
              {searchQuery.trim() && displayDone.length > 0 && displayDone.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={toggleComplete}
                  onDelete={removeTask}
                  onEdit={(task) => selectTask(task.id)}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Edit Panel */}
      {selectedTaskId && <TaskEditPanel />}

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-20">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-[480px] overflow-hidden animate-slide-down">
            <QuickAdd
              lists={lists.filter((l) => !l.archived)}
              onAdd={handleQuickAdd}
              onClose={() => setShowQuickAdd(false)}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down {
          animation: slideDown 0.15s ease-out;
        }
      `}</style>
    </div>
  );
}
