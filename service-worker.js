// アプリシェルをキャッシュしてオフライン起動を可能にする。
// （AI分析はネットワーク必須。記録閲覧などはオフラインでも可能。）
const CACHE = 'keto-app-v10';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './js/app.js',
  './js/ui.js',
  './js/store.js',
  './js/db.js',
  './js/ai.js',
  './js/backend.js',
  './js/i18n.js',
  './js/oura.js',
  './js/charts.js',
  './js/speech.js',
  './js/nutrition.js',
  './js/views/dashboard.js',
  './js/views/log.js',
  './js/views/history.js',
  './js/views/profile.js',
  './js/views/progress.js',
  './js/views/checkups.js',
  './js/views/settings.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // API・外部リクエストはキャッシュせずそのまま通す
  if (url.origin !== self.location.origin) return;
  // アプリシェルは cache-first
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => cached))
  );
});
