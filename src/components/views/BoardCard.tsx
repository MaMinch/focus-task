import { PRIORITY_CONFIG } from '../../lib/types';
import type { Task } from '../../lib/types';

interface Props {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDragStart: (task: Task) => void;
}

export default function BoardCard({ task, onToggle, onEdit, onDragStart }: Props) {
  const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG[2];
  const isDone = task.status === 'done';

  let tags: string[] = [];
  try {
    tags = JSON.parse(task.tags || '[]');
  } catch {}

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task)}
      onClick={() => onEdit(task)}
      className={`bg-white dark:bg-slate-700 rounded-lg p-2.5 shadow-sm border border-slate-200 dark:border-slate-600 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        isDone ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(task.id);
          }}
          className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
            isDone
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-slate-300 dark:border-slate-500 hover:border-primary-400'
          }`}
        >
          {isDone && (
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm ${isDone ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
            {task.title}
          </p>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Priority */}
            <span className={`text-xs px-1.5 py-0.5 rounded ${priorityConfig.color} text-white`}>
              {priorityConfig.label}
            </span>

            {/* Due date */}
            {task.due_date && (
              <span className="text-xs text-slate-400">
                📅 {new Date(task.due_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
              </span>
            )}

            {/* Tags */}
            {tags.slice(0, 2).map((tag, i) => (
              <span
                key={i}
                className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
