import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './App';
import { applyCachedAppearance } from './lib/theme';

// Apply saved theme before first render to prevent flash
try {
  const saved = JSON.parse(localStorage.getItem('admin-theme') || '{}');
  if (saved?.state?.isDark) document.documentElement.classList.add('dark');
} catch {}

// Apply the cached appearance (colours + fonts) before first paint.
applyCachedAppearance();

// Stop number inputs from changing value on mouse wheel scroll
document.addEventListener(
  'wheel',
  () => {
    const el = document.activeElement as HTMLInputElement | null;
    if (el && el.tagName === 'INPUT' && el.type === 'number') el.blur();
  },
  { passive: true }
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
