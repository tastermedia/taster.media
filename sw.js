// Taster Media service worker — stale-while-revalidate for static assets,
// network-first for videos.json so new uploads show up quickly.
const VERSION = 'v2';
const STATIC_CACHE = `taster-static-${VERSION}`;
const DATA_CACHE = `taster-data-${VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css?v=41',
  '/scripts.js?v=38',
  '/header.html',
  '/header.js',
  '/manifest.json',
  '/images/logo.webp',
  '/images/logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== STATIC_CACHE && k !== DATA_CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache cross-origin requests (YouTube iframe, fonts, CDN scripts)
  if (url.origin !== self.location.origin) return;

  // videos.json: network-first so new uploads appear immediately, cache as fallback
  if (url.pathname.endsWith('/videos.json')) {
    event.respondWith(
      fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(DATA_CACHE).then((cache) => cache.put(req, copy));
        return resp;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((resp) => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy));
        }
        return resp;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
