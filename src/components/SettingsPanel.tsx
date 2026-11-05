import { useState, useRef } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useTaskStore } from '../stores/taskStore';
import { useListStore } from '../stores/listStore';
import * as api from '../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ open, onClose }: Props) {
  const { theme, setTheme, language, setLanguage } = useSettingsStore();
  const { fetchTasks } = useTaskStore();
  const { fetchLists } = useListStore();
  const [importMsg, setImportMsg] = useState('');
  const [exportMsg, setExportMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleExportJson = async () => {
    try {
      const json = await api.exportAllJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date().toISOString().split('T')[0];
      a.download = `focustask-backup-${now}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg('导出成功 ✅');
      setTimeout(() => setExportMsg(''), 2000);
    } catch (e) {
      setExportMsg('导出失败 ❌');
      console.error(e);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = await api.exportCsv();
      const bom = '\uFEFF';
      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date().toISOString().split('T')[0];
      a.download = `focustask-tasks-${now}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg('CSV 导出成功 ✅');
      setTimeout(() => setExportMsg(''), 2000);
    } catch (e) {
      setExportMsg('导出失败 ❌');
      console.error(e);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await api.importJson(text);
      setImportMsg(`导入成功 ✅`);
      fetchTasks();
      fetchLists();
    } catch (err) {
      setImportMsg('导入失败，请检查文件格式 ❌');
      console.error(err);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setImportMsg(''), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-[10vh]" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-[520px] max-h-[70vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">⚙️ 设置</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Theme */}
          <section>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">主题</h3>
            <div className="flex gap-2">
              {([
                { value: 'light' as const, label: '☀️ 浅色' },
                { value: 'dark' as const, label: '🌙 深色' },
                { value: 'system' as const, label: '💻 跟随系统' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                    theme === opt.value
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-300'
                      : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Language */}
          <section>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">语言 / Language</h3>
            <div className="flex gap-2">
              {([
                { value: 'zh' as const, label: '中文' },
                { value: 'en' as const, label: 'English' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLanguage(opt.value)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                    language === opt.value
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-300'
                      : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Export */}
          <section>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">数据导出</h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleExportJson}
                className="px-4 py-2 text-sm rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
              >
                📦 导出 JSON（完整备份）
              </button>
              <button
                onClick={handleExportCsv}
                className="px-4 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                📊 导出 CSV（表格）
              </button>
            </div>
            {exportMsg && (
              <p className="mt-2 text-xs text-green-600 dark:text-green-400">{exportMsg}</p>
            )}
          </section>

          {/* Import */}
          <section>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">数据导入</h3>
            <button
              onClick={handleImportClick}
              className="px-4 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              📥 导入 JSON 备份
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
            {importMsg && (
              <p className={`mt-2 text-xs ${importMsg.includes('失败') ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                {importMsg}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-400">支持 FocusTask JSON 备份文件，不会重复导入已有任务</p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400">
          FocusTask v0.1.0 · M4 · 数据默认本地存储
        </div>
      </div>
    </div>
  );
}
