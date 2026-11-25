import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const workerSource = await readFile(new URL("../public/service-worker.js", import.meta.url), "utf8");
const scope = "https://chronicle.example/CYBER-CHRONICAL/";
const newsUrl = new URL("data/news.json", scope).href;
const appWindow = { type: "window", url: scope };

function worker(fetch, windows = []) {
  const handlers = new Map();
  const notifications = [];
  const opened = [];
  const buckets = new Map();
  const caches = {
    async open(name) {
      if (!buckets.has(name)) buckets.set(name, new Map());
      const bucket = buckets.get(name);
      return {
        async match(key) { return bucket.get(key)?.clone(); },
        async put(key, response) { bucket.set(key, response); },
      };
    },
  };
  const self = {
    location: new URL(scope),
    addEventListener: (name, handler) => handlers.set(name, handler),
    registration: { scope, showNotification: async (title, options) => notifications.push({ title, options }) },
    clients: { matchAll: async () => windows, openWindow: async (url) => opened.push(url) },
  };
  vm.runInNewContext(workerSource, { self, caches, fetch, AbortSignal, Response, URL });
  const event = (name, properties) => {
    let result;
    const hold = (promise) => { result = promise; };
    handlers.get(name)({ ...properties, waitUntil: hold, respondWith: hold });
    return result;
  };
  return {
    event, notifications, opened,
    message: (data, source = appWindow, origin = self.location.origin) => event("message", { data, source, origin }),
  };
}

function json(value) {
  return new Response(JSON.stringify(value), { headers: { "content-type": "application/json" } });
}

test("the service worker reads the published edition and tolerates malformed records", async () => {
  let items = [{ id: "baseline", title: "Existing advisory", primaryPublisher: "Reviewed publisher" }];
  const runtime = worker(async (url) => {
    assert.equal(url, newsUrl);
    return json({ items });
  });
  const config = { type: "CONFIGURE_LOCAL_NOTIFICATIONS", enabled: true, preferences: {} };
  assert.equal(runtime.message(config, { ...appWindow, url: new URL("https://chronicle.example/another-app/").href }), undefined);
  assert.equal(runtime.message(config, appWindow, "https://other.example"), undefined);
  assert.equal(runtime.message({ ...config, enabled: "true" }), undefined);
  const check = { type: "CHECK_LOCAL_NOTIFICATIONS", items: [{ id: "client-provided", title: "Client note" }] };
  await runtime.message(config);
  await runtime.message(check);
  assert.equal(runtime.notifications.length, 0);

  items = [items[0], null, { id: "missing-title", title: {}, primaryPublisher: "Stub" }, {
    id: "new", title: "<mark>New security advisory</mark>", primaryPublisher: "Reviewed publisher",
    domain: "Cybersecurity", aliases: {}, imageUrl: "data:text/plain,example",
    metadata: { type: "cyber", severity: "High", vulnerabilities: [null, { affected: true }] },
  }];
  await runtime.event("periodicsync", { tag: "cyber-chronicle-news" });
  await runtime.message(check);
  assert.equal(runtime.notifications.length, 1);
  const [{ options }] = runtime.notifications;
  assert.equal(options.data.storyId, "new");
  assert.equal(Object.hasOwn(options.data, "url"), false);
  assert.match(options.body, /<mark>New security advisory<\/mark>/);
  assert.equal(options.image, new URL("og.png", scope).href);
});

test("notification clicks open the app scope and treat the story identifier as data", async () => {
  const runtime = worker();
  const notification = (data) => ({ data, close() {} });
  await runtime.event("notificationclick", { notification: notification({ url: "https://other.example/" }) });
  const storyId = "publisher:story & category=example";
  await runtime.event("notificationclick", { notification: notification({ storyId }) });
  assert.equal(runtime.opened[0], scope);
  const storyPage = new URL(runtime.opened[1]);
  assert.equal(storyPage.origin + storyPage.pathname, scope);
  assert.equal(storyPage.searchParams.get("story"), storyId);
  assert.equal(storyPage.searchParams.size, 1);
  assert.equal(runtime.event("notificationclick", { notification: notification({ storyId }), action: "dismiss" }), undefined);

  const messages = [];
  const focused = worker(undefined, [
    { ...appWindow, url: new URL("digest/", scope).href, focus: () => assert.fail("Unexpected focus") },
    { ...appWindow, postMessage: (message) => messages.push(message), focus: async () => {} },
  ]);
  await focused.event("notificationclick", { notification: notification({ storyId }) });
  assert.equal(messages[0].type, "NAVIGATE");
  assert.equal(messages[0].storyId, storyId);
  assert.equal(focused.opened.length, 0);
});

test("edition caching uses the fixed in-scope file and preserves valid offline data", async () => {
  let online = true;
  const runtime = worker(async (url, init) => {
    assert.equal(url, newsUrl);
    assert.equal(init.redirect, "error");
    if (!online) throw new Error("offline");
    return json({ items: [{ id: "edition" }] });
  });
  const get = (path) => runtime.event("fetch", { request: { method: "GET", url: new URL(path, scope).href } });
  assert.equal(get("another/data/news.json"), undefined);
  assert.deepEqual(await (await get("data/news.json?t=1")).json(), { items: [{ id: "edition" }] });
  online = false;
  assert.deepEqual(await (await get("data/news.json?t=2")).json(), { items: [{ id: "edition" }] });
});
