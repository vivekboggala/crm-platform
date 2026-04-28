const CACHE_VERSION = 'v1-' + Date.now(); // Cache busting version

self.addEventListener('install', (event) => {
  console.log('Service Worker installing. Version:', CACHE_VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Always fetch from network to avoid stale UI
  event.respondWith(fetch(event.request));
});
