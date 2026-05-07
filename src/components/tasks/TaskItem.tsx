import { PRIORITY_CONFIG } from '../../lib/types';
import type { Task } from '../../lib/types';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export default function TaskItem({ task, onToggle, onDelete, onEdit }: TaskItemProps) {
  const priorityConf = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG[2];
  const isDone = task.status === 'done';
  const tags: string[] = (() => {
    try { return JSON.parse(task.tags); } catch { return []; }
  })();

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const now = new Date();
    const isOverdue = d < now && !isDone;
    return {
      text: d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      isOverdue,
    };
  };

  const dueDate = formatDueDate(task.due_date);

  return (
    <div
      className={`group flex items-start gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
        isDone ? 'opacity-60' : ''
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          isDone
            ? 'bg-primary-500 border-primary-500'
            : 'border-slate-300 dark:border-slate-600 hover:border-primary-400'
        }`}
      >
        {isDone && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm ${isDone ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}
          >
            {task.title}
          </span>
          {/* Priority badge */}
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${priorityConf.textColor} bg-slate-100 dark:bg-slate-800`}>
            {priorityConf.label}
          </span>
          {/* Due date */}
          {dueDate && (
            <span className={`text-[10px] ${dueDate.isOverdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
              📅 {dueDate.text}
            </span>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions (visible on hover) */}
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => onEdit(task.id)}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
          title="编辑"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1 text-slate-400 hover:text-red-500 rounded"
          title="删除"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
