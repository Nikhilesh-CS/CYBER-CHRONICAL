import test from "node:test";
import assert from "node:assert";
import { parseRssFeed } from "../lib/parsers/rss.ts";
import { enrichItemsWithPageImages, extractHtmlImageUrl } from "../lib/parsers/html.ts";

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

test("RSS image extraction priorities", async (t) => {
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

  await t.test("decodes HTML entities in image URLs", () => {
    const xml = `
      <rss><channel><item>
        <title>Test encoded image</title>
        <link>https://test.com/encoded</link>
        <pubDate>Wed, 12 Oct 2022 00:00:00 GMT</pubDate>
        <description>Desc</description>
        <media:content url="https://test.com/image.jpg?width=720&amp;quality=80" />
      </item></channel></rss>
    `;
    const items = parseRssFeed(xml, definition);
    assert.strictEqual(items[0].imageUrl, "https://test.com/image.jpg?width=720&quality=80");
  });
});

test("HTML social image extraction", async (t) => {
  await t.test("extracts og:image regardless of attribute order", () => {
    const html = '<html><head><meta content="/images/story.jpg?x=1&amp;y=2" property="og:image"></head></html>';
    assert.strictEqual(
      extractHtmlImageUrl(html, "https://news.example.com/articles/one"),
      "https://news.example.com/images/story.jpg?x=1&y=2",
    );
  });

  await t.test("prefers the secure Open Graph image", () => {
    const html = `<meta property="og:image" content="http://cdn.example.com/insecure.jpg">
      <meta property="og:image:secure_url" content="https://cdn.example.com/secure.jpg">`;
    assert.strictEqual(extractHtmlImageUrl(html, "https://news.example.com/story"), "https://cdn.example.com/secure.jpg");
  });

  await t.test("rejects unsafe image protocols", () => {
    const html = '<meta property="og:image" content="javascript:alert(1)">';
    assert.strictEqual(extractHtmlImageUrl(html, "https://news.example.com/story"), undefined);
  });

  await t.test("fetches an article page when an RSS item has no embedded image", async () => {
    const item = {
      id: "test:story",
      sourceId: "test",
      title: "Story",
      references: ["https://test.com/story"],
    };
    const [enriched] = await enrichItemsWithPageImages(
      [item],
      { ...definition, kind: "rss", strictFilter: false, enabled: true, usage: "approved" },
      async () => new Response(
        '<html><head><meta property="og:image" content="https://test.com/fallback.jpg"></head></html>',
        { status: 200, headers: { "content-type": "text/html" } },
      ),
    );
    assert.strictEqual(enriched.imageUrl, "https://test.com/fallback.jpg");
  });
});
