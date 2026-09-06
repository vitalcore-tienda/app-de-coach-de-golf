/*
 * GolfCoach Pro - PWA app shell cache
 *
 * Las fichas y las rondas viven en IndexedDB; este worker conserva la
 * interfaz disponible cuando no hay conexión. Al cambiar los archivos de la
 * lista, incrementá CACHE_VERSION para publicar una versión nueva.
 */

const CACHE_VERSION = 'golfcoach-pro-shell-v27';
const CACHE_PREFIX = 'golfcoach-pro-';
const toScopeUrl = (path) => new URL(path, self.registration.scope).href;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css?v=27',
  './css/components.css?v=27',
  './js/icons.js?v=27',
  './js/utils.js?v=27',
  './js/database.js?v=27',
  './js/storage.js?v=27',
  './js/players.js?v=27',
  './js/pwa.js?v=27',
  './js/assessment.js?v=27',
  './js/drills.js?v=27',
  './js/mental.js?v=27',
  './js/tactics.js?v=27',
  './js/rounds.js?v=27',
  './js/mentor.js?v=27',
  './js/app.js?v=27',
  './js/auth.js?v=27',
  './js/player-portal.js?v=27',
  './js/cloud-sync.js?v=27',
  './vendor/supabase/supabase-js-2.112.3.js',
  './assets/icons/favicon-32.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-96.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-192-maskable.png',
  './assets/icons/icon-512-maskable.png'
].map(toScopeUrl);

const APP_SHELL_URL = toScopeUrl('./index.html');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // El navegador busca este archivo para actualizar el worker: no lo sirvas
  // desde el cache o podría no detectar una versión nueva.
  if (url.pathname.endsWith('/service-worker.js')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.origin === self.location.origin) {
    // No cachear futuros endpoints autenticados o de sincronización.
    if (url.pathname.includes('/api/') || url.pathname.includes('/auth/')) return;
    event.respondWith(cacheFirst(request));
    return;
  }

  // Las fuentes remotas no bloquean el uso offline: si ya se descargaron,
  // se reutilizan; si no, la app cae a las fuentes del sistema.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirstNavigation(request) {
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado.')), 4500))
    ]);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      await cache.put(APP_SHELL_URL, response.clone());
      return response;
    }
    throw new Error(`Respuesta de navegación no válida: ${response?.status || 'sin estado'}`);
  } catch (error) {
    return (await caches.match(APP_SHELL_URL)) || (await caches.match(toScopeUrl('./')));
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(CACHE_VERSION);
    await cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        const cache = await caches.open(CACHE_VERSION);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || network;
}
