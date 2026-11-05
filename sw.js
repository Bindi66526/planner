// Lets the Planner open with no internet connection.
// Your lists aren't stored here. They stay in the browser's own storage on your phone.
var CACHE = 'planner-v1';
var FILES = [
  './todo.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (names) {
        return Promise.all(names.map(function (name) {
          return name === CACHE ? null : caches.delete(name);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function saveCopy(request, response) {
  if (response && (response.ok || response.type === 'opaque')) {
    var copy = response.clone();
    caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
  }
  return response;
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url);

  // Fonts rarely change, so use the saved copy first.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(request).then(function (saved) {
        return saved || fetch(request).then(function (response) { return saveCopy(request, response); });
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // App files: get the newest version when online, and the saved copy when offline.
  event.respondWith(
    fetch(request)
      .then(function (response) { return saveCopy(request, response); })
      .catch(function () {
        return caches.match(request).then(function (saved) {
          return saved || (request.mode === 'navigate' ? caches.match('./todo.html') : Response.error());
        });
      })
  );
});
