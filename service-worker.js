// ═══════════════════════════════════════════════════════════════════════════════
//  Service Worker — Guía Rápida de Perfusión
//  ESTRATEGIA: network-first para HTML y datos (siempre la versión más reciente),
//  cache-first para estáticos. Elimina la necesidad de bumpear la versión a mano
//  cada vez que se corrige un fármaco.
// ═══════════════════════════════════════════════════════════════════════════════
const CACHE_NAME = 'guia-perfusion-v10';

const PRECACHE = [
  './',
  './index.html',
  './farmacos.json',
  './manifest.json'
];

// Recursos que SIEMPRE deben intentar red antes que caché
const FRESCOS = ['/', '/index.html', '/farmacos.json'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;                       // el POST del chat no se cachea

  const url = new URL(req.url);
  if (url.pathname.startsWith('/.netlify/')) return;      // nunca cachear la función Gemini

  const esFresco = req.mode === 'navigate' ||
                   FRESCOS.some(p => url.pathname === p || url.pathname.endsWith(p));

  if (esFresco) {
    // NETWORK-FIRST: red → si falla (offline), caché
    event.respondWith(
      fetch(req)
        .then(res => {
          const copia = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copia));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
  } else {
    // CACHE-FIRST para el resto (iconos, fuentes...)
    event.respondWith(
      caches.match(req).then(r => r || fetch(req).then(res => {
        const copia = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copia));
        return res;
      }))
    );
  }
});
