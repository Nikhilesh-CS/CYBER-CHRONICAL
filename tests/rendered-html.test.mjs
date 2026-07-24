import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html", host: "localhost" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Cyber Chronicle digital newspaper", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Cyber Chronicle/);
  assert.match(html, /Trusted Cybersecurity News\. Simplified\./);
  assert.match(html, /Top Stories/);
  assert.match(html, /World Cyber News/);
  assert.match(html, /Active Security Alerts/);
  assert.match(html, /Privacy &amp; Data Breaches/);
  assert.match(html, /Today’s Cyber Roundup/);
  assert.match(html, /Editor’s Picks/);
  assert.match(html, /Weekly Highlights/);
  assert.match(html, /Trust is the story/);
  assert.match(html, /Live edition/);
  assert.doesNotMatch(
    html,
    /\bCISA\b|\bNVD\b|\bNIST\b|Known Exploited Vulnerabilities|cisa\.gov|nvd\.nist\.gov/i,
  );
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
  assert.doesNotMatch(html, /Helios Edge|Northstar Cloud|EmberLock|QuartzMail|Orion Systems/i);
});

test("ships product metadata and removes disposable starter assets", async () => {
  const [layout, page, app, packageJson, manifest, serviceWorker] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/cyber-chronicle-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/service-worker.js", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /Cyber Chronicle \| Trusted Cybersecurity News\. Simplified\./);
  assert.match(layout, /\/og\.png/);
  assert.match(layout, /\/manifest\.webmanifest/);
  assert.match(page, /CyberChronicleApp/);
  assert.match(app, /IN SIMPLE WORDS/);
  assert.match(app, /WHY IT MATTERS/);
  assert.match(app, /SHOULD YOU CARE\?/);
  assert.match(app, /WHAT YOU SHOULD DO/);
  assert.match(app, /SOURCES & TRANSPARENCY/);
  assert.match(app, /No invented facts/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.equal(JSON.parse(manifest).display, "standalone");
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/app-icon-192.png", import.meta.url));
  await access(new URL("../public/app-icon-512.png", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", root)));
});
