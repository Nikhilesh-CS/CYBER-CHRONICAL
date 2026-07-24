import assert from "node:assert/strict";
import test from "node:test";

const moduleUrl = new URL("../lib/news.ts", import.meta.url);
const { createRealIntelligenceService } = await import(moduleUrl.href);

const certInFooter = `
  <footer>Indian Computer Emergency Response Team - CERT-In,
  Ministry of Electronics and Information Technology, Government of India.</footer>`;

const advisoryHtml = `<html><body>
  <a href="/s2cMainServlet?pageid=PUBVLNOTES02&VLCODE=CIAD-2026-0036">
    <span>CERT-In Advisory CIAD-2026-0036</span>
  </a>
  <span class="DateContent">(July 22, 2026)</span>
  <div><span style="padding-left: 20px">Multiple Vulnerabilities in Oracle Products</span></div>
  ${certInFooter}
</body></html>`;

const vulnerabilityHtml = `<html><body>
  <a href="/s2cMainServlet?pageid=PUBVLNOTES01&VLCODE=CIVN-2026-0375">
    <span>CERT-In Vulnerability Note CIVN-2026-0375</span>
  </a>
  <span class="DateContent">(July 22, 2026)</span>
  <div><span style="padding-left:15px">Multiple Vulnerabilities in BeyondTrust &amp; Products</span></div>
  ${certInFooter}
</body></html>`;

function htmlResponse(payload, status = 200, contentType = "text/html; charset=ISO-8859-1") {
  return new Response(payload, { status, headers: { "content-type": contentType } });
}

const certInSourceIds = ["cert-in-advisories", "cert-in-vulnerability-notes"];
const createCertInService = (fetcher) =>
  createRealIntelligenceService(fetcher, { sourceIds: certInSourceIds });

test("returns only official CERT-In India records with explicit attribution", async () => {
  const requested = [];
  const service = createCertInService(async (input) => {
    const url = String(input);
    requested.push(url);
    return htmlResponse(url.includes("VLNLIST02") ? vulnerabilityHtml : advisoryHtml);
  });
  const payload = await service(new Date("2026-07-22T12:00:00Z"));

  assert.equal(payload.state, "fresh");
  assert.equal(payload.items.length, 2);
  assert.deepEqual(payload.items.map((item) => item.source).sort(), ["CERT-In Advisory", "CERT-In Vulnerability Note"]);
  assert.deepEqual(payload.items.map((item) => item.identifier).sort(), ["CIAD-2026-0036", "CIVN-2026-0375"]);
  assert.match(payload.items.find((item) => item.identifier === "CIVN-2026-0375").title, /BeyondTrust & Products/);
  assert.ok(payload.items.every((item) => item.summary === "Official CERT-In metadata record. Open the source link for complete technical details and guidance."));
  assert.ok(payload.items.every((item) => item.severity === "Unknown"));
  assert.ok(payload.items.every((item) => item.references[0].startsWith("https://www.cert-in.org.in/")));
  assert.ok(payload.sources.every((source) => source.authority.includes("Government of India")));
  assert.ok(payload.sources.every((source) => source.url.startsWith("https://www.cert-in.org.in/")));
  assert.ok(payload.sources.every((source) => source.retrievedFrom?.startsWith("https://www.cert-in.org.in/")));
  assert.equal("storedAt" in payload, false);
  assert.equal(requested.length, 2);
  assert.ok(requested.every((url) => url.includes("year=2026")));
});

test("contains no CISA, NVD, or United States endpoints and has no non-Indian fallback", async () => {
  const requested = [];
  const service = createCertInService(async (input) => {
    const url = String(input);
    requested.push(url);
    return htmlResponse(url.includes("VLNLIST02") ? vulnerabilityHtml : advisoryHtml);
  });
  const payload = await service(new Date("2026-07-22T12:00:00Z"));
  const serialized = JSON.stringify(payload);

  assert.doesNotMatch(serialized, /CISA|NVD|nvd\.nist|United States|U\.S\./i);
  assert.equal(requested.length, 2);
  assert.ok(requested.every((url) => new URL(url).hostname === "www.cert-in.org.in"));
});

test("uses the short-lived cache without another network request", async () => {
  let calls = 0;
  const service = createCertInService(async (input) => {
    calls += 1;
    return htmlResponse(String(input).includes("VLNLIST02") ? vulnerabilityHtml : advisoryHtml);
  });
  await service(new Date("2026-07-22T12:00:00Z"));
  const cached = await service(new Date("2026-07-22T12:04:00Z"));

  assert.equal(cached.state, "cached");
  assert.equal(cached.cacheAgeSeconds, 240);
  assert.equal(calls, 2);
});

test("manual refresh bypasses the short-lived source cache", async () => {
  let calls = 0;
  const service = createCertInService(async (input) => {
    calls += 1;
    return htmlResponse(String(input).includes("VLNLIST02") ? vulnerabilityHtml : advisoryHtml);
  });
  await service(new Date("2026-07-22T12:00:00Z"));
  const refreshed = await service(new Date("2026-07-22T12:01:00Z"), { force: true });

  assert.equal(refreshed.state, "fresh");
  assert.equal(refreshed.generatedAt, "2026-07-22T12:01:00.000Z");
  assert.equal(calls, 4);
});

test("fails visibly when a newly listed CERT-In record has incomplete metadata", async () => {
  const incomplete = advisoryHtml.replace(
    '<a href="/s2cMainServlet?pageid=PUBVLNOTES02&VLCODE=CIAD-2026-0036">',
    '<a href="/s2cMainServlet?pageid=PUBVLNOTES02&VLCODE=CIAD-2026-0037"></a><a href="/s2cMainServlet?pageid=PUBVLNOTES02&VLCODE=CIAD-2026-0036">',
  );
  const service = createCertInService(async (input) =>
    htmlResponse(String(input).includes("VLNLIST02") ? vulnerabilityHtml : incomplete));
  const payload = await service(new Date("2026-07-22T12:00:00Z"));

  assert.equal(payload.state, "partial");
  assert.equal(payload.sources.find((source) => source.id === "cert-in-advisories").status, "failed");
  assert.ok(payload.items.every((item) => item.source === "CERT-In Vulnerability Note"));
});

test("reports partial data and never invents a failed source record", async () => {
  const service = createCertInService(async (input) => {
    if (String(input).includes("VLNLIST02")) return htmlResponse("temporarily unavailable", 503);
    return htmlResponse(advisoryHtml);
  });
  const payload = await service(new Date("2026-07-22T12:00:00Z"));

  assert.equal(payload.state, "partial");
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].source, "CERT-In Advisory");
  assert.equal(payload.sources.find((source) => source.id === "cert-in-vulnerability-notes").status, "failed");
});

test("rejects a lookalike page without CERT-In Government of India authority markers", async () => {
  const fakeHtml = advisoryHtml.replace(certInFooter, "<footer>Unofficial mirror</footer>");
  const service = createCertInService(async (input) =>
    htmlResponse(String(input).includes("VLNLIST02") ? vulnerabilityHtml : fakeHtml));
  const payload = await service(new Date("2026-07-22T12:00:00Z"));

  assert.equal(payload.state, "partial");
  assert.equal(payload.items.length, 1);
  assert.equal(payload.sources.find((source) => source.id === "cert-in-advisories").status, "failed");
});

test("serves an aged snapshot after a temporary total outage", async () => {
  let fail = false;
  const service = createCertInService(async (input) => {
    if (fail) throw new Error("network unavailable");
    return htmlResponse(String(input).includes("VLNLIST02") ? vulnerabilityHtml : advisoryHtml);
  });
  await service(new Date("2026-07-22T12:00:00Z"));
  fail = true;
  const payload = await service(new Date("2026-07-22T12:16:00Z"));

  assert.equal(payload.state, "stale");
  assert.equal(payload.cacheAgeSeconds, 960);
  assert.equal(payload.items.length, 2);
  assert.equal(payload.lastSuccessfulAt, "2026-07-22T12:00:00.000Z");
});

test("fails closed when every CERT-In payload is invalid", async () => {
  const service = createCertInService(async () => htmlResponse("<html><body>no records</body></html>"));
  const payload = await service(new Date("2026-07-22T12:00:00Z"));

  assert.equal(payload.state, "unavailable");
  assert.deepEqual(payload.items, []);
  assert.ok(payload.sources.every((source) => source.status === "failed"));
});

test("rejects non-HTML responses even when their body resembles a record", async () => {
  const service = createCertInService(async () => htmlResponse(advisoryHtml, 200, "application/json"));
  const payload = await service(new Date("2026-07-22T12:00:00Z"));

  assert.equal(payload.state, "unavailable");
  assert.deepEqual(payload.items, []);
});

function rssResponse(title, link, description = "ransomware security incident") {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0"><channel><title>Test feed</title><item>
      <title><![CDATA[${title}]]></title>
      <link>${link}</link>
      <description><![CDATA[${description}]]></description>
      <pubDate>Thu, 23 Jul 2026 08:00:00 GMT</pubDate>
    </item></channel></rss>`;
  return new Response(xml, { status: 200, headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}

test("marks matching reports from independent publishers as corroborated", async () => {
  const headline = "Major ransomware campaign targets Indian organisations";
  const service = createRealIntelligenceService(async (input) => {
    const url = String(input);
    return url.includes("economictimes")
      ? rssResponse(headline, "https://ciso.economictimes.indiatimes.com/news/cybercrime/test-story/123")
      : rssResponse(headline, "https://www.seqrite.com/blog/test-story/");
  }, { sourceIds: ["et-ciso-news", "seqrite-research"] });

  const payload = await service(new Date("2026-07-23T09:00:00Z"));

  assert.equal(payload.state, "fresh");
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].verificationStatus, "corroborated");
  assert.equal(payload.items[0].storyState, "confirmed");
  assert.equal(payload.items[0].confidence, "High");
  assert.equal(payload.items[0].independentSourceCount, 2);
  assert.equal(payload.items[0].evidence.length, 2);
});

test("keeps a single news report developing and stores metadata instead of article text", async () => {
  const copiedText = "private body text that must never be copied into the story";
  const service = createRealIntelligenceService(
    async () => rssResponse(
      "Company investigates a possible data breach",
      "https://ciso.economictimes.indiatimes.com/news/cybercrime/test-breach/124",
      `data breach ${copiedText}`,
    ),
    { sourceIds: ["et-ciso-news"] },
  );

  const payload = await service(new Date("2026-07-23T09:00:00Z"));
  const serializedItem = JSON.stringify(payload.items[0]);

  assert.equal(payload.items[0].verificationStatus, "single-source");
  assert.equal(payload.items[0].storyState, "developing");
  assert.equal(payload.items[0].independentSourceCount, 1);
  assert.doesNotMatch(serializedItem, new RegExp(copiedText));
});
