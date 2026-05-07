import { useState, useEffect, useCallback } from 'react';
import { useTaskStore } from '../../stores/taskStore';
import { useListStore } from '../../stores/listStore';
import { PRIORITY_CONFIG } from '../../lib/types';
import { toDatetimeLocalString } from '../../lib/dateParser';

export default function TaskEditPanel() {
  const {
    selectedTaskId, clearSelection, tasks, editTask, removeTask, toggleComplete,
    subtasks, fetchSubtasks, addSubtask, removeSubtask,
  } = useTaskStore();
  const { lists } = useListStore();

  const task = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<number>(2);
  const [dueDate, setDueDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [repeatRule, setRepeatRule] = useState('');
  const [listId, setListId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setDueDate(task.due_date ? toDatetimeLocalString(new Date(task.due_date)) : '');
      setReminderTime(task.reminder_time ? toDatetimeLocalString(new Date(task.reminder_time)) : '');
      setRepeatRule(task.repeat_rule || '');
      setListId(task.list_id || '');
      try {
        setTags(JSON.parse(task.tags || '[]'));
      } catch {
        setTags([]);
      }
      setHasChanges(false);
      fetchSubtasks(task.id);
    }
  }, [task?.id]);

  const markChanged = useCallback(() => setHasChanges(true), []);

  const handleSave = async () => {
    if (!task) return;
    await editTask(task.id, {
      title,
      description,
      priority,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      reminder_time: reminderTime ? new Date(reminderTime).toISOString() : null,
      repeat_rule: repeatRule || null,
      list_id: listId || null,
      tags: JSON.stringify(tags),
    });
    setHasChanges(false);
  };

  const handleDelete = async () => {
    if (!task) return;
    await removeTask(task.id);
    clearSelection();
  };

  const handleAddTag = () => {
    const tag = newTag.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag('');
      markChanged();
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
    markChanged();
  };

  const handleAddSubtask = async () => {
    if (!task || !newSubtaskTitle.trim()) return;
    await addSubtask(task.id, newSubtaskTitle.trim());
    setNewSubtaskTitle('');
  };

  if (!task) return null;

  const isRepeatTask = !!repeatRule && repeatRule.trim() !== '';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-20 md:hidden"
        onClick={clearSelection}
      />

      {/* Panel */}
      <div className="w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 h-full flex flex-col overflow-hidden z-30 flex-shrink-0 animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">编辑任务</h3>
          <div className="flex items-center gap-1">
            {hasChanges && (
              <button
                onClick={handleSave}
                className="px-3 py-1 text-xs bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
              >
                保存
              </button>
            )}
            <button
              onClick={clearSelection}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); markChanged(); }}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">描述 (Markdown)</label>
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); markChanged(); }}
              rows={4}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
              placeholder="支持 Markdown 格式..."
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">优先级</label>
            <select
              value={priority}
              onChange={(e) => { setPriority(Number(e.target.value)); markChanged(); }}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">截止日期</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => { setDueDate(e.target.value); markChanged(); }}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            {dueDate && (
              <button
                onClick={() => { setDueDate(''); markChanged(); }}
                className="text-xs text-slate-400 hover:text-red-400 mt-1"
              >
                清除日期
              </button>
            )}
          </div>

          {/* Reminder Time */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">提醒时间</label>
            <input
              type="datetime-local"
              value={reminderTime}
              onChange={(e) => { setReminderTime(e.target.value); markChanged(); }}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            {reminderTime && (
              <button
                onClick={() => { setReminderTime(''); markChanged(); }}
                className="text-xs text-slate-400 hover:text-red-400 mt-1"
              >
                清除提醒
              </button>
            )}
          </div>

          {/* Repeat Rule */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">重复规则</label>
            <select
              value={repeatRule}
              onChange={(e) => { setRepeatRule(e.target.value); markChanged(); }}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">不重复</option>
              <option value="daily">每天</option>
              <option value="weekdays">工作日</option>
              <option value="weekly">每周</option>
              <option value="monthly">每月</option>
              <option value="2 days">每2天</option>
              <option value="3 days">每3天</option>
            </select>
          </div>

          {/* Repeat indicator */}
          {isRepeatTask && (
            <div className="flex items-center gap-2 px-2 py-1.5 bg-primary-50 dark:bg-primary-900/20 rounded text-xs text-primary-600 dark:text-primary-400">
              🔄 这是重复任务，完成时会自动计算下次截止日期
            </div>
          )}

          {/* List */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">所属清单</label>
            <select
              value={listId}
              onChange={(e) => { setListId(e.target.value); markChanged(); }}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">无清单</option>
              {lists.filter((l) => !l.archived).map((list) => (
                <option key={list.id} value={list.id}>
                  {list.icon} {list.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">标签</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-slate-400 hover:text-red-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="添加标签..."
                className="flex-1 px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button
                onClick={handleAddTag}
                className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                +
              </button>
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              子任务 ({subtasks.length})
            </label>
            <div className="space-y-1 mb-2">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center gap-2 px-2 py-1 rounded text-sm bg-slate-50 dark:bg-slate-800 group"
                >
                  {/* Mini checkbox */}
                  <button
                    onClick={() => toggleComplete(st.id)}
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      st.status === 'done'
                        ? 'bg-primary-500 border-primary-500'
                        : 'border-slate-300 dark:border-slate-600 hover:border-primary-400'
                    }`}
                  >
                    {st.status === 'done' && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`flex-1 text-xs ${st.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    {st.title}
                  </span>
                  <button
                    onClick={() => removeSubtask(st.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                placeholder="添加子任务..."
                className="flex-1 px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button
                onClick={handleAddSubtask}
                className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
          <div className="text-[10px] text-slate-400">
            创建于 {task.created_at ? new Date(task.created_at).toLocaleDateString('zh-CN') : '-'}
            {task.completed_at && ` · 完成于 ${new Date(task.completed_at).toLocaleDateString('zh-CN')}`}
          </div>
          <button
            onClick={handleDelete}
            className="w-full px-3 py-1.5 text-xs text-red-500 border border-red-200 dark:border-red-800 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            🗑 删除任务
          </button>
        </div>
      </div>

      {/* Inline style for slide animation */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slideIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
