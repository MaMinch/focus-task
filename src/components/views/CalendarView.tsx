import { useState, useMemo } from 'react';
import { useTaskStore } from '../../stores/taskStore';
import type { Task } from '../../lib/types';

type CalendarMode = 'month' | 'week' | 'day';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export default function CalendarView() {
  const { tasks } = useTaskStore();
  const [mode, setMode] = useState<CalendarMode>('month');
  const [cursor, setCursor] = useState(new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Navigation ──
  const navigate = (dir: -1 | 1) => {
    const d = new Date(cursor);
    if (mode === 'month') {
      d.setMonth(d.getMonth() + dir);
    } else if (mode === 'week') {
      d.setDate(d.getDate() + dir * 7);
    } else {
      d.setDate(d.getDate() + dir);
    }
    setCursor(d);
  };

  const goToday = () => setCursor(new Date());

  // ── Header label ──
  const headerLabel = useMemo(() => {
    if (mode === 'month') {
      return `${cursor.getFullYear()}年 ${cursor.getMonth() + 1}月`;
    }
    if (mode === 'week') {
      const start = getWeekStart(cursor);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
      return `${fmt(start)} - ${fmt(end)}`;
    }
    return `${cursor.getMonth() + 1}月${cursor.getDate()}日`;
  }, [cursor, mode]);

  // ── Tasks by date map ──
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasks) {
      if (!t.due_date) continue;
      const key = t.due_date.split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [tasks]);

  // ── Month grid ──
  const monthDays = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0

    const days: (Date | null)[] = [];
    // Fill leading nulls
    for (let i = 0; i < startOffset; i++) days.push(null);
    // Fill actual days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [cursor]);

  // ── Week grid ──
  const weekDays = useMemo(() => {
    const start = getWeekStart(cursor);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [cursor]);

  const dateKey = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const isToday = (d: Date) => {
    return d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 min-w-[140px] text-center">
            {headerLabel}
          </h2>
          <button onClick={() => navigate(1)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-600 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            今天
          </button>

          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
            {(['month', 'week', 'day'] as CalendarMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
                  mode === m
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-medium'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {m === 'month' ? '月' : m === 'week' ? '周' : '日'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        {mode === 'month' && (
          <div className="grid grid-cols-7 h-full">
            {/* Weekday headers */}
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-xs text-slate-400 font-medium text-center py-2 border-b border-slate-100 dark:border-slate-700/50">
                {d}
              </div>
            ))}
            {/* Days */}
            {monthDays.map((day, i) => (
              <div
                key={i}
                className={`min-h-[80px] border-r border-b border-slate-100 dark:border-slate-700/30 p-1 ${
                  day ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : 'bg-slate-50/50 dark:bg-slate-800/20'
                }`}
              >
                {day && (
                  <>
                    <div className={`text-xs mb-0.5 w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday(day) ? 'bg-primary-500 text-white font-bold' : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {(tasksByDate[dateKey(day)] || []).slice(0, 3).map((t, j) => (
                        <div
                          key={j}
                          className="text-xs px-1 py-0.5 rounded truncate bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                          title={t.title}
                        >
                          {t.title}
                        </div>
                      ))}
                      {(tasksByDate[dateKey(day)] || []).length > 3 && (
                        <div className="text-xs text-slate-400 px-1">
                          +{(tasksByDate[dateKey(day)] || []).length - 3} 更多
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {mode === 'week' && (
          <div className="h-full">
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
              {WEEKDAYS.map((name, i) => {
                const d = weekDays[i];
                return (
                  <div
                    key={i}
                    className={`text-center py-2 border-r border-slate-100 dark:border-slate-700/50 last:border-r-0 ${
                      isToday(d!) ? 'bg-primary-50 dark:bg-primary-900/10' : ''
                    }`}
                  >
                    <div className="text-xs text-slate-400">{name}</div>
                    <div className={`text-sm font-semibold ${
                      isToday(d!) ? 'text-primary-600 dark:text-primary-400' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {d!.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-7 flex-1 min-h-0">
              {weekDays.map((day, i) => {
                const key = dateKey(day);
                const dayTasks = tasksByDate[key] || [];
                return (
                  <div
                    key={i}
                    className={`border-r border-slate-100 dark:border-slate-700/50 last:border-r-0 p-1.5 overflow-y-auto ${
                      isToday(day) ? 'bg-primary-50/30 dark:bg-primary-900/5' : ''
                    }`}
                  >
                    {dayTasks.map((t, j) => (
                      <div
                        key={j}
                        className="text-xs p-1 mb-1 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 truncate"
                        title={t.title}
                      >
                        {t.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {mode === 'day' && (
          <div className="p-4">
            <div className="space-y-2">
              {(tasksByDate[dateKey(cursor)] || []).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                >
                  <span className={`text-xs px-1.5 py-0.5 rounded ${t.status === 'done' ? 'bg-green-500' : 'bg-slate-300'} text-white`}>
                    {t.status === 'done' ? '✓' : '○'}
                  </span>
                  <span className={`text-sm flex-1 ${t.status === 'done' ? 'line-through text-slate-400' : ''}`}>
                    {t.title}
                  </span>
                  {t.reminder_time && (
                    <span className="text-xs text-slate-400">
                      ⏰ {new Date(t.reminder_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              ))}
              {(tasksByDate[dateKey(cursor)] || []).length === 0 && (
                <div className="text-center py-12 text-slate-400 text-sm">
                  📅 当天没有任务
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
