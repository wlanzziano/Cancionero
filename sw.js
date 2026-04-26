// ── Cancionero Católico — Service Worker ──────────────────
const CACHE_NAME = 'cancionero-v3';
const STATIC_FILES = [
  '/Cancionero/',
  '/Cancionero/index.html',
  '/Cancionero/guitar.json',
  '/Cancionero/manifest.json',
  '/Cancionero/icon-192.png',
  '/Cancionero/icon-512.png',
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

// Fetch — estrategia: Network first, caché como fallback
// Para Google Fonts y APIs externas: solo network (no cachear)
// Para archivos locales: network first, si falla usa caché
self.addEventListener('fetch', function(event) {
  const url = event.request.url;

  // No interceptar llamadas al Apps Script ni a APIs externas
  if (url.includes('script.google.com') ||
      url.includes('open.spotify.com') ||
      url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com')) {
    return; // dejar pasar sin interceptar
  }

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Si la respuesta es válida, actualizar la caché
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(function() {
        // Sin red — intentar desde caché
        return caches.match(event.request).then(function(cached) {
          if (cached) return cached;
          // Si piden index.html y no está en caché, devolver página de error mínima
          if (event.request.mode === 'navigate') {
            return caches.match('/Cancionero/index.html');
          }
          return new Response('Sin conexión', { status: 503 });
        });
      })
  );
});
