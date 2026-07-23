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

test("server-renders the Cyber Chronicle intelligence desk", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Cyber Chronicle/);
  assert.match(html, /India cyber news, explained simply/);
  assert.match(html, /In simple words/);
  assert.match(html, /Check for updates/);
  assert.match(html, /India-only mode/);
  assert.match(html, /No non-Indian sources or simulated incidents are displayed/);
  assert.match(html, /India Advisories/);
  assert.match(html, /Security Records/);
  assert.match(html, /CERT-In/);
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

  assert.match(layout, /Cyber Chronicle India \| CERT-In intelligence desk/);
  assert.match(layout, /\/og\.png/);
  assert.match(layout, /\/manifest\.webmanifest/);
  assert.match(page, /CyberChronicleApp/);
  assert.match(app, /You are already up to date/);
  assert.match(app, /No newer record was found/);
  assert.match(app, /What should I do\?/);
  assert.match(app, /Words explained/);
  assert.match(app, /does not mean your device was attacked/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.equal(JSON.parse(manifest).display, "standalone");
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/app-icon-192.png", import.meta.url));
  await access(new URL("../public/app-icon-512.png", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", root)));
});
