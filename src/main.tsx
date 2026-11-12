import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register custom PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(reg => {
        console.log('[Guía SUC] Service Worker registrado con éxito en:', reg.scope);
      })
      .catch(err => {
        console.warn('[Guía SUC] Registro de Service Worker omitido:', err);
      });
  });
}
