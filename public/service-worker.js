// ═════════════════════════════════════════════════════════════════════════════
//  Service Worker — Guía Rápida de Perfusión
//
//  ESTRATEGIA: para HTML y datos, red CON TIMEOUT y caída a caché.
//  El network-first puro es peligroso en uso extrahospitalario: en zona de
//  cobertura pobre el fetch no falla, se queda colgado, y la guía tarda
//  30 s o más en pintar. Con timeout, a los 2,5 s se sirve la caché.
//
//  Nunca se cachea una respuesta que no sea res.ok: un 404 con cuerpo HTML
//  guardado como farmacos.json rompe la app en offline de forma permanente.
// ═════════════════════════════════════════════════════════════════════════════
const CACHE_NAME = 'guia-perfusion-v13';
const TIMEOUT_MS = 2500;

const PRECACHE = [
  './',
  './index.html',
  './farmacos.json',
  './manifest.json',
  './icons/maskable_icon_x192.png',
  './icons/maskable_icon_x512.png'
];

// Recursos que deben intentar red antes que caché (rutas relativas: la app
// puede estar servida bajo un subdirectorio, p. ej. GitHub Pages).
const FRESCOS = ['index.html', 'farmacos.json', 'manifest.json'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // addAll falla entero si un recurso falta; se añaden de uno en uno
      // para que un icono ausente no impida la instalación.
      Promise.all(PRECACHE.map(u =>
        cache.add(u).catch(e => console.warn('SW precache omitido:', u, e))
      ))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function guardar(req, res) {
  if (!res || !res.ok || res.type === 'opaque') return res;   // nunca cachear errores
  const copia = res.clone();
  caches.open(CACHE_NAME).then(c => c.put(req, copia)).catch(() => {});
  return res;
}

/** Red con timeout: si tarda más de TIMEOUT_MS, se responde desde caché. */
function redConTimeout(req) {
  return new Promise(resolve => {
    let resuelto = false;
    const fin = r => { if (!resuelto) { resuelto = true; resolve(r); } };

    const t = setTimeout(() => {
      caches.match(req).then(c => { if (c) fin(c); });
    }, TIMEOUT_MS);

    fetch(req)
      .then(res => { clearTimeout(t); fin(guardar(req, res)); })
      .catch(() => {
        clearTimeout(t);
        caches.match(req).then(c => fin(c || caches.match('./index.html')));
      });
  });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // nada de terceros

  const nombre = url.pathname.split('/').pop();
  const esFresco = req.mode === 'navigate' || FRESCOS.includes(nombre);

  event.respondWith(
    esFresco
      ? redConTimeout(req)
      : caches.match(req).then(c => c || fetch(req).then(res => guardar(req, res)))
  );
});
