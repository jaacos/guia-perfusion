// service-worker.js

const CACHE_NAME = 'guia-perfusion-cache-v1';
// Lista de archivos que se guardarán en la caché para el funcionamiento offline.
const urlsToCache = [
  './', // El archivo index.html
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Evento 'install': se dispara cuando el service worker se instala.
// Aquí abrimos la caché y añadimos los archivos de nuestra app.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierta');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento 'fetch': se dispara cada vez que la app pide un recurso (una página, un script, una imagen).
// El service worker intercepta la petición.
self.addEventListener('fetch', event => {
  event.respondWith(
    // Primero, intentamos buscar el recurso en la caché.
    caches.match(event.request)
      .then(response => {
        // Si el recurso está en la caché, lo devolvemos desde ahí.
        if (response) {
          return response;
        }
        // Si no está en la caché, vamos a la red a buscarlo.
        return fetch(event.request);
      }
    )
  );
});

// Evento 'activate': se dispara cuando el service worker se activa.
// Aquí se puede limpiar cachés antiguas si las hubiera.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
