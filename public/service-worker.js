const STATIC_CACHE = "cyber-chronicle-static-v2";
const DATA_CACHE = "cyber-chronicle-data-v1";
const OFFLINE_CACHE = "cyber-chronicle-offline-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DATA_CACHE && key !== OFFLINE_CACHE)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET"
    || url.origin !== self.location.origin
  ) {
    return;
  }

  /* ---- Stale-while-revalidate for news.json ---- */
  if (url.pathname.endsWith("/data/news.json")) {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => null);
        if (cached) {
          /* Return cached immediately, update in background */
          networkPromise; // fire-and-forget
          return cached;
        }
        const networkResponse = await networkPromise;
        return networkResponse || new Response(JSON.stringify({
          state: "unavailable",
          generatedAt: new Date().toISOString(),
          lastSuccessfulAt: null,
          cacheAgeSeconds: null,
          notice: "You are offline. No cached edition is available.",
          items: [],
          sources: [],
        }), { headers: { "content-type": "application/json" } });
      }),
    );
    return;
  }

  /* ---- Cache-first for static assets ---- */
  if (url.pathname.includes("/_next/static/") || url.pathname.includes("/assets/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  /* ---- Network-first for HTML pages ---- */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(OFFLINE_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
    );
    return;
  }

  /* ---- Cache-first for app icons and images ---- */
  if (/\.(png|svg|webp|jpg|jpeg|ico|webmanifest)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      }),
    );
  }
});

/* ---- Push Notifications ---- */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Cyber Chronicle", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Cyber Chronicle Alert", {
      body: data.body || "A new security alert has been published.",
      icon: data.icon || "/CYBER-CHRONICAL/app-icon-192.png",
      badge: "/CYBER-CHRONICAL/app-icon-192.png",
      tag: data.tag || "cyber-chronicle-alert",
      renotify: !!data.tag,
      data: { url: data.url || "/CYBER-CHRONICAL/" },
      vibrate: [100, 50, 100],
      actions: [
        { action: "read", title: "Read now" },
        { action: "dismiss", title: "Dismiss" },
      ],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const targetUrl = event.notification.data?.url || "/CYBER-CHRONICAL/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("CYBER-CHRONICAL") && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
