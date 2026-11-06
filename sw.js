// ── Cancionero Católico — Service Worker v7.1 ──────────────────
const CACHE_NAME = 'cancionero-v7.1';
const STATIC_FILES = [
  '/Cancionero/',
  '/Cancionero/index.html',
  '/Cancionero/guitar.json',
  '/Cancionero/manifest.json',
  '/Cancionero/icon-72.png',
  '/Cancionero/icon-96.png',
  '/Cancionero/icon-128.png',
  '/Cancionero/icon-144.png',
  '/Cancionero/icon-152.png',
  '/Cancionero/icon-192.png',
  '/Cancionero/icon-384.png',
  '/Cancionero/icon-512.png'
];

// Instalar — cachear archivos estáticos
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_FILES).catch(function(err) {
        console.log('SW: algunos archivos no se pudieron cachear:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activar — limpiar cachés viejas
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — Network first para API, Cache first para estáticos
self.addEventListener('fetch', function(event) {
  const url = event.request.url;

  // No interceptar llamadas al Apps Script ni a APIs externas
  if (url.includes('script.google.com') ||
      url.includes('open.spotify.com') ||
      url.includes('youtube.com') ||
      url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(function() {
        return caches.match(event.request).then(function(cached) {
          if (cached) return cached;
          // Página offline para navegación
          if (event.request.mode === 'navigate') {
            return caches.match('/Cancionero/index.html');
          }
          return new Response('Sin conexión', { status: 503 });
        });
      })
  );
});

// Mensaje para forzar actualización
self.addEventListener('message', function(event) {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
