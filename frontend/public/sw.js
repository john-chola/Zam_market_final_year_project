// ZamMarket Service Worker — Sprint 3
// Offline-first PWA: cache listings, enable offline create + message queue

const CACHE_NAME    = 'zammarket-v1';
const API_CACHE     = 'zammarket-api-v1';
const OFFLINE_QUEUE = 'zammarket-offline-queue';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/index.jsx',
  '/src/App.jsx',
  '/src/index.css',
  'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Noto+Sans:wght@400;500&display=swap',
];

// ── Install: cache static shell ────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache what we can — ignore failures (fonts may be blocked)
      return Promise.allSettled(
        STATIC_ASSETS.map((url) => cache.add(url).catch(() => null))
      );
    })
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ─────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: offline-first strategy ─────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET requests (POST/PUT handled by background sync)
  if (request.method !== 'GET') return;

  // Skip browser-extension and chrome-extension requests
  if (!url.protocol.startsWith('http')) return;

  // API requests — network first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(networkFirstAPI(request));
    return;
  }

  // Static assets — cache first, fall back to network
  e.respondWith(cacheFirstStatic(request));
});

// Network first with cache fallback (for API)
async function networkFirstAPI(request) {
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline — serve from cache
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return empty listings array for browse page
    if (request.url.includes('/api/listings')) {
      return new Response(
        JSON.stringify({
          status: 'success',
          listings: [],
          pagination: { total: 0, page: 1, pages: 0, hasMore: false },
          offline: true,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({ status: 'error', message: 'You are offline', offline: true }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Cache first (for static files)
async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return cached index.html for navigation (SPA fallback)
    const fallback = await caches.match('/index.html');
    return fallback || new Response('Offline', { status: 503 });
  }
}

// ── Background sync: flush offline queue ──────────────────
self.addEventListener('sync', (e) => {
  if (e.tag === 'zammarket-sync-messages') {
    e.waitUntil(syncOfflineMessages());
  }
});

async function syncOfflineMessages() {
  // Notify all open clients to flush their IndexedDB queue
  const clients = await self.clients.matchAll();
  clients.forEach((client) => client.postMessage({ type: 'FLUSH_QUEUE' }));
}