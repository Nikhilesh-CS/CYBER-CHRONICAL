const STATIC_CACHE = "cyber-chronicle-static-v5";
const DATA_CACHE = "cyber-chronicle-data-v3";
const OFFLINE_CACHE = "cyber-chronicle-offline-v2";
const NOTIFICATION_CACHE = "cyber-chronicle-notifications-v1";
const SCOPE = new URL(self.registration.scope);
const EDITION_URLS = new Map(["news", "intelligence", "search"].map((name) => {
  const url = new URL(`data/${name}.json`, SCOPE);
  return [url.pathname, url.href];
}));
const NEWS_URL = new URL("data/news.json", SCOPE).href;
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
  watchlist: true,
};
const DEFAULT_PREFERENCES = {
  enabledDomains: ["Cybersecurity", "AI & Technology", "Business", "Markets", "World", "India", "Science", "Space", "Environment", "Sports", "Entertainment"],
  severityFloor: "all",
  followedState: null,
  notifications: DEFAULT_NOTIFICATION_TOPICS,
};

function normalizePreferences(value) {
  const input = record(value) ? value : {};
  const topics = record(input.notifications) ? input.notifications : input;
  const notifications = { ...DEFAULT_NOTIFICATION_TOPICS };
  for (const key of Object.keys(notifications)) {
    if (Object.hasOwn(topics, key) && typeof topics[key] === "boolean") notifications[key] = topics[key];
  }
  const enabledDomains = Array.isArray(input.enabledDomains)
    ? DEFAULT_PREFERENCES.enabledDomains.filter((domain) => input.enabledDomains.includes(domain))
    : [];
  return {
    enabledDomains: enabledDomains.length ? enabledDomains : DEFAULT_PREFERENCES.enabledDomains,
    severityFloor: input.severityFloor === "high" || input.severityFloor === "critical" ? input.severityFloor : "all",
    followedState: text(input.followedState, 100) || null,
    watchlist: Array.isArray(input.watchlist) ? input.watchlist.filter((value) => typeof value === "string" && /^[a-z]{2,24}$/i.test(value)).slice(0, 20) : [],
    notifications,
  };
}

function record(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(value, limit) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, limit) : "";
}

function isStoryId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 4_096;
}

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isAppWindow(client) {
  if (client?.type !== "window" || typeof client.url !== "string") return false;
  const url = parseUrl(client.url);
  return !!url && url.origin === SCOPE.origin && url.pathname === SCOPE.pathname;
}

function isJson(response) {
  return response?.ok && !response.redirected && /^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type") ?? "");
}

async function fetchEditionFile(url) {
  const response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8_000) }).catch(() => null);
  if (isJson(response)) {
    const cache = await caches.open(DATA_CACHE);
    await cache.put(url, response.clone()).catch(() => undefined);
  }
  return response;
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
          .filter((key) => key.startsWith("cyber-chronicle-") && key !== STATIC_CACHE && key !== DATA_CACHE && key !== OFFLINE_CACHE && key !== NOTIFICATION_CACHE)
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
    || !url.pathname.startsWith(SCOPE.pathname)
  ) {
    return;
  }

  /* ---- Network-first, with a fixed URL key for each edition file ---- */
  const editionUrl = EDITION_URLS.get(url.pathname);
  if (editionUrl) {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        const response = await fetchEditionFile(editionUrl);
        if (isJson(response)) return response;
        const cached = await cache.match(editionUrl);
        if (cached) return cached;
        return response || new Response(JSON.stringify({
          state: "unavailable",
          generatedAt: new Date().toISOString(),
          lastSuccessfulAt: null,
          cacheAgeSeconds: null,
          notice: "You are offline. No cached edition is available.",
          items: [],
          sources: [],
        }), { status: 503, headers: { "content-type": "application/json" } });
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
        if (response.ok && !response.redirected) await cache.put(request, response.clone()).catch(() => undefined);
        return response;
      }),
    );
    return;
  }

  /* ---- Network-first for HTML pages ---- */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok && !response.redirected && /^text\/html(?:\s*;|$)/i.test(response.headers.get("content-type") ?? "")) {
            const cache = await caches.open(OFFLINE_CACHE);
            await cache.put(url.pathname, response.clone()).catch(() => undefined);
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(OFFLINE_CACHE);
          return (await cache.match(url.pathname)) || (await cache.match(SCOPE.href)) || Response.error();
        }),
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
        if (response.ok && !response.redirected) await cache.put(request, response.clone()).catch(() => undefined);
        return response;
      }),
    );
  }
});

/* ---- On-device notification engine (no account, token, or backend) ---- */
async function readNotificationState() {
  const emptyState = { enabled: false, initialized: false, preferences: DEFAULT_PREFERENCES, seenIds: [] };
  const cache = await caches.open(NOTIFICATION_CACHE);
  const response = await cache.match(NOTIFICATION_STATE_URL);
  if (!response) return emptyState;
  try {
    const stored = await response.json();
    if (!record(stored)) return emptyState;
    return {
      enabled: stored.enabled === true,
      initialized: stored.initialized === true,
      preferences: normalizePreferences(stored.preferences),
      seenIds: Array.isArray(stored.seenIds) ? stored.seenIds.slice(0, 500).filter(isStoryId) : [],
    };
  } catch {
    return emptyState;
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
    && (Boolean(normalized.notifications[classification.preference]) || matchingStack(item, normalized).length > 0);
}

function matchingStack(item, preferences) {
  if (!preferences.notifications.watchlist || item.metadata?.type !== "cyber") return [];
  const affected = [item.metadata.affected, ...(item.metadata.vulnerabilities || []).flatMap((record) => record.affected || [])].join(" ");
  const text = ` ${affected.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  return preferences.watchlist.filter((product) => text.includes(` ${product.toLowerCase()} `));
}

function notificationItem(item) {
  if (!record(item) || !isStoryId(item.id)) return null;
  const title = text(item.title, 300);
  const primaryPublisher = text(item.primaryPublisher, 100);
  if (!title || !primaryPublisher) return null;
  const raw = item.metadata;
  const metadata = record(raw) && raw.type === "cyber" ? {
    type: "cyber",
    severity: ["Critical", "High", "Medium", "Low"].includes(raw.severity) ? raw.severity : "Unknown",
    identifier: text(raw.identifier, 60),
    affected: text(raw.affected, 350),
    action: text(raw.action, 500),
    vulnerabilities: Array.isArray(raw.vulnerabilities) ? raw.vulnerabilities.slice(0, 100).filter(record).map(({ affected }) => ({
      affected: Array.isArray(affected) ? affected.slice(0, 100).map((value) => text(value, 160)).filter(Boolean) : [],
    })) : [],
  } : { type: "general" };
  const image = typeof item.imageUrl === "string" && /^https:\/\/[^/\s]/i.test(item.imageUrl)
    && !/[\\\u0000-\u001f\u007f]/u.test(item.imageUrl) ? parseUrl(item.imageUrl) : null;
  return {
    id: item.id, title, primaryPublisher, metadata,
    imageUrl: image?.protocol === "https:" && !image.username && !image.password ? image.href : undefined,
    aliases: Array.isArray(item.aliases) ? item.aliases.slice(0, 100).filter(isStoryId) : [],
    domain: text(item.domain, 40),
    categories: Array.isArray(item.categories) ? item.categories.slice(0, 25).filter((value) => typeof value === "string") : [],
    category: text(item.category, 40),
    state: text(item.state, 100),
    region: text(item.region, 20),
    verificationStatus: item.verificationStatus,
    confidence: item.confidence,
  };
}

async function processNotificationItems(items, state) {
  if (!Array.isArray(items)) return;
  const currentItems = items.slice(0, 1_000).map(notificationItem).filter(Boolean);
  const currentIds = currentItems.map(({ id }) => id).slice(0, 500);
  if (!state.initialized) {
    await writeNotificationState({ ...state, initialized: true, seenIds: currentIds });
    return;
  }

  const seen = new Set(state.seenIds || []);
  const newItems = currentItems.filter((item) => !seen.has(item.id) && !item.aliases.some((id) => seen.has(id)));
  const preferences = normalizePreferences(state.preferences);
  const eligible = newItems
    .filter((item) => matchesPreferences(item, preferences))
    .sort((left, right) => Number(matchingStack(right, preferences).length > 0) - Number(matchingStack(left, preferences).length > 0)
      || Number(right.state === preferences.followedState) - Number(left.state === preferences.followedState))
    .slice(0, 3);
  for (const item of eligible) {
    const classification = classify(item);
    const stack = matchingStack(item, preferences);
    const severity = item.metadata?.type === "cyber" ? item.metadata.severity || "Unknown" : "Unknown";
    const imageUrl = item.imageUrl ?? new URL("og.png", self.registration.scope).href;
    await self.registration.showNotification(stack.length ? "Cyber Chronicle · My stack" : classification.title, {
      body: `${plainTitle(item)}\n\n${item.primaryPublisher}${severity !== "Unknown" ? ` · ${severity}` : ""}`
        + (stack.length ? `\n\nMy stack: ${stack.join(", ")}` : "")
        + (item.metadata?.type === "cyber" && item.metadata.affected ? `\n\nAffects: ${item.metadata.affected}` : "")
        + (item.metadata?.type === "cyber" && item.metadata.action ? `\n\nNext step: ${item.metadata.action}` : ""),
      image: imageUrl,
      icon: new URL("app-icon-192.png", self.registration.scope).href,
      badge: new URL("app-icon-192.png", self.registration.scope).href,
      tag: `cyber-chronicle:${item.id}`,
      renotify: classification.type === "CRITICAL_ALERT",
      data: { storyId: item.id },
      vibrate: [100, 50, 100],
      actions: [{ action: "view", title: "View alert" }, { action: "dismiss", title: "Dismiss" }],
    });
  }
  await writeNotificationState({ ...state, initialized: true, seenIds: [...new Set([...currentIds, ...(state.seenIds || [])])].slice(0, 500) });
}

async function checkNotificationEdition(refresh = false) {
  const state = await readNotificationState();
  if (!state.enabled) return;
  const cache = await caches.open(DATA_CACHE);
  const response = (refresh ? null : await cache.match(NEWS_URL)) ?? await fetchEditionFile(NEWS_URL);
  if (!isJson(response)) return;
  const payload = await response.json().catch(() => null);
  await processNotificationItems(payload?.items, state);
}

self.addEventListener("message", (event) => {
  if (!isAppWindow(event.source) || (event.origin && event.origin !== SCOPE.origin) || !record(event.data)) return;
  if (event.data.type === "CONFIGURE_LOCAL_NOTIFICATIONS") {
    const { enabled, preferences } = event.data;
    if (typeof enabled !== "boolean" || !record(preferences)) return;
    event.waitUntil(enqueueNotificationWork(async () => {
      const state = await readNotificationState();
      await writeNotificationState({ ...state, enabled, preferences: normalizePreferences(preferences) });
    }));
  }
  if (event.data?.type === "CHECK_LOCAL_NOTIFICATIONS") {
    event.waitUntil(enqueueNotificationWork(() => checkNotificationEdition()));
  }
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag !== "cyber-chronicle-news") return;
  event.waitUntil(enqueueNotificationWork(() => checkNotificationEdition(true)));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const storyId = event.notification.data?.storyId;
  const targetUrl = new URL(SCOPE);
  if (isStoryId(storyId)) targetUrl.searchParams.set("story", storyId);
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (isAppWindow(client)) {
          if (isStoryId(storyId)) client.postMessage({ type: "NAVIGATE", storyId });
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl.href);
    }),
  );
});
