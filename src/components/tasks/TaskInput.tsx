import { useState } from 'react';

interface TaskInputProps {
  onSubmit: (title: string) => void;
  placeholder?: string;
}

export default function TaskInput({ onSubmit, placeholder = '添加任务...' }: TaskInputProps) {
  const [title, setTitle] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit(title.trim());
    setTitle('');
  };

  return (
    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-lg">+</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-slate-600 dark:text-slate-300 placeholder-slate-400 focus:outline-none"
        />
        {title && (
          <button
            onClick={handleSubmit}
            className="px-3 py-1 text-xs bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
          >
            添加
          </button>
        )}
      </div>
    </div>
  );
}
