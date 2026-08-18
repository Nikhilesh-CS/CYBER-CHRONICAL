import test from "node:test";
import assert from "node:assert";
import { parseRssFeed } from "../lib/parsers/rss.ts";

test("RSS image extraction priorities", async (t) => {
  const definition = {
    id: "test",
    name: "Test",
    authority: "Test",
    categories: ["cyber"],
    trustTier: 2,
    url: "https://test.com/rss",
    allowedHosts: ["test.com"],
    region: "global",
    publisher: "Test",
    dependencyGroup: "test",
  };

  await t.test("Image merging inheritance", async () => {
    const { mergeItems } = await import("../lib/news.ts");
    
    const primaryItem = {
      id: "test1",
      sourceId: "src1",
      title: "Vulnerability hits systems",
      summary: "",
      publishedAt: "2026-08-18T10:00:00.000Z",
      updatedAt: "2026-08-18T10:00:00.000Z",
      categories: ["cyber"],
      region: "global",
      primaryPublisher: "CERT-In",
      verificationStatus: "official",
      storyState: "confirmed",
      confidence: "High",
      independentSourceCount: 1,
      evidence: [{ url: "https://cert-in.org", publisher: "CERT-In", category: "cyber", dependencyGroup: "cert", trustTier: 1, publishedAt: "2026-08-18T10:00:00.000Z" }],
      references: [],
      studentSummary: "",
      knownFacts: [],
      unknowns: [],
      metadata: { type: "cyber" },
      imageUrl: undefined
    };

    const supportingItem = {
      ...primaryItem,
      id: "test2",
      sourceId: "src2",
      primaryPublisher: "Tech News",
      verificationStatus: "single-source",
      evidence: [{ url: "https://technews.com/1", publisher: "Tech News", category: "cyber", dependencyGroup: "technews", trustTier: 3, publishedAt: "2026-08-18T09:00:00.000Z" }],
      imageUrl: "https://technews.com/photo.jpg"
    };

    const merged = mergeItems([primaryItem, supportingItem]);
    assert.strictEqual(merged.length, 1);
    assert.strictEqual(merged[0].imageUrl, "https://technews.com/photo.jpg", "Should inherit image from supporting item");
  });

  await t.test("extracts media:content", () => {
    const xml = `
      <rss><channel>
        <item>
          <title>Test 1</title>
          <link>https://test.com/1</link>
          <pubDate>Wed, 12 Oct 2022 00:00:00 GMT</pubDate>
          <description>Desc</description>
          <media:content url="https://test.com/image1.jpg" />
        </item>
      </channel></rss>
    `;
    const items = parseRssFeed(xml, definition);
    assert.strictEqual(items[0].imageUrl, "https://test.com/image1.jpg");
  });

  await t.test("extracts enclosure", () => {
    const xml = `
      <rss><channel>
        <item>
          <title>Test 2</title>
          <link>https://test.com/2</link>
          <pubDate>Wed, 12 Oct 2022 00:00:00 GMT</pubDate>
          <description>Desc</description>
          <enclosure url="https://test.com/image2.jpg" type="image/jpeg" />
        </item>
      </channel></rss>
    `;
    const items = parseRssFeed(xml, definition);
    assert.strictEqual(items[0].imageUrl, "https://test.com/image2.jpg");
  });

  await t.test("extracts image from description", () => {
    const xml = `
      <rss><channel>
        <item>
          <title>Test 3</title>
          <link>https://test.com/3</link>
          <pubDate>Wed, 12 Oct 2022 00:00:00 GMT</pubDate>
          <description><![CDATA[Some text <img src="https://test.com/image3.jpg" /> more text]]></description>
        </item>
      </channel></rss>
    `;
    const items = parseRssFeed(xml, definition);
    assert.strictEqual(items[0].imageUrl, "https://test.com/image3.jpg");
  });
});
