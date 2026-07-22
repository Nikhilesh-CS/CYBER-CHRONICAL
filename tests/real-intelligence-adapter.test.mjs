import assert from "node:assert/strict";
import test from "node:test";

const moduleUrl = new URL("../app/api/intelligence/real-data.ts", import.meta.url);
const { createRealIntelligenceService } = await import(moduleUrl.href);

const kevPayload = {
  catalogVersion: "2026.07.22",
  dateReleased: "2026-07-22T00:00:00Z",
  count: 1,
  vulnerabilities: [{
    cveID: "CVE-2026-10001",
    vendorProject: "Example Vendor",
    product: "Example Gateway",
    vulnerabilityName: "Example Gateway command injection",
    dateAdded: "2026-07-22",
    shortDescription: "CISA reports that this vulnerability is known to be exploited.",
    requiredAction: "Apply vendor mitigations.",
    dueDate: "2026-08-01",
  }],
};

const nvdPayload = {
  resultsPerPage: 1,
  startIndex: 0,
  totalResults: 1,
  format: "NVD_CVE",
  version: "2.0",
  timestamp: "2026-07-22T10:00:00Z",
  vulnerabilities: [{
    cve: {
      id: "CVE-2026-10002",
      published: "2026-07-21T10:00:00.000",
      lastModified: "2026-07-22T10:00:00.000",
      descriptions: [{ lang: "en", value: "A real description supplied by NVD." }],
      metrics: { cvssMetricV31: [{ cvssData: { baseSeverity: "HIGH", baseScore: 8.8 } }] },
      references: [{ url: "https://example.gov/advisory/10002" }],
    },
  }],
};

function jsonResponse(payload, status = 200, contentType = "application/json") {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": contentType },
  });
}

test("returns only validated records with explicit attribution", async () => {
  const requested = [];
  const service = createRealIntelligenceService(async (input) => {
    requested.push(String(input));
    return jsonResponse(String(input).includes("cisa.gov") ? kevPayload : nvdPayload);
  });
  const payload = await service(new Date("2026-07-22T12:00:00Z"));

  assert.equal(payload.state, "fresh");
  assert.equal(payload.items.length, 2);
  assert.deepEqual(payload.items.map((item) => item.source).sort(), ["CISA KEV", "NVD"]);
  assert.equal(payload.items.find((item) => item.source === "NVD").severity, "High");
  assert.equal(payload.sources.length, 2);
  assert.ok(payload.sources.every((source) => source.authority && source.url.startsWith("https://")));
  assert.ok(payload.sources.every((source) => source.retrievedFrom?.startsWith("https://")));
  assert.equal("storedAt" in payload, false);
  assert.equal(requested.length, 2);
});

test("uses CISA's official repository mirror when the primary catalog is unavailable", async () => {
  const requested = [];
  const service = createRealIntelligenceService(async (input) => {
    const url = String(input);
    requested.push(url);
    if (url.includes("cisa.gov/sites")) throw new Error("primary unavailable");
    if (url.includes("raw.githubusercontent.com/cisagov/kev-data")) return jsonResponse(kevPayload, 200, "text/plain; charset=utf-8");
    return jsonResponse(nvdPayload);
  });
  const payload = await service(new Date("2026-07-22T12:00:00Z"));

  assert.equal(payload.state, "fresh");
  assert.match(payload.sources.find((source) => source.id === "cisa-kev").retrievedFrom, /githubusercontent\.com\/cisagov\/kev-data/);
  assert.ok(requested.some((url) => url.includes("cisa.gov/sites")));
  assert.ok(requested.some((url) => url.includes("githubusercontent.com/cisagov/kev-data")));
});

test("deduplicates the same CVE in favor of CISA while preserving NVD references", async () => {
  const duplicateNvd = structuredClone(nvdPayload);
  duplicateNvd.vulnerabilities[0].cve.id = "CVE-2026-10001";
  const service = createRealIntelligenceService(async (input) =>
    jsonResponse(String(input).includes("cisa.gov") ? kevPayload : duplicateNvd));
  const payload = await service(new Date("2026-07-22T12:00:00Z"));

  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].source, "CISA KEV");
  assert.ok(payload.items[0].references.includes("https://example.gov/advisory/10002"));
});

test("uses the short-lived cache without another network request", async () => {
  let calls = 0;
  const service = createRealIntelligenceService(async (input) => {
    calls += 1;
    return jsonResponse(String(input).includes("cisa.gov") ? kevPayload : nvdPayload);
  });
  await service(new Date("2026-07-22T12:00:00Z"));
  const cached = await service(new Date("2026-07-22T12:05:00Z"));

  assert.equal(cached.state, "cached");
  assert.equal(cached.cacheAgeSeconds, 300);
  assert.equal(calls, 2);
});

test("reports partial data and never invents a failed source record", async () => {
  const service = createRealIntelligenceService(async (input) => {
    if (String(input).includes("cisa.gov")) return jsonResponse(kevPayload);
    return jsonResponse({ error: "rate limited" }, 429);
  });
  const payload = await service(new Date("2026-07-22T12:00:00Z"));

  assert.equal(payload.state, "partial");
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].source, "CISA KEV");
  assert.equal(payload.sources.find((source) => source.id === "nvd-cves").status, "failed");
});

test("serves an aged snapshot after a temporary total outage", async () => {
  let fail = false;
  const service = createRealIntelligenceService(async (input) => {
    if (fail) throw new Error("network unavailable");
    return jsonResponse(String(input).includes("cisa.gov") ? kevPayload : nvdPayload);
  });
  await service(new Date("2026-07-22T12:00:00Z"));
  fail = true;
  const payload = await service(new Date("2026-07-22T12:16:00Z"));

  assert.equal(payload.state, "stale");
  assert.equal(payload.cacheAgeSeconds, 960);
  assert.equal(payload.items.length, 2);
  assert.equal(payload.lastSuccessfulAt, "2026-07-22T12:00:00.000Z");
});

test("returns unavailable and an empty list when every payload is invalid", async () => {
  const service = createRealIntelligenceService(async () => jsonResponse({ vulnerabilities: [{}] }));
  const payload = await service(new Date("2026-07-22T12:00:00Z"));

  assert.equal(payload.state, "unavailable");
  assert.deepEqual(payload.items, []);
  assert.ok(payload.sources.every((source) => source.status === "failed"));
});
