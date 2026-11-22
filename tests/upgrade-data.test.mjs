import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { mergeItems } from "../lib/news.ts";
import { applyCertInDetails, parseCertInIndex } from "../lib/parsers/html.ts";
import { parseOfficialPressListing } from "../lib/parsers/press.ts";
import { parseRssFeed } from "../lib/parsers/rss.ts";
import { fetchReviewed } from "../lib/parsers/utils.ts";
import { getSourceDefinitions } from "../lib/sources.ts";
import { enrichVulnerabilities } from "../lib/vulnerabilities/enrichment.ts";
import { matchingProducts, readReaderBackup } from "../lib/watchlist.ts";
import { navigationStateFromUrl, navigationUrl } from "../lib/navigation.ts";

const definitions = getSourceDefinitions(2026);
const source = (id) => definitions.find((definition) => definition.id === id);
const date = "2026-11-21T12:00:00.000Z";
const id = "CVE-2026-01234";

function story(name, group = name, cveIds = [id]) {
  return {
    id: name, sourceId: name, title: `${name} discusses a security issue`, summary: "", knownFacts: [],
    publishedAt: date, updatedAt: date, verificationStatus: "single-source", independentSourceCount: 1,
    metadata: { type: "cyber", severity: "Unknown", cveIds }, categories: ["cyber"],
    evidence: [{ url: `https://example.com/${name}`, dependencyGroup: group, trustTier: 2 }],
  };
}

test("CERT-In current page structure and details preserve authority and provenance", async () => {
  const html = await readFile(new URL("./fixtures/cert-in-vulnerability-index.html", import.meta.url), "utf8");
  const [item] = parseCertInIndex(html, source("cert-in-vulnerability-notes"));
  assert.equal(item.metadata.identifier, "CIVN-2026-0568");
  assert.throws(() => parseCertInIndex(html.replace(/VLCODE/g, "NONCODE"), source("cert-in-vulnerability-notes")), /no CIVN records/);
  const detail = `<html><div title="Indian Computer Emergency Response Team">CIVN-2026-0568</div>
    <p>Severity Rating: High</p><p class="verblue">Software Affected</p><ul><li>Chrome before 20</li></ul>
    <p class="verblue">Overview</p><p>CVE-2026-01234</p>
    <p class="verblue">Solution</p><p>Apply updates listed by the vendor.</p></html>`;
  const enriched = applyCertInDetails(item, detail);
  assert.equal(enriched.metadata.severity, "High");
  assert.deepEqual(enriched.metadata.cveIds, [id]);
  assert.equal(enriched.metadata.affected, "Chrome before 20");
  assert.ok(enriched.metadata.action);
  assert.equal(enriched.metadata.advisoryUrl, item.references[0]);
  assert.equal(enriched.summarySource, "advisory");
});

test("official press listings and DW RDF yield reviewed HTTPS article links", () => {
  const entries = [
    ["pib-india", `<li><a href='/PressReleseDetail.aspx?PRID=123'>Government update</a><span>Posted on: 21 Nov 2026</span></li>`],
    ["isro-news", `<tr><td class="title2026"><a href="/test.html">ISRO release</a></td><td class="date2026"><span>November 21, 2026</span></td></tr>`],
    ["sebi-cyber-updates", `<tr><td>Nov 21, 2026</td><td><a href="/notice.html">Cybersecurity framework</a></td></tr>`],
  ];
  for (const [publisher, html] of entries) {
    assert.equal(parseOfficialPressListing(html, source(publisher)).length, 1);
    assert.throws(() => parseOfficialPressListing("<html>Listing changed</html>", source(publisher)), /Invalid upstream schema/);
  }
  const rdf = `<rdf:RDF><channel><title>DW</title></channel><item><title>Today’s news</title><link>https://www.dw.com/en/news/a-1</link><dc:date>${date}</dc:date></item></rdf:RDF>`;
  assert.equal(parseRssFeed(rdf, source("dw-news")).length, 1);
  assert.throws(() => parseRssFeed("<html>Error</html>", source("dw-news")), /RSS channel/);
});

test("redirect to an unreviewed hostname stops before making a second request", async () => {
  const visited = [];
  const fetcher = async (url) => {
    visited.push(url);
    return new Response(null, { status: 302, headers: { location: "http://127.0.0.1/" } });
  };
  await assert.rejects(fetchReviewed("https://example.com/", ["example.com"], fetcher, {}), /unreviewed origin/);
  assert.deepEqual(visited, ["https://example.com/"]);
});

test("independent stories group by one CVE and never confirm a separate incident claim", () => {
  const grouped = mergeItems([story("one"), story("two"), story("syndicated", "one"), story("rollup", "third", [id, "CVE-2026-12345"])]);
  const merged = grouped.find((item) => item.corroborationBasis === "cve");
  assert.equal(grouped.length, 2);
  assert.equal(merged.independentSourceCount, 2);
  assert.equal(merged.storyState, "developing");
  assert.equal(merged.aliases.length, 2);
});

test("NVD, KEV and EPSS retain distinct evidence, and outages leave unknowns", async () => {
  const fetcher = async (url) => {
    if (url.includes("nist.gov")) return Response.json({ vulnerabilities: [{ cve: {
      id, vulnStatus: "Analyzed", metrics: { cvssMetricV31: [{ type: "Primary", cvssData: { baseScore: 8.5, baseSeverity: "HIGH" } }] },
      configurations: [{ nodes: [{ cpeMatch: [{ vulnerable: true, criteria: "cpe:2.3:a:google:chrome:*:*:*:*:*:*:*:*", versionEndExcluding: "25" }] }] }],
    } }] });
    if (url.includes("cisa.gov")) return Response.json({ vulnerabilities: [{ cveID: id, dateAdded: "2026-11-20", dueDate: "2026-12-20", requiredAction: "Follow the vendor mitigation." }] });
    if (url.includes("first.org")) return Response.json({ data: [{ cve: id, epss: "0.2", date: "2026-11-21" }] });
    return new Response(null, { status: 404 });
  };
  const [item] = await enrichVulnerabilities([story("report")], fetcher);
  assert.equal(item.metadata.severity, "High");
  assert.equal(item.metadata.vulnerabilities[0].cvssScore, 8.5);
  assert.equal(item.metadata.vulnerabilities[0].kev.dateAdded, "2026-11-20");
  assert.equal(item.metadata.vulnerabilities[0].epss.probability, 0.2);
  assert.equal(item.metadata.action, "Follow the vendor mitigation.");
  assert.deepEqual(matchingProducts(item, ["Chrome", "Windows"]), ["Chrome"]);
  const [unknown] = await enrichVulnerabilities([story("report")], async () => new Response(null, { status: 503 }));
  assert.equal(unknown.metadata.severity, "Unknown");
  assert.deepEqual(unknown.metadata.vulnerabilities, []);
  assert.equal(unknown.metadata.action, undefined);
});

test("General mode survives URL round-trip and imported reading data is normalized", () => {
  const url = "https://example.com/?edition=general";
  const state = navigationStateFromUrl(url);
  assert.equal(state.edition, "general");
  assert.equal(navigationUrl(url, state), url);
  assert.deepEqual(readReaderBackup({ version: 1, saved: ["article", "article"], watchlist: ["Chrome", "Unknown Product"] }), { saved: ["article"], watchlist: ["Chrome"] });
  assert.throws(() => readReaderBackup({ version: 2, saved: [], watchlist: [] }), /unsupported/);
});
