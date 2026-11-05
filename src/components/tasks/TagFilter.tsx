import { useTaskStore } from '../../stores/taskStore';

interface Props {
  tags: string[];
}

const TAG_COLORS = [
  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
];

export default function TagFilter({ tags }: Props) {
  const { filter, setFilter, fetchTasks } = useTaskStore();
  const activeTag = filter.searchQuery || '';

  const handleTagClick = async (tag: string) => {
    if (activeTag === tag) {
      // Deselect
      await setFilter({ searchQuery: '' });
    } else {
      await setFilter({ searchQuery: `#${tag}` });
    }
    fetchTasks();
  };

  if (tags.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-slate-400 mr-1">🏷️</span>
      {tags.map((tag, i) => {
        const colorClass = TAG_COLORS[i % TAG_COLORS.length];
        const isActive = activeTag === `#${tag}`;
        return (
          <button
            key={tag}
            onClick={() => handleTagClick(tag)}
            className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
              isActive
                ? 'bg-primary-500 text-white dark:bg-primary-500'
                : `${colorClass} hover:opacity-80`
            }`}
          >
            {tag}
          </button>
        );
      })}
      {activeTag && (
        <button
          onClick={() => {
            setFilter({ searchQuery: '' });
            fetchTasks();
          }}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          清除
        </button>
      )}
    </div>
  );
}
