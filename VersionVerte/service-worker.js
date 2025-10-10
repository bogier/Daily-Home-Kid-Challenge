/* Daily Home Kid Challenge - SW v4.4.0 (no-cache for HTML) */
const SW_VERSION = 'v4.4.0';
const STATIC_CACHE = `dhkc-static-${SW_VERSION}`;

/* ✅ Pré-cache: uniquement les assets statiques + pages HTML pour fallback */
const PRECACHE_ASSETS = [
  'index.html',
  'settings.html',
  'about.html',
  'install.html',
  'purge.html',
  'changelog.html',
  'style.css',
  'manifest.json'
  // ➕ ajoute ici tes icônes si besoin:
  // 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE_ASSETS);
    } catch (e) {
      // non bloquant
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k.startsWith('dhkc-static-') && k !== STATIC_CACHE)
          .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

/* 🔧 Stratégies
   - HTML / navigations: network-first + no-store (pas de cache SW)
   - Autres (css/js/img): cache-first (rapide, avec MAJ en arrière-plan)
*/
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(networkFirstNoStore(req));
  } else {
    const url = new URL(req.url);
    if (url.origin === self.location.origin) {
      event.respondWith(cacheFirst(req));
    } else {
      event.respondWith(fetch(req));
    }
  }
});

async function networkFirstNoStore(req) {
  try {
    const fresh = await fetch(req, { cache: 'no-store', credentials: 'same-origin' });
    return fresh;
  } catch (err) {
    const cache = await caches.open(STATIC_CACHE);
    const fallback = await cache.match('index.html') || await cache.match('/index.html');
    return fallback || new Response('Hors ligne', { status: 503, statusText: 'Offline' });
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req);
  if (cached) {
    fetch(req).then(resp => { if (resp && resp.ok) cache.put(req, resp.clone()); }).catch(()=>{});
    return cached;
  }
  const network = await fetch(req);
  if (network && network.ok) cache.put(req, network.clone());
  return network;
}
