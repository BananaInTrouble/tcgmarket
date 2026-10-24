// Cache de l'app (service worker) : ce qui a déjà été vu s'affiche tout de suite, même sans réseau.
//  - images (cartes, logos, sprites) : gardées sur le téléphone, réseau seulement la première fois ;
//  - fichiers de l'app (noms avec empreinte) : gardés jusqu'à la version suivante ;
//  - catalogue : copie locale de moins d'une heure tout de suite (mise à jour en arrière-plan), sinon réseau d'abord ;
//  - prix et taux de change : réseau d'abord, cache si le réseau est lent ou absent.
const VERSION = '1792832488622';
const BASE = '/tcgmarket/app';
const APP = `app-${VERSION}`;
const IMAGES = 'images-v1';
const DATA = 'data-v1';
const LIVE = 'live-v1';
const MAX_IMAGES = 6000;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(APP).then((c) => c.addAll([`${BASE}/`, `${BASE}/manifest.json`])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('app-') && k !== APP) await caches.delete(k);
    await self.clients.claim();
  })());
});

const isImage = (req, url) => req.destination === 'image' || /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(url.pathname);
const LIVE_HOSTS = ['api.tcgdex.net', 'optcgapi.com', 'api.riftcodex.com', 'api.frankfurter.app'];

let trimming = false;
async function trimImages() {
  if (trimming) return;
  trimming = true;
  try {
    const c = await caches.open(IMAGES);
    const keys = await c.keys();
    // Les plus anciennes d'abord (ordre d'ajout).
    for (const k of keys.slice(0, Math.max(0, keys.length - MAX_IMAGES))) await c.delete(k);
  } finally {
    trimming = false;
  }
}

async function cacheFirst(req, name, onStore) {
  const c = await caches.open(name);
  const hit = await c.match(req);
  // Une image gardée pour une balise <img> (réponse opaque) ne sert pas à une lecture en CORS (scanner).
  if (hit && (hit.type !== 'opaque' || req.mode === 'no-cors')) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') {
    c.put(req, res.clone()).then(onStore, () => {});
  }
  return res;
}

async function networkFirst(req, name, timeoutMs) {
  const c = await caches.open(name);
  const net = fetch(req).then((res) => {
    if (res.ok) c.put(req, res.clone()).catch(() => {});
    return res;
  });
  const timer = new Promise((resolve) => setTimeout(resolve, timeoutMs));
  const first = await Promise.race([net.catch(() => null), timer]);
  if (first) return first;
  const hit = await c.match(req);
  if (hit) return hit;
  return net;
}

/**
 * Copie récente (moins de `freshMs`) servie tout de suite et rafraîchie en arrière-plan pour la fois suivante ;
 * plus ancienne ou absente : réseau d'abord (copie locale si le réseau traîne). Les prix changent au plus une fois
 * par heure : inutile d'attendre le réseau à chaque ouverture d'extension.
 */
async function freshOrNetwork(event, req, name, freshMs, timeoutMs) {
  const c = await caches.open(name);
  const hit = await c.match(req);
  const age = hit ? Date.now() - Date.parse(hit.headers.get('date') ?? '') : Infinity;
  if (hit && age < freshMs) {
    event.waitUntil(fetch(req).then((res) => (res.ok ? c.put(req, res) : undefined)).catch(() => {}));
    return hit;
  }
  return networkFirst(req, name, timeoutMs);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
  const same = url.origin === self.location.origin;

  // Pages de l'app : réseau d'abord (nouvelle version), page en cache sans réseau.
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, APP, 4000).catch(async () => (await caches.match(`${BASE}/`)) ?? Response.error()));
    return;
  }
  if (same && (url.pathname.startsWith(`${BASE}/_expo/`) || url.pathname.startsWith(`${BASE}/assets/`))) {
    event.respondWith(cacheFirst(req, APP));
    return;
  }
  if (isImage(req, url)) {
    event.respondWith(cacheFirst(req, IMAGES, trimImages));
    return;
  }
  // Catalogue (prix, liens) : copie de moins d'une heure tout de suite, sinon réseau d'abord ; copie locale sans réseau.
  if (same && url.pathname.includes('/catalog/')) {
    event.respondWith(freshOrNetwork(event, req, DATA, 3600 * 1000, 3000));
    return;
  }
  if (LIVE_HOSTS.includes(url.hostname)) {
    event.respondWith(networkFirst(req, LIVE, 5000));
    return;
  }
  // Bibliothèque et modèle du scanner : identiques d'une fois à l'autre.
  if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'huggingface.co' || url.hostname.endsWith('.hf.co')) {
    event.respondWith(cacheFirst(req, DATA));
  }
});

// Notifications envoyées par le robot des prix (alertes de la liste de souhaits), même appli fermée.
// Diagnostic : la dernière alerte reçue (et l'erreur éventuelle) est notée, et affichée dans la liste de souhaits.
const DIAG = 'diag-v1';
const note = (key, value) => caches.open(DIAG)
  .then((c) => c.put(`${BASE}/__diag/${key}`, new Response(JSON.stringify({ at: Date.now(), ...value }))))
  .catch(() => {});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() }; }
  event.waitUntil((async () => {
    await note('push', { title: data.title || '' });
    try {
      await self.registration.showNotification(data.title || 'TCGMarket', {
        body: data.body || '',
        icon: data.icon || `${BASE}/pwa-192.png`,
        badge: `${BASE}/pwa-192.png`,
        // Même étiquette qu'une notification encore affichée : la remplacer en la signalant de nouveau (sinon iPhone
        // la remplace en silence, sans bannière ni son).
        tag: data.tag,
        renotify: !!data.tag,
        data: { url: data.url || `${BASE}/wishlist` },
      });
    } catch (e) {
      await note('error', { message: String(e && e.message || e) });
      // Sans icône (image inaccessible) en dernier recours : une notification doit toujours s'afficher.
      await self.registration.showNotification(data.title || 'TCGMarket', { body: data.body || '', data: { url: data.url || `${BASE}/wishlist` } });
    }
  })());
});

// Toucher la notification : ouvre l'app (ou la ramène au premier plan) sur la liste de souhaits.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || `${BASE}/`;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (w.url.startsWith(self.location.origin + BASE)) {
        await w.focus();
        if ('navigate' in w) await w.navigate(url).catch(() => {});
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
