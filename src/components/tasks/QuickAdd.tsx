import { useState, useEffect } from 'react';
// PRIORITY_CONFIG not used directly in QuickAdd
import { parseNaturalDate, extractTitle } from '../../lib/dateParser';

interface QuickAddProps {
  lists: Array<{ id: string; name: string; icon: string }>;
  onAdd: (input: {
    title: string;
    due_date?: string | null;
    priority?: number;
    list_id?: string | null;
  }) => Promise<void>;
  onClose: () => void;
}

export default function QuickAdd({ lists, onAdd, onClose }: QuickAddProps) {
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<number>(2);
  const [listId, setListId] = useState('');
  const [parsedDate, setParsedDate] = useState<string | null>(null);

  // Listen for Esc key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Parse date from input in real-time
  useEffect(() => {
    const parsed = parseNaturalDate(input);
    setParsedDate(parsed ? parsed.text : null);
  }, [input]);

  const handleSubmit = async () => {
    const raw = input.trim();
    if (!raw) return;

    const title = extractTitle(raw);
    let dueDate: string | null = null;

    const parsed = parseNaturalDate(raw);
    if (parsed) {
      dueDate = parsed.date.toISOString();
    }

    await onAdd({
      title: title || raw,
      due_date: dueDate,
      priority,
      list_id: listId || null,
    });

    onClose();
  };

  const priorityLabels: Record<number, string> = {
    0: 'P0',
    1: 'P1',
    2: 'P2',
    3: 'P3',
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-white dark:bg-slate-900">
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 drag-region">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">快速添加任务</span>
        <button
          onClick={onClose}
          className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded no-drag"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Input area */}
      <div className="flex-1 flex flex-col p-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">+</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
              if (e.key === 'Escape') onClose();
            }}
            placeholder='添加任务（支持 "明天下午3点 开会"）'
            className="w-full pl-8 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
            autoFocus
          />
        </div>

        {/* Parsed date preview */}
        {parsedDate && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400">
            <span>📅</span>
            <span>{new Date(parsedDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}

        {/* Quick options */}
        <div className="mt-4 space-y-3">
          {/* Priority */}
          <div>
            <label className="block text-[10px] font-medium text-slate-400 uppercase mb-1.5">优先级</label>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    priority === p
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {priorityLabels[p]}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div>
            <label className="block text-[10px] font-medium text-slate-400 uppercase mb-1.5">清单</label>
            <select
              value={listId}
              onChange={(e) => setListId(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">无清单</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>{l.icon} {l.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit button */}
        <div className="mt-auto pt-4">
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="w-full py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ⏎ 添加任务
          </button>
        </div>
      </div>

      <style>{`
        .drag-region { -webkit-app-region: drag; }
        .no-drag { -webkit-app-region: no-drag; }
      `}</style>
    </div>
  );
}
