const CACHE = "errorlens-v6";
const ASSETS = [
  "/",
  "/index.html",
  "/styles.css?v=6",
  "/catalog.js?v=6",
  "/app.js?v=6",
  "/manifest.webmanifest",
  "/icon.svg",
  "/fonts/space-grotesk-latin-400-normal.woff2",
  "/fonts/space-grotesk-latin-500-normal.woff2",
  "/fonts/space-grotesk-latin-600-normal.woff2",
  "/fonts/space-grotesk-latin-700-normal.woff2",
  "/fonts/jetbrains-mono-latin-400-normal.woff2",
  "/fonts/jetbrains-mono-latin-700-normal.woff2"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // HTML navigation: always try the network first so deploys go live
  // immediately; fall back to cache only when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/index.html")))
    );
    return;
  }

  // Versioned assets: cache-first, refresh the cache in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
