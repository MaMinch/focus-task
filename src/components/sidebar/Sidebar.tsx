import { useEffect, useState } from 'react';
import { useListStore } from '../../stores/listStore';
import { useTaskStore } from '../../stores/taskStore';
import { useViewStore } from '../../stores/viewStore';
import { SMART_LISTS } from '../../lib/types';

interface Props {
  onOpenSettings?: () => void;
}

export default function Sidebar({ onOpenSettings }: Props) {
  const { lists, selectedListId, fetchLists, selectList, addList } = useListStore();
  const { filter, setFilter } = useTaskStore();
  const { mode, setMode } = useViewStore();
  const [showAddList, setShowAddList] = useState(false);
  const [newListName, setNewListName] = useState('');

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleSmartListClick = (_smartId: string, filterType: string) => {
    selectList(null);
    setMode('list');
    setFilter({ smartFilter: filterType, listId: null, status: 'all' });
  };

  const handleListClick = (listId: string) => {
    selectList(listId);
    setMode('list');
    setFilter({ listId, smartFilter: null });
  };

  const handleAddList = async () => {
    if (!newListName.trim()) return;
    await addList(newListName.trim());
    setNewListName('');
    setShowAddList(false);
  };

  const activeSmartList = filter.smartFilter;
  const activeListId = selectedListId;

  return (
    <div className="w-60 h-full bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
      {/* App header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-lg font-bold text-primary-600 dark:text-primary-400">
          🎯 FocusTask
        </h1>
      </div>

      {/* Notebook */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => { setMode('notebook'); selectList(null); }}
          className={`w-full text-left px-3 py-1.5 rounded-md text-sm mb-0.5 transition-colors flex items-center gap-2 ${
            mode === 'notebook'
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
          }`}
        >
          <span>📓</span>
          <span>笔记本</span>
          <span className="ml-auto text-[10px] text-purple-400">Ctrl+M</span>
        </button>
      </div>

      {/* Smart lists */}
      <div className="px-3 py-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">
          智能列表
        </p>
        {SMART_LISTS.map((sl) => (
          <button
            key={sl.id}
            onClick={() => handleSmartListClick(sl.id, sl.filter.type)}
            className={`w-full text-left px-3 py-1.5 rounded-md text-sm mb-0.5 transition-colors flex items-center gap-2 ${
              activeSmartList === sl.filter.type
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
            }`}
          >
            <span>{sl.icon}</span>
            <span>{sl.name}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="mx-3 my-1 border-t border-slate-200 dark:border-slate-700" />

      {/* User lists */}
      <div className="px-3 py-2 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-1 px-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            清单
          </p>
          <button
            onClick={() => setShowAddList(!showAddList)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-lg leading-none"
            title="添加清单"
          >
            +
          </button>
        </div>

        {showAddList && (
          <div className="mb-2 px-1">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddList()}
              placeholder="清单名称..."
              className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoFocus
            />
          </div>
        )}

        {lists.filter((l) => !l.archived).map((list) => (
          <button
            key={list.id}
            onClick={() => handleListClick(list.id)}
            className={`w-full text-left px-3 py-1.5 rounded-md text-sm mb-0.5 transition-colors flex items-center gap-2 ${
              activeListId === list.id
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
            }`}
          >
            <span>{list.icon}</span>
            <span>{list.name}</span>
            <span
              className="ml-auto w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: list.color }}
            />
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <span className="text-xs text-slate-400">v0.1.0 · M4</span>
        <button
          onClick={onOpenSettings}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-0.5"
          title="设置 (Ctrl+,)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
