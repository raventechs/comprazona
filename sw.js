/*
  ARCHIVO: sw.js
  VERSIÓN: v0.1
  FECHA: 02/08/2026
  PROYECTO: CompraZona — Service Worker (PWA) | RavenTechs
  CHANGELOG:
  - v0.1 (02/08/2026): Cache básico del shell de la app (HTML, CSS, JS, fuentes, Leaflet).
    Network-first para Firebase. Funciona offline mostrando el catálogo cacheado.
*/
var CACHE = 'comprazona-v1';
var SHELL = [
  '/',
  '/index.html',
  '/estilos.css',
  '/core.js',
  '/carrito.svg',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(SHELL.map(function(url) {
        return new Request(url, { mode: 'no-cors' });
      }));
    }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = e.request.url;
  // Firebase y Google APIs siempre desde la red
  if (url.indexOf('firestore') !== -1 || url.indexOf('firebase') !== -1 ||
      url.indexOf('googleapis.com') !== -1 || url.indexOf('gstatic.com') !== -1) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      var network = fetch(e.request).then(function (res) {
        if (res && res.status === 200 && e.request.method === 'GET') {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, clone); });
        }
        return res;
      }).catch(function() { return cached; });
      // Para el shell: cache primero; para el resto: red primero con fallback a cache
      return url.indexOf('comprazona.raventechsapp.com') !== -1 ? (cached || network) : network;
    })
  );
});
