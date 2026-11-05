import { useEffect, useRef, useCallback, useState } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, indentOnInput } from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { css } from '@codemirror/lang-css';
import { python } from '@codemirror/lang-python';
import { StreamLanguage } from '@codemirror/language';
import { yaml as yamlLang } from '@codemirror/legacy-modes/mode/yaml';
import { search, searchKeymap } from '@codemirror/search';
import { oneDark } from '@codemirror/theme-one-dark';
import { PRESET_MODES, DEFAULT_MODE_INDEX, transformToQuotedLines, type QuoteOptions } from '../../lib/quoteTransform';

function langExtension(lang: string) {
  switch (lang) {
    case 'markdown': return markdown();
    case 'javascript': return javascript();
    case 'typescript': return javascript({ typescript: true });
    case 'json': return json();
    case 'css': return css();
    case 'python': return python();
    case 'yaml': return StreamLanguage.define(yamlLang);
    default: return [];
  }
}

interface NoteEditorProps {
  content: string;
  language: string;
  darkMode: boolean;
  wordWrap: boolean;
  onChange: (content: string) => void;
  onSave: () => void;
  onSearchOpen: () => void;
  onCursorChange?: (pos: number) => void;
}

export default function NoteEditor({
  content, language, darkMode, wordWrap,
  onChange, onSave, onSearchOpen, onCursorChange,
}: NoteEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const externalUpdate = useRef(false);
  const lastQuoteModeRef = useRef<number>(DEFAULT_MODE_INDEX);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [customDialog, setCustomDialog] = useState<{
    open: boolean;
    options: QuoteOptions;
  }>({
    open: false,
    options: { quoteType: '"', separator: ',\n', escapeInternal: false, trimLines: true, skipEmptyLines: false, addTrailingSeparator: true },
  });

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onSearchOpenRef = useRef(onSearchOpen);
  onSearchOpenRef.current = onSearchOpen;
  const onCursorChangeRef = useRef(onCursorChange);
  onCursorChangeRef.current = onCursorChange;

  const handleContextMenuAction = useCallback((modeIndex: number) => {
    setContextMenu(null);
    if (modeIndex >= 0 && modeIndex < PRESET_MODES.length) {
      lastQuoteModeRef.current = modeIndex;
      const view = viewRef.current;
      if (!view) return;
      const sel = view.state.selection.main;
      let text = view.state.sliceDoc(sel.from, sel.to);
      if (!text) {
        const input = window.prompt('输入要转换的文本（每行一个值）：');
        if (!input) return;
        text = input;
      }
      const transformed = transformToQuotedLines(text, PRESET_MODES[modeIndex].options);
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: transformed },
      });
    } else if (modeIndex === -1) {
      // Custom
      setCustomDialog({
        open: true,
        options: { ...PRESET_MODES[lastQuoteModeRef.current].options },
      });
    }
  }, []);

  const buildExtensions = useCallback(() => {
    // Quote transform keybinding
    const quoteKeybinding = {
      key: 'Ctrl-Shift-q',
      run: (view: EditorView) => {
        const sel = view.state.selection.main;
        let text = view.state.sliceDoc(sel.from, sel.to);
        if (!text) {
          // Use prompt for input
          const input = window.prompt('输入要转换的文本（每行一个值）：');
          if (!input) return true;
          text = input;
          // If no selection, just insert at cursor
          const transformed = transformToQuotedLines(
            text,
            PRESET_MODES[lastQuoteModeRef.current].options,
          );
          view.dispatch({
            changes: { from: sel.from, to: sel.to, insert: transformed },
          });
          return true;
        }
        const transformed = transformToQuotedLines(
          text,
          PRESET_MODES[lastQuoteModeRef.current].options,
        );
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: transformed },
        });
        return true;
      },
      preventDefault: true,
    };

    return [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      foldGutter(),
      bracketMatching(),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      history(),
      search({ top: true }),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        indentWithTab,
        quoteKeybinding,
        { key: 'Mod-s', run: () => { onSaveRef.current(); return true; }, preventDefault: true },
        { key: 'Mod-f', run: () => { onSearchOpenRef.current(); return false; } },
        {
          key: 'F11',
          run: () => { window.dispatchEvent(new CustomEvent('toggle-fullscreen')); return true; },
          preventDefault: true,
        },
      ]),
      langExtension(language),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !externalUpdate.current) {
          onChangeRef.current(update.state.doc.toString());
        }
        if (update.selectionSet && onCursorChangeRef.current) {
          onCursorChangeRef.current(update.state.selection.main.head);
        }
      }),
      ...(darkMode ? [oneDark] : []),
      ...(wordWrap ? [EditorView.lineWrapping] : []),
      EditorView.theme({
        '&': { height: '100%', fontSize: '14px' },
        '.cm-scroller': { overflow: 'auto' },
        '.cm-gutters': {
          backgroundColor: darkMode ? '#1e293b' : '#f1f5f9',
          color: darkMode ? '#64748b' : '#94a3b8',
          border: 'none',
        },
        '.cm-activeLineGutter': { backgroundColor: darkMode ? '#334155' : '#e2e8f0' },
        '.cm-activeLine': { backgroundColor: darkMode ? '#1e293b40' : '#f8fafc' },
      }),
    ];
  }, [language, darkMode, wordWrap]);

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return;
    const state = EditorState.create({ doc: content, extensions: buildExtensions() });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for quote-transform custom event from NotebookPanel's DOM fallback
  useEffect(() => {
    const handler = () => {
      const view = viewRef.current;
      if (!view) return;
      const sel = view.state.selection.main;
      let text = view.state.sliceDoc(sel.from, sel.to);
      if (!text) {
        const input = window.prompt('输入要转换的文本（每行一个值）：');
        if (!input) return;
        text = input;
      }
      const transformed = transformToQuotedLines(
        text,
        PRESET_MODES[lastQuoteModeRef.current].options,
      );
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: transformed },
      });
    };
    window.addEventListener('quote-transform', handler);
    return () => window.removeEventListener('quote-transform', handler);
  }, []);

  // Rebuild on options change - preserve cursor selection
  const isRebuilding = useRef(false);
  useEffect(() => {
    if (!viewRef.current) return;
    const v = viewRef.current;
    const { from, to } = v.state.selection.main;
    isRebuilding.current = true;
    const newState = EditorState.create({
      doc: v.state.doc,
      selection: { anchor: from, head: to },
      extensions: buildExtensions(),
    });
    v.setState(newState);
    requestAnimationFrame(() => {
      if (viewRef.current) {
        viewRef.current.dispatch({
          selection: { anchor: from, head: to },
        });
      }
    });
    isRebuilding.current = false;
  }, [buildExtensions]);

  // Handle external content change (tab switch etc.)
  useEffect(() => {
    if (!viewRef.current) return;
    if (isRebuilding.current) return;
    const v = viewRef.current;
    if (content !== v.state.doc.toString()) {
      const sel = v.state.selection.main;
      externalUpdate.current = true;
      v.dispatch({
        changes: { from: 0, to: v.state.doc.length, insert: content },
        selection: { anchor: Math.min(sel.anchor, content.length), head: Math.min(sel.head, content.length) },
      });
      externalUpdate.current = false;
    }
  }, [content]);

  // Context menu handler
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const view = viewRef.current;
    if (!view) return;
    const sel = view.state.selection.main;
    const hasSelection = sel.from !== sel.to;
    if (!hasSelection) {
      // Also check if there's any text content at all
      const doc = view.state.doc.toString();
      if (!doc.trim()) return;
    }
    // Always show menu — if no selection, will show prompt on click
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    window.addEventListener('contextmenu', handler);
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('contextmenu', handler);
    };
  }, [contextMenu]);

  const isDark = darkMode;

  return (
    <div className="relative h-full w-full" onContextMenu={handleContextMenu}>
      <div ref={containerRef} className="h-full w-full" />

      {/* Context Menu */}
      {contextMenu && (
        <div
          className={`fixed z-[100] py-1 rounded-lg shadow-xl border min-w-[200px] ${
            isDark
              ? 'bg-slate-800 border-slate-700'
              : 'bg-white border-slate-200'
          }`}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`px-3 py-1 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            文本加引号转换
          </div>
          {PRESET_MODES.map((mode, index) => (
            <button
              key={mode.label}
              className={`w-full text-left px-4 py-1.5 text-sm transition-colors ${
                index === lastQuoteModeRef.current
                  ? (isDark ? 'text-primary-400 bg-primary-900/20' : 'text-primary-700 bg-primary-50')
                  : (isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50')
              }`}
              onClick={() => handleContextMenuAction(index)}
            >
              {mode.label}
              {index === lastQuoteModeRef.current && <span className="ml-2 text-xs text-primary-500">(默认)</span>}
            </button>
          ))}
          <div className={`mx-3 my-1 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`} />
          <button
            className={`w-full text-left px-4 py-1.5 text-sm transition-colors ${
              isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => handleContextMenuAction(-1)}
          >
            ⚙ 自定义...
          </button>
        </div>
      )}

      {/* Custom Dialog */}
      {customDialog.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setCustomDialog({ ...customDialog, open: false })}>
          <div
            className={`rounded-xl shadow-2xl border p-5 w-[400px] ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              自定义引号转换
            </h3>

            <div className="space-y-3">
              {/* Quote type */}
              <div className="flex items-center justify-between">
                <label className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>引号类型</label>
                <select
                  value={customDialog.options.quoteType}
                  onChange={(e) => setCustomDialog(d => ({
                    ...d,
                    options: { ...d.options, quoteType: e.target.value as '"' | "'" },
                  }))}
                  className={`text-xs px-2 py-1 rounded border ${
                    isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <option value='"'>双引号 "..."</option>
                  <option value="'">单引号 '...'</option>
                </select>
              </div>

              {/* Separator */}
              <div className="flex items-center justify-between">
                <label className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>分隔符</label>
                <div className="flex gap-1">
                  {[',\n', ' ', ', ', ',', '\n', ';', '; '].map((sep) => (
                    <button
                      key={sep}
                      onClick={() => setCustomDialog(d => ({
                        ...d,
                        options: { ...d.options, separator: sep },
                      }))}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                        customDialog.options.separator === sep
                          ? 'bg-primary-500 text-white border-primary-500'
                          : isDark
                            ? 'border-slate-600 text-slate-400 hover:bg-slate-700'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {sep === ',\n' ? '逗号+换行' : sep === ', ' ? '逗号空格' : sep === ',' ? '逗号' : sep === '\n' ? '仅换行' : sep === ' ' ? '空格' : sep.replace(' ', '␣')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Checkboxes */}
              <label className={`flex items-center gap-2 text-xs cursor-pointer ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <input
                  type="checkbox"
                  checked={customDialog.options.escapeInternal}
                  onChange={(e) => setCustomDialog(d => ({
                    ...d,
                    options: { ...d.options, escapeInternal: e.target.checked },
                  }))}
                  className="rounded"
                />
                转义内部引号
              </label>

              <label className={`flex items-center gap-2 text-xs cursor-pointer ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <input
                  type="checkbox"
                  checked={customDialog.options.trimLines}
                  onChange={(e) => setCustomDialog(d => ({
                    ...d,
                    options: { ...d.options, trimLines: e.target.checked },
                  }))}
                  className="rounded"
                />
                去除首尾空白
              </label>

              <label className={`flex items-center gap-2 text-xs cursor-pointer ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <input
                  type="checkbox"
                  checked={customDialog.options.skipEmptyLines}
                  onChange={(e) => setCustomDialog(d => ({
                    ...d,
                    options: { ...d.options, skipEmptyLines: e.target.checked },
                  }))}
                  className="rounded"
                />
                跳过空行
              </label>

              <label className={`flex items-center gap-2 text-xs cursor-pointer ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <input
                  type="checkbox"
                  checked={customDialog.options.addTrailingSeparator}
                  onChange={(e) => setCustomDialog(d => ({
                    ...d,
                    options: { ...d.options, addTrailingSeparator: e.target.checked },
                  }))}
                  className="rounded"
                />
                最后一行为尾逗号
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setCustomDialog({ ...customDialog, open: false })}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  isDark ? 'border-slate-600 text-slate-400 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                取消
              </button>
              <button
                onClick={() => {
                  const view = viewRef.current;
                  if (!view) return;
                  const sel = view.state.selection.main;
                  let text = view.state.sliceDoc(sel.from, sel.to);
                  if (!text) {
                    const input = window.prompt('输入要转换的文本（每行一个值）：');
                    if (!input) return;
                    text = input;
                  }
                  const transformed = transformToQuotedLines(text, customDialog.options);
                  view.dispatch({
                    changes: { from: sel.from, to: sel.to, insert: transformed },
                  });
                  setCustomDialog({ ...customDialog, open: false });
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
              >
                转换
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
