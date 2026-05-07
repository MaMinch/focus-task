import Sidebar from './components/sidebar/Sidebar';
import TaskListPanel from './components/tasks/TaskListPanel';

export default function App() {
  return (
    <div className="flex h-screen w-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">
      <Sidebar />
      <TaskListPanel />
    </div>
  );
}
