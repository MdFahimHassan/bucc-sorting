import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './App';
import { registerSW } from 'virtual:pwa-register';
import { isLiteDevice } from './lib/motion';

registerSW({ immediate: true });

if (isLiteDevice()) document.documentElement.classList.add('lite');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);