// Service Worker for File Sync QR Web App
const CACHE_NAME = 'file-sync-qr-v1';
const urlsToCache = [
    '/frontend/',
    '/frontend/index.html',
    '/frontend/styles.css',
    '/frontend/app.js'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            }
        )
    );
});
