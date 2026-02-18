
const CACHE_NAME = 'smartbudget-v12';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com'
];

const sw = self;

// Install event: Cache core assets immediately
sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // We attempt to cache these. If one fails, it won't block install entirely.
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn("Some assets failed to cache", err));
    })
  );
  sw.skipWaiting();
});

// Activate event: Clean up old caches
sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  sw.clients.claim();
});

// Fetch event: Stale-while-revalidate strategy
sw.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. IGNORE: Non-GET requests (POST/PUT/DELETE)
  if (event.request.method !== 'GET') return;

  // 2. IGNORE: API calls (Supabase, Google AI) to ensure fresh data
  if (url.hostname.includes('supabase.co') || 
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('generativelanguage.googleapis.com')) {
    return;
  }

  // 3. CACHE: Assets, CDN libs, and App Shell
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Cache valid responses. 
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (networkResponse.type === 'basic' || networkResponse.type === 'cors')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });

      // If cached response exists, return it immediately.
      if (cachedResponse) {
        fetchPromise.catch(() => { /* mute background errors */ });
        return cachedResponse;
      }

      return fetchPromise;
    })
  );
});
