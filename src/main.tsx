import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './App';
import { registerSW } from 'virtual:pwa-register';

// Checks for a new version on every load and reloads once when it takes over (registerType: autoUpdate).
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);