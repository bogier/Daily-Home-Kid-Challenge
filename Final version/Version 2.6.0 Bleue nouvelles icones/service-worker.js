/* Daily Home Kid Challenge - SW v4.6.18 (optimisé 2025) */
const SW_VERSION = 'v4.6.18';
const STATIC_CACHE = `dhkc-static-${SW_VERSION}`;
const PRECACHE_ASSETS = [
  './index.html',
  './settings.html',
  './about.html',
  './install.html',
  './purge.html',
  './changelog.html',
  './style.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* 🧩 Installation : pré-cache des assets essentiels */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE_ASSETS);
      console.log(`[SW] ${SW_VERSION} installé avec succès.`);
    } catch (e) {
      console.warn('[SW] Erreur pendant le pré-cache :', e);
    }
  })());
  self.skipWaiting();
});

/* 🧹 Activation : suppression des anciens caches + prise en charge immédiate */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k.startsWith('dhkc-static-') && k !== STATIC_CACHE)
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
    console.log(`[SW] ${SW_VERSION} activé et anciens caches nettoyés.`);
  })());
});

/* 🚀 Fetch : stratégie mixte
   - HTML : network-first avec fallback cache
   - autres : cache-first + mise à jour en arrière-plan
*/
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(networkFirst(req));
  } else {
    const url = new URL(req.url);
    if (url.origin === self.location.origin) {
      event.respondWith(cacheFirst(req));
    }
  }
});

/* 🛰️ HTML : priorise le réseau, fallback vers cache */
async function networkFirst(req) {
  try {
    const fresh = await fetch(req, { cache: 'no-store', credentials: 'same-origin' });
    return fresh;
  } catch (err) {
    const cache = await caches.open(STATIC_CACHE);
    const fallback =
      (await cache.match('./index.html')) ||
      (await cache.match('/index.html'));
    return fallback || new Response('⚠️ Hors ligne', { status: 503 });
  }
}

/* 💾 Static : priorise le cache, MAJ en arrière-plan */
async function cacheFirst(req) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req);
  if (cached) {
    fetch(req)
      .then(resp => {
        if (resp?.ok) cache.put(req, resp.clone());
      })
      .catch(() => {});
    return cached;
  }
  const network = await fetch(req);
  if (network?.ok) cache.put(req, network.clone());
  return network;
}

/* 🔄 Gestion du skipWaiting via message (pour MAJ auto) */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
