const CACHE = "errorlens-v4";
const ASSETS = [
  "/",
  "/index.html",
  "/styles.css?v=4",
  "/catalog.js?v=4",
  "/app.js?v=4",
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
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok && new URL(event.request.url).origin === location.origin) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
