const STATIC_CACHE = "cyber-chronicle-static-v4";
const DATA_CACHE = "cyber-chronicle-data-v1";
const OFFLINE_CACHE = "cyber-chronicle-offline-v1";
const NOTIFICATION_CACHE = "cyber-chronicle-notifications-v1";
const NOTIFICATION_STATE_URL = new URL(".notification-state", self.registration.scope).href;
let notificationWork = Promise.resolve();
const DEFAULT_NOTIFICATION_TOPICS = {
  criticalAlerts: true,
  highSeverityAlerts: true,
  officialAdvisories: true,
  dataBreaches: true,
  threatIntelligence: true,
  aiTechUpdates: false,
  generalNews: false,
};
const DEFAULT_PREFERENCES = {
  enabledDomains: ["Cybersecurity", "AI & Technology", "Business", "Markets", "World", "India", "Science", "Space", "Environment", "Sports", "Entertainment"],
  severityFloor: "all",
  followedState: null,
  notifications: DEFAULT_NOTIFICATION_TOPICS,
};

function normalizePreferences(value) {
  const input = value && typeof value === "object" ? value : {};
  const legacyTopics = input.notifications && typeof input.notifications === "object" ? input.notifications : input;
  return {
    enabledDomains: Array.isArray(input.enabledDomains) && input.enabledDomains.length ? input.enabledDomains : DEFAULT_PREFERENCES.enabledDomains,
    severityFloor: input.severityFloor === "high" || input.severityFloor === "critical" ? input.severityFloor : "all",
    followedState: typeof input.followedState === "string" && input.followedState ? input.followedState : null,
    notifications: { ...DEFAULT_NOTIFICATION_TOPICS, ...legacyTopics },
  };
}

function enqueueNotificationWork(task) {
  notificationWork = notificationWork.catch(() => undefined).then(task);
  return notificationWork;
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DATA_CACHE && key !== OFFLINE_CACHE && key !== NOTIFICATION_CACHE)
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

  /* ---- Stale-while-revalidate for newsroom data ---- */
  if (url.pathname.endsWith("/data/news.json") || url.pathname.endsWith("/data/intelligence.json")) {
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
          void networkPromise; // fire-and-forget
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

/* ---- On-device notification engine (no account, token, or backend) ---- */
async function readNotificationState() {
  const cache = await caches.open(NOTIFICATION_CACHE);
  const response = await cache.match(NOTIFICATION_STATE_URL);
  if (!response) return { enabled: false, initialized: false, preferences: DEFAULT_PREFERENCES, seenIds: [] };
  try {
    const stored = await response.json();
    return { seenIds: [], initialized: false, ...stored, preferences: normalizePreferences(stored.preferences) };
  } catch {
    return { enabled: false, initialized: false, preferences: DEFAULT_PREFERENCES, seenIds: [] };
  }
}

async function writeNotificationState(state) {
  const cache = await caches.open(NOTIFICATION_CACHE);
  await cache.put(NOTIFICATION_STATE_URL, new Response(JSON.stringify(state), { headers: { "content-type": "application/json" } }));
}

function plainTitle(item) {
  const identifier = item.metadata?.type === "cyber" ? item.metadata.identifier : "";
  return identifier ? item.title.replace(`${identifier}: `, "") : item.title.replace(/^CC-[A-Z0-9]+:\s*/, "");
}

function classify(item) {
  const text = plainTitle(item).toLowerCase();
  const severity = item.metadata?.type === "cyber" ? item.metadata.severity : "Unknown";
  const isOfficial = item.verificationStatus === "official" || /\b(advisory|patch|security update)\b/.test(text);
  if (severity === "Critical" && item.metadata?.type === "cyber" && (isOfficial || item.confidence === "High")) return { type: "CRITICAL_ALERT", preference: "criticalAlerts", title: "🚨 Critical security alert" };
  if (severity === "High" && item.metadata?.type === "cyber") return { type: "HIGH_ALERT", preference: "highSeverityAlerts", title: "⚠️ High-priority security news" };
  if (isOfficial) return { type: "SECURITY_UPDATE", preference: "officialAdvisories", title: "🛡️ Security update" };
  if (/\b(breach|leak|personal data|stolen data|exposed data)\b/.test(text)) return { type: "INTELLIGENCE_UPDATE", preference: "dataBreaches", title: "🔍 Security news" };
  if (/\b(vulnerabilit|exploit|zero-day|cve-|ransomware|attack|incident|hacked|compromise|threat|campaign|apt|botnet|malware|trojan|spyware|actor)\b/.test(text)) return { type: "INTELLIGENCE_UPDATE", preference: "threatIntelligence", title: "🔍 Security news" };
  if (/\b(ai|artificial intelligence|machine learning|llm)\b/.test(`${text} ${item.category || ""}`.toLowerCase())) return { type: "NEWS_UPDATE", preference: "aiTechUpdates", title: "🤖 AI & technology news" };
  return { type: "NEWS_UPDATE", preference: "generalNews", title: "📰 Cyber Chronicle" };
}

function itemDomain(item) {
  if (typeof item.domain === "string" && item.domain) return item.domain;
  const categories = Array.isArray(item.categories) ? item.categories : [];
  if (categories.includes("cyber")) return "Cybersecurity";
  if (categories.includes("space")) return "Space";
  if (categories.includes("ai") || categories.includes("technology")) return "AI & Technology";
  if (categories.includes("environment")) return "Environment";
  if (categories.includes("sports")) return "Sports";
  if (categories.includes("entertainment")) return "Entertainment";
  if (categories.includes("markets")) return "Markets";
  if (categories.includes("science")) return "Science";
  if (categories.includes("business")) return "Business";
  if (item.region === "india" || categories.includes("india")) return "India";
  return "World";
}

function meetsSeverityFloor(item, floor) {
  if (floor === "all") return true;
  const severity = item.metadata?.type === "cyber" ? item.metadata.severity : undefined;
  if (floor === "critical") return severity === "Critical";
  return severity === "Critical" || severity === "High";
}

function matchesPreferences(item, preferences) {
  const normalized = normalizePreferences(preferences);
  const classification = classify(item);
  return normalized.enabledDomains.includes(itemDomain(item))
    && meetsSeverityFloor(item, normalized.severityFloor)
    && Boolean(normalized.notifications[classification.preference]);
}

async function processNotificationItems(items) {
  if (!Array.isArray(items)) return;
  const state = await readNotificationState();
  if (!state.enabled) return;

  const currentIds = items.map((item) => item?.id).filter(Boolean).slice(0, 500);
  if (!state.initialized) {
    await writeNotificationState({ ...state, initialized: true, seenIds: currentIds });
    return;
  }

  const seen = new Set(state.seenIds || []);
  const newItems = items.filter((item) => item?.id && !seen.has(item.id));
  const preferences = normalizePreferences(state.preferences);
  const eligible = newItems
    .filter((item) => matchesPreferences(item, preferences))
    .sort((left, right) => Number(right.state === preferences.followedState) - Number(left.state === preferences.followedState))
    .slice(0, 3);
  for (const item of eligible) {
    const classification = classify(item);
    const severity = item.metadata?.type === "cyber" ? item.metadata.severity || "Unknown" : "Unknown";
    const imageUrl = /^https:\/\//i.test(item.imageUrl || "") ? item.imageUrl : new URL("og.png", self.registration.scope).href;
    await self.registration.showNotification(classification.title, {
      body: `${plainTitle(item)}\n\n${item.primaryPublisher}${severity !== "Unknown" ? ` · ${severity}` : ""}`
        + (item.metadata?.type === "cyber" && item.metadata.affected ? `\n\nAffects: ${item.metadata.affected}` : "")
        + (item.metadata?.type === "cyber" && item.metadata.action ? `\n\nNext step: ${item.metadata.action}` : ""),
      image: imageUrl,
      icon: new URL("app-icon-192.png", self.registration.scope).href,
      badge: new URL("app-icon-192.png", self.registration.scope).href,
      tag: `cyber-chronicle:${item.id}`,
      renotify: classification.type === "CRITICAL_ALERT",
      data: { url: `${self.registration.scope}?story=${encodeURIComponent(item.id)}`, storyId: item.id },
      vibrate: [100, 50, 100],
      actions: [{ action: "view", title: "View alert" }, { action: "dismiss", title: "Dismiss" }],
    });
  }
  await writeNotificationState({ ...state, initialized: true, seenIds: [...new Set([...currentIds, ...(state.seenIds || [])])].slice(0, 500) });
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "CONFIGURE_LOCAL_NOTIFICATIONS") {
    notificationWork = enqueueNotificationWork(() => readNotificationState().then((state) => writeNotificationState({
        ...state,
        enabled: Boolean(event.data.enabled),
        preferences: normalizePreferences(event.data.preferences),
      })));
    event.waitUntil(notificationWork);
  }
  if (event.data?.type === "CHECK_LOCAL_NOTIFICATIONS") {
    notificationWork = enqueueNotificationWork(() => processNotificationItems(event.data.items));
    event.waitUntil(notificationWork);
  }
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag !== "cyber-chronicle-news") return;
  notificationWork = enqueueNotificationWork(() => fetch(new URL("data/news.json", self.registration.scope), { cache: "no-store" })
    .then((response) => response.ok ? response.json() : null)
    .then((payload) => processNotificationItems(payload?.items))
    .catch(() => undefined));
  event.waitUntil(notificationWork);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  
  let targetUrl = event.notification.data?.url || self.registration.scope;
  try {
    const parsedUrl = new URL(targetUrl, self.location.origin);
    if (parsedUrl.origin !== self.location.origin) {
      console.warn("Cross-origin notification navigation blocked:", targetUrl);
      targetUrl = self.registration.scope;
    } else {
      targetUrl = parsedUrl.href;
    }
  } catch {
    targetUrl = self.registration.scope;
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
