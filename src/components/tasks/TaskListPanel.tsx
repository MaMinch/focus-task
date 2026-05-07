import { useEffect } from 'react';
import { useTaskStore } from '../../stores/taskStore';
import { useListStore } from '../../stores/listStore';
import TaskItem from './TaskItem';
import TaskInput from './TaskInput';

export default function TaskListPanel() {
  const { tasks, loading, filter, fetchTasks, addTask, removeTask, toggleComplete } = useTaskStore();
  const { selectedListId, lists } = useListStore();

  useEffect(() => {
    fetchTasks();
  }, [filter.listId, filter.smartFilter, filter.status, filter.priority, fetchTasks]);

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

  const activeTasks = tasks.filter((t) => t.status !== 'done');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">
          {getHeader()}
        </h2>
        <span className="text-xs text-slate-400">
          {activeTasks.length} 个进行中
        </span>
      </div>

      {/* Task input */}
      <TaskInput onSubmit={handleAddTask} />

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
            加载中...
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <span className="text-4xl mb-3">📝</span>
            <p className="text-sm">还没任务，用上方输入框添加一个吧</p>
          </div>
        ) : (
          <>
            {/* Active tasks */}
            {activeTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={toggleComplete}
                onDelete={removeTask}
                onEdit={(id) => console.log('Edit task:', id)}
              />
            ))}

            {/* Done tasks separator */}
            {doneTasks.length > 0 && (
              <>
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/50">
                  <span className="text-xs font-medium text-slate-400">
                    ✅ 已完成 · {doneTasks.length}
                  </span>
                </div>
                {doneTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={toggleComplete}
                    onDelete={removeTask}
                    onEdit={(id) => console.log('Edit task:', id)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
