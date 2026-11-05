import { useState } from 'react';
import { useTaskStore } from '../../stores/taskStore';
import type { Task } from '../../lib/types';
import BoardCard from './BoardCard';

interface Props {
  id: string;
  label: string;
  color: string;
  tasks: Task[];
  onDragStart: (task: Task) => void;
  onDrop: (colKey: string) => void;
}

export default function BoardColumn({ id, label, color, tasks, onDragStart, onDrop }: Props) {
  const { toggleComplete, removeTask, selectTask } = useTaskStore();
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsOver(false); onDrop(id); }}
      className={`flex-1 min-w-[220px] max-w-[360px] flex flex-col bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 border-t-2 ${color} transition-colors ${
        isOver ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : ''
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {label}
        </h3>
        <span className="text-xs text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {tasks.map((task) => (
          <BoardCard
            key={task.id}
            task={task}
            onToggle={toggleComplete}
            onDelete={removeTask}
            onEdit={(t) => selectTask(t.id)}
            onDragStart={onDragStart}
          />
        ))}

        {tasks.length === 0 && (
          <div
            className="flex items-center justify-center py-8 text-slate-300 dark:text-slate-600 text-sm border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg"
            onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
            onDragLeave={() => setIsOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsOver(false); onDrop(id); }}
          >
            拖放任务到这里
          </div>
        )}
      </div>
    </div>
  );
}
