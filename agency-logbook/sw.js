/* =========================================================
   sw.js — Service Worker
   Caches all app files so the logbook works fully offline.
   On first load: downloads and caches everything.
   On repeat visits: serves from cache instantly, then
   checks for updates in the background.
========================================================= */

const CACHE_NAME = 'logbook-v9';

// All files the app needs to work offline
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/utils.js',
  './js/storage.js',
  './js/googlesheets.js',
  './js/signature.js',
  './js/render.js',
  './js/export.js',
  './js/app.js',
  './js/backup.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

/* ---- Install: cache everything ---- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

/* ---- Activate: remove old caches ---- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* ---- Fetch: serve from cache, fall back to network ---- */
self.addEventListener('fetch', event => {
  // Don't intercept Google Apps Script calls — always needs live network
  if (event.request.url.includes('script.google.com')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Serve cache immediately, update cache in background
        const networkFetch = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {});
        return cached;
      }
      // Not in cache — try network
      return fetch(event.request).catch(() =>
        caches.match('./index.html') // fallback for nav requests
      );
    })
  );
});
