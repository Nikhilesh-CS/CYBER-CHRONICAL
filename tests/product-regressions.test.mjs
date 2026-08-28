import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const { beginnerExplanation } = await import(new URL("../lib/explanations.ts", import.meta.url).href);
const { computeDomain, matchesStoryQuery, storiesForDomain } = await import(new URL("../lib/editorial.ts", import.meta.url).href);
const { navigationStateFromUrl, navigationUrl, isAppNavigationState } = await import(new URL("../lib/navigation.ts", import.meta.url).href);
const { parseRssFeed } = await import(new URL("../lib/parsers/rss.ts", import.meta.url).href);
const { getSourceDefinitions } = await import(new URL("../lib/sources.ts", import.meta.url).href);

const source = {
  id: "science-test",
  name: "Science Test",
  publisher: "Science Test",
  authority: "Independent science publisher",
  kind: "rss",
  categories: ["science", "world"],
  region: "global",
  trustTier: 2,
  dependencyGroup: "science-test",
  url: "https://feeds.example.com/science.xml",
  siteUrl: "https://example.com/science",
  allowedHosts: ["example.com"],
  strictFilter: false,
  enabled: true,
  usage: "approved",
};

test("RSS parser preserves a sanitized, bounded publisher summary", () => {
  const xml = `<?xml version="1.0"?><rss><channel><item>
    <title>Scientists discover a stronger recyclable material</title>
    <link>https://example.com/science/material</link>
    <description><![CDATA[<p>Researchers tested a recyclable material that remained strong under pressure.</p> Read the full story]]></description>
    <pubDate>Thu, 27 Aug 2026 08:00:00 GMT</pubDate>
  </item></channel></rss>`;
  const [item] = parseRssFeed(xml, source);
  assert.equal(item.summary, "Researchers tested a recyclable material that remained strong under pressure.");
  assert.match(beginnerExplanation(item), /science update/i);
  assert.match(beginnerExplanation(item), /Researchers tested a recyclable material/);
});

test("metadata-only RSS sources retain attribution without copying feed prose", () => {
  const xml = `<?xml version="1.0"?><rss><channel><item>
    <title>Markets respond to a central bank decision</title>
    <link>https://example.com/science/markets</link>
    <description><![CDATA[Publisher-authored commentary that should not be retained.]]></description>
    <pubDate>Thu, 27 Aug 2026 08:00:00 GMT</pubDate>
  </item></channel></rss>`;
  const [item] = parseRssFeed(xml, { ...source, feedSummaryPolicy: "metadata-only" });
  assert.equal(item.summary, "Cyber Chronicle retains only the headline, publisher, date, and link from this feed. Open the original report for its full context.");
  assert.equal(item.primaryPublisher, source.publisher);
  assert.deepEqual(item.references, ["https://example.com/science/markets"]);
});

test("explanation fallback is honest and does not repeat the headline as an explanation", () => {
  const [item] = parseRssFeed(`<?xml version="1.0"?><rss><channel><item>
    <title>Unclassified regional update</title>
    <link>https://example.com/science/update</link>
    <description><![CDATA[Unclassified regional update]]></description>
    <pubDate>Thu, 27 Aug 2026 08:00:00 GMT</pubDate>
  </item></channel></rss>`, { ...source, categories: [] });
  const explanation = beginnerExplanation(item);
  assert.match(explanation, /cannot produce a reliable plain-language explanation/i);
  assert.doesNotMatch(explanation, /this is a report about/i);
});

test("navigation state survives URL round-trips for settings, sections, and stories", () => {
  const state = {
    cyberChronicle: true,
    tab: "settings",
    settingsPage: "sources",
    domain: "Latest",
    storyId: "publisher:https://example.com/story",
  };
  const url = navigationUrl("https://example.com/CYBER-CHRONICAL/", state);
  assert.equal(navigationStateFromUrl(url).tab, "settings");
  assert.equal(navigationStateFromUrl(url).settingsPage, "sources");
  assert.equal(navigationStateFromUrl(url).storyId, state.storyId);
  assert.equal(isAppNavigationState(state), true);
});

test("search matches every query word across story meaning fields", () => {
  const item = {
    id: "story-1",
    title: "CC-TEST: Researchers publish a new material",
    summary: "The recyclable material remained strong under pressure.",
    studentSummary: "Scientists tested a material that can be reused.",
    primaryPublisher: "MIT News",
    categories: ["science", "technology"],
    region: "global",
    metadata: { type: "general" },
  };
  assert.equal(matchesStoryQuery(item, "MIT recyclable science"), true);
  assert.equal(matchesStoryQuery(item, "science MIT recyclable"), true, "word order must not matter");
  assert.equal(matchesStoryQuery(item, "MIT ransomware"), false);
});

test("domain classification prioritizes subject over geography", () => {
  const base = {
    id: "domain-test",
    title: "CC-TEST: Update",
    summary: "",
    studentSummary: "",
    primaryPublisher: "Test",
    categories: [],
    region: "india",
    metadata: { type: "general" },
  };
  const indianCyber = { ...base, title: "CC-TEST: CERT-In security advisory", categories: ["cyber", "india"], metadata: { type: "cyber", severity: "Unknown" } };
  const isroLaunch = { ...base, title: "CC-TEST: ISRO launches a lunar spacecraft", categories: ["space", "science", "india"] };
  assert.equal(computeDomain(indianCyber), "Cybersecurity");
  assert.equal(computeDomain(isroLaunch), "Space");
  assert.deepEqual(storiesForDomain([indianCyber, isroLaunch], "Space"), [isroLaunch]);
});

test("trending sections use the same history-aware navigation path as the main navigation", async () => {
  const app = await readFile(new URL("../app/cyber-chronicle-app.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(app, /onClick=\{\(\) => setActiveDomain\(domain\)\}/);
  assert.match(app, /onClick=\{\(\) => handleDomainChange\(domain\)\}/);
});

test("every source has a distinct HTTPS website destination", async () => {
  const definitions = getSourceDefinitions(2026);
  assert.ok(definitions.length > 0);
  assert.ok(definitions.every((definition) => definition.siteUrl.startsWith("https://")));
  assert.ok(definitions.filter((definition) => definition.kind === "rss").every((definition) => definition.siteUrl !== definition.url));
  const sourcesView = await readFile(new URL("../app/components/settings/views/SourcesView.tsx", import.meta.url), "utf8");
  assert.match(sourcesView, /source\.siteUrl \|\| knownSiteUrls\.get\(source\.id\)/);
  assert.match(sourcesView, /href=\{websiteUrl\}/);
});

test("expanded low-volume domains have live, reviewed source definitions", () => {
  const definitions = getSourceDefinitions(2026);
  const expected = new Map([
    ["esa-space-news", "space"],
    ["un-climate-news", "environment"],
    ["espn-top-news", "sports"],
    ["variety-entertainment", "entertainment"],
    ["nasdaq-markets", "markets"],
  ]);
  for (const [id, category] of expected) {
    const definition = definitions.find((candidate) => candidate.id === id);
    assert.ok(definition, `${id} must be registered`);
    assert.ok(definition.enabled);
    assert.ok(definition.categories.includes(category));
    assert.ok(definition.url.startsWith("https://"));
  }
});

test("About intelligence flow uses responsive elements instead of preformatted text", async () => {
  const [view, css] = await Promise.all([
    readFile(new URL("../app/components/settings/views/AboutView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(view, /<pre\b/);
  assert.match(view, /about-intelligence-flow/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /\.about-flow-sources, \.about-flow-process \{ grid-template-columns: 1fr;/);
});
