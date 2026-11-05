import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { useSettingsStore } from './stores/settingsStore';

function Root() {
  const applyTheme = useSettingsStore((s) => s.applyTheme);

  // Apply theme on mount
  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (useSettingsStore.getState().theme === 'system') {
        applyTheme();
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [applyTheme]);

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
