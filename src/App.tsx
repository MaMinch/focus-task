import { useState, useEffect } from 'react';
import Sidebar from './components/sidebar/Sidebar';
import TaskListPanel from './components/tasks/TaskListPanel';
import SettingsPanel from './components/SettingsPanel';
import NotebookPanel from './components/notebook/NotebookPanel';
import { useViewStore } from './stores/viewStore';

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const mode = useViewStore((s) => s.mode);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setShowSettings((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex h-screen w-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">
      <Sidebar onOpenSettings={() => setShowSettings(true)} />
      {mode === 'notebook' ? <NotebookPanel /> : <TaskListPanel />}
      <SettingsPanel open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
