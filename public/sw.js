const CACHE_NAME = "luqmati-shell-v2";
const OFFLINE_URL = "/offline.html";

const APP_SHELL = [
  "/",
  "/history",
  "/profile",
  "/offline.html",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // A single route failing during install must not make the whole PWA
      // unusable. Successful routes and assets are still retained.
      await Promise.allSettled(APP_SHELL.map((asset) => cache.add(asset)));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function offlineAnalysisResponse() {
  return new Response(
    JSON.stringify({
      error: "Internet connection is required to analyze a new meal.",
      offline: true,
    }),
    { status: 503, headers: { "Content-Type": "application/json" } }
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isSameOrigin(request)) return;

  const url = new URL(request.url);

  // Never cache private APIs or upload bodies. Offline analysis gets an
  // explicit response so the UI can show a retryable message immediately.
  if (url.pathname === "/api/analyze-food") {
    event.respondWith(fetch(request).catch(() => offlineAnalysisResponse()));
    return;
  }
  if (url.pathname.startsWith("/api/")) return;

  if (request.method !== "GET") return;

  // Static Next assets are immutable and safe to cache for the app shell.
  if (url.pathname.startsWith("/_next/static/") || request.destination === "font" || request.destination === "image") {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
      )
    );
    return;
  }

  // Network-first navigation keeps the app fresh, then serves the previously
  // visited shell. The offline page is the final fallback for a cold route.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) =>
      cached ||
      fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
    )
  );
});
