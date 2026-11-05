import { useState } from 'react';

interface Props {
  searchOpen: boolean;
  replaceOpen: boolean;
  onSearch: (query: string, caseSensitive: boolean, regex: boolean) => void;
  onReplace: (from: string, to: string) => void;
  onReplaceAll: (from: string, to: string) => void;
  matchCount: number;
}

export default function SearchReplace({ searchOpen, replaceOpen, onSearch, onReplace, onReplaceAll, matchCount }: Props) {
  const [query, setQuery] = useState('');
  const [replaceWith, setReplaceWith] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regex, setRegex] = useState(false);

  if (!searchOpen && !replaceOpen) return null;

  return (
    <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 flex items-center gap-2 text-xs">
      {/* Search icon */}
      <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>

      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); onSearch(e.target.value, caseSensitive, regex); }}
        placeholder="搜索..."
        className="w-40 px-2 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-primary-400"
        autoFocus
      />

      {replaceOpen && (
        <>
          <span className="text-slate-400">→</span>
          <input
            type="text"
            value={replaceWith}
            onChange={(e) => setReplaceWith(e.target.value)}
            placeholder="替换为..."
            className="w-40 px-2 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-primary-400"
          />
          <button
            onClick={() => onReplace(query, replaceWith)}
            className="px-2 py-0.5 bg-primary-500 text-white rounded hover:bg-primary-600 text-xs"
          >
            替换
          </button>
          <button
            onClick={() => onReplaceAll(query, replaceWith)}
            className="px-2 py-0.5 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-500 text-xs"
          >
            全部替换
          </button>
        </>
      )}

      {/* Match count */}
      {matchCount > 0 && (
        <span className="text-slate-400">{matchCount} 个匹配</span>
      )}
      {query && matchCount === 0 && (
        <span className="text-slate-400">无匹配</span>
      )}

      {/* Options */}
      <label className="flex items-center gap-1 text-slate-500 dark:text-slate-400 cursor-pointer">
        <input
          type="checkbox"
          checked={caseSensitive}
          onChange={(e) => {
            setCaseSensitive(e.target.checked);
            onSearch(query, e.target.checked, regex);
          }}
          className="w-3 h-3"
        />
        Aa
      </label>
      <label className="flex items-center gap-1 text-slate-500 dark:text-slate-400 cursor-pointer">
        <input
          type="checkbox"
          checked={regex}
          onChange={(e) => {
            setRegex(e.target.checked);
            onSearch(query, caseSensitive, e.target.checked);
          }}
          className="w-3 h-3"
        />
        .*
      </label>
    </div>
  );
}
