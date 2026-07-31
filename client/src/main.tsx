import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './App';
import { applyCachedAppearance } from './lib/theme';

// Apply the cached admin-configured theme + fonts before first paint (avoids flash).
applyCachedAppearance();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
