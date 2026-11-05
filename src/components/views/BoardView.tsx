import { useMemo, useRef, useCallback } from 'react';
import { useTaskStore } from '../../stores/taskStore';
import type { Task } from '../../lib/types';
import BoardColumn from './BoardColumn';

const COLUMNS: { key: Task['status']; label: string; color: string }[] = [
  { key: 'todo', label: '待办', color: 'border-t-slate-400' },
  { key: 'in_progress', label: '进行中', color: 'border-t-blue-500' },
  { key: 'done', label: '已完成', color: 'border-t-green-500' },
];

export default function BoardView() {
  const { tasks, editTask } = useTaskStore();
  const dragTaskRef = useRef<Task | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const t of tasks) {
      if (t.status === 'archived') continue;
      if (map[t.status]) {
        map[t.status].push(t);
      } else {
        map.todo.push(t);
      }
    }
    return map;
  }, [tasks]);

  const handleDragStart = useCallback((task: Task) => {
    dragTaskRef.current = task;
  }, []);

  const handleDrop = useCallback(async (colKey: string) => {
    const dragTask = dragTaskRef.current;
    dragTaskRef.current = null;
    if (!dragTask || dragTask.status === colKey) return;

    const newStatus = colKey as Task['status'];
    await editTask(dragTask.id, {
      status: newStatus,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
    });
  }, [editTask]);

  return (
    <div className="flex-1 flex gap-4 p-4 overflow-x-auto min-h-0">
      {COLUMNS.map((col) => (
        <BoardColumn
          key={col.key}
          id={col.key}
          label={col.label}
          color={col.color}
          tasks={grouped[col.key] || []}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}
