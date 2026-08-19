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

/* ---- Firebase Cloud Messaging Background Push ---- */
importScripts("https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js");

const url = new URL(location);
const apiKey = url.searchParams.get("apiKey");
if (apiKey) {
  firebase.initializeApp({
    apiKey: url.searchParams.get("apiKey"),
    projectId: url.searchParams.get("projectId"),
    messagingSenderId: url.searchParams.get("messagingSenderId"),
    appId: url.searchParams.get("appId"),
  });
  const messaging = firebase.messaging();
  
  messaging.onBackgroundMessage((payload) => {
    if (!payload.data) return;
    const data = payload.data;
    
    self.registration.showNotification(data.title || "Cyber Chronicle Alert", {
      body: data.body || "A new security alert has been published.",
      image: data.imageUrl || undefined,
      icon: "/CYBER-CHRONICAL/app-icon-192.png",
      badge: "/CYBER-CHRONICAL/app-icon-192.png",
      tag: data.tag || data.storyId || "cyber-chronicle-alert",
      renotify: data.notificationType === "CRITICAL_ALERT",
      data: { 
        url: data.url || "/CYBER-CHRONICAL/",
        storyId: data.storyId,
      },
      vibrate: [100, 50, 100],
      actions: [
        { action: "view", title: "View alert" },
        { action: "dismiss", title: "Dismiss" },
      ],
    });
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  
  let targetUrl = event.notification.data?.url || "/CYBER-CHRONICAL/";
  try {
    const parsedUrl = new URL(targetUrl, self.location.origin);
    if (parsedUrl.origin !== self.location.origin) {
      console.warn("Cross-origin notification navigation blocked:", targetUrl);
      targetUrl = "/CYBER-CHRONICAL/";
    } else {
      targetUrl = parsedUrl.href;
    }
  } catch (e) {
    targetUrl = "/CYBER-CHRONICAL/";
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("CYBER-CHRONICAL") && "focus" in client) {
          client.postMessage({ type: "NAVIGATE", url: targetUrl });
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
