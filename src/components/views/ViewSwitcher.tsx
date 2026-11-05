import { useViewStore } from '../../stores/viewStore';
import type { ViewMode } from '../../stores/viewStore';

const views: { mode: ViewMode; label: string; icon: string }[] = [
  { mode: 'list', label: '列表', icon: '☰' },
  { mode: 'board', label: '看板', icon: '📋' },
  { mode: 'calendar', label: '日历', icon: '📅' },
  { mode: 'notebook', label: '笔记', icon: '📓' },
];

export default function ViewSwitcher() {
  const { mode, setMode } = useViewStore();

  return (
    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
      {views.map((v) => (
        <button
          key={v.mode}
          onClick={() => setMode(v.mode)}
          className={`px-3 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
            mode === v.mode
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-medium'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
          title={`${v.label}视图`}
        >
          <span>{v.icon}</span>
          <span className="hidden sm:inline">{v.label}</span>
        </button>
      ))}
    </div>
  );
}
