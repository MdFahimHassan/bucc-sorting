import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './App';
import { registerSW } from 'virtual:pwa-register';
import { isLiteDevice } from './lib/motion';

// Checks for a new version on every load and reloads once when it takes over (registerType: autoUpdate).
registerSW({ immediate: true });

// Low-end phones: switch off decorative infinite animations (see .lite in index.css).
if (isLiteDevice()) document.documentElement.classList.add('lite');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);