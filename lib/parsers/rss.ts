import type { RealIntelligenceItem } from "../models.ts";
import type { SourceDefinition } from "../sources.ts";
import { decodeHtml, stableHash, FETCH_TIMEOUT_MS, MAX_RESPONSE_BYTES } from "./utils.ts";
import { OFFICIAL_CYBER_TOPIC, TOPIC_FILTERS, enhanceCategories } from "../classifiers.ts";
import { normalizeImageUrl } from "./html.ts";

function xmlField(block: string, field: string): string {
  const match = new RegExp(`<${field}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${field}>`, "i").exec(block);
  return decodeHtml((match?.[1] ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1"));
}

function rssStudentSummary(definition: SourceDefinition, title: string): string {
  if (definition.trustTier === 1 && definition.authority.toLowerCase().includes("official")) {
    return `${definition.publisher} published an official update titled “${title}”. Open the source to see who it applies to and what action is required.`;
  }
  if (definition.categories.includes("cyber") && (definition.authority.includes("research") || definition.name.includes("Intelligence"))) {
    return `${definition.publisher} published research about “${title}”. It may contain early technical findings, so important details should be checked against other independent sources.`;
  }
  return `${definition.publisher} reports “${title}”. This is a developing news report until a direct statement or another independent source confirms the main claim.`;
}

const MAX_FEED_SUMMARY_LENGTH = 360;

function feedSummary(description: string, title: string): string | undefined {
  const cleaned = decodeHtml(decodeHtml(description))
    .replace(/\b(?:read|continue)\s+(?:the\s+)?(?:full\s+)?(?:story|article|post)\b.*$/i, "")
    .replace(/\s*The post\s+.+?\s+appeared first on\s+.+?\.?\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.toLocaleLowerCase() === title.trim().toLocaleLowerCase()) return undefined;

  if (cleaned.length <= MAX_FEED_SUMMARY_LENGTH) return cleaned;
  const shortened = cleaned.slice(0, MAX_FEED_SUMMARY_LENGTH + 1);
  const sentenceEnd = Math.max(shortened.lastIndexOf(". "), shortened.lastIndexOf("! "), shortened.lastIndexOf("? "));
  const wordEnd = shortened.lastIndexOf(" ");
  const end = sentenceEnd >= 160 ? sentenceEnd + 1 : wordEnd >= 160 ? wordEnd : MAX_FEED_SUMMARY_LENGTH;
  return `${shortened.slice(0, end).trim()}…`;
}

function extractImageUrl(block: string, baseUrl: string): string | undefined {
  const patterns = [
    /<media:content[^>]+url=["']([^"']+)["']/i,
    /<media:thumbnail[^>]+url=["']([^"']+)["']/i,
    /<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\//i,
    /<enclosure[^>]+type=["']image\/[^>]+url=["']([^"']+)["']/i,
    /<content:encoded>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i,
    /<description>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(block);
    if (match && match[1]) {
      const normalized = normalizeImageUrl(match[1], baseUrl);
      if (normalized) return normalized;
    }
  }
  return undefined;
}

export async function fetchXml(url: string, fetcher: typeof fetch): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetcher(url, {
      cache: "no-store",
      headers: { accept: "application/rss+xml, application/xml, text/xml", "user-agent": "CyberChronicle/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Upstream returned HTTP ${response.status}`);
    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!/(?:rss|xml)/.test(contentType)) throw new Error("Upstream returned a non-XML response");
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_RESPONSE_BYTES) throw new Error("Upstream response is too large");
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_RESPONSE_BYTES) throw new Error("Upstream response is too large");
    return new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Upstream request timed out");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function parseRssFeed(xml: string, definition: SourceDefinition): RealIntelligenceItem[] {
  if (!/<rss\b/i.test(xml) || !/<channel\b/i.test(xml)) throw new Error("Invalid upstream schema: RSS channel");
  const blocks = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
  if (blocks.length === 0) throw new Error("Invalid upstream schema: no RSS items");
  const items: RealIntelligenceItem[] = [];
  for (const block of blocks) {
    const title = xmlField(block, "title");
    const link = xmlField(block, "link");
    const description = xmlField(block, "description");
    const publishedRaw = xmlField(block, "pubDate") || xmlField(block, "dc:date");
    if (!title || !link || !publishedRaw) continue;
    const haystack = `${title} ${description}`;
    const filter = definition.trustTier === 1 ? OFFICIAL_CYBER_TOPIC : TOPIC_FILTERS.cyber;
    if (definition.strictFilter && !filter.test(haystack)) continue;
    
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(link);
    } catch {
      continue;
    }
    if (parsedUrl.protocol !== "https:" || !definition.allowedHosts.includes(parsedUrl.hostname.toLowerCase())) continue;
    
    const timestamp = Date.parse(publishedRaw);
    if (!Number.isFinite(timestamp)) continue;
    const publishedAt = new Date(timestamp).toISOString();
    
    const key = `${definition.id}:${parsedUrl.toString()}`;
    const identifier = `CC-${stableHash(key).toUpperCase()}`;
    const official = definition.trustTier === 1;
    const studentSummary = rssStudentSummary(definition, title);
    const sourceSummary = definition.feedSummaryPolicy === "metadata-only"
      ? undefined
      : feedSummary(description, title) || undefined;
    
    const finalCategories = enhanceCategories(definition.categories, title, description);
    const imageUrl = extractImageUrl(block, parsedUrl.origin);
    
    items.push({
      id: key,
      sourceId: definition.id,
      title: `${identifier}: ${title}`,
      summary: sourceSummary ?? (definition.feedSummaryPolicy === "metadata-only"
        ? "Cyber Chronicle retains only the headline, publisher, date, and link from this feed. Open the original report for its full context."
        : "The publisher did not include a usable summary in its feed. Open the source for complete context."),
      publishedAt,
      updatedAt: publishedAt,
      categories: finalCategories,
      region: definition.region,
      primaryPublisher: definition.publisher,
      verificationStatus: official ? "official" : "single-source",
      storyState: official ? "confirmed" : "developing",
      confidence: official ? "High" : "Medium",
      independentSourceCount: 1,
      references: [parsedUrl.toString()],
      evidence: [{
        publisher: definition.publisher,
        category: finalCategories[0],
        url: parsedUrl.toString(),
        publishedAt,
        dependencyGroup: definition.dependencyGroup,
        trustTier: definition.trustTier,
      }],
      studentSummary,
      knownFacts: [`${definition.publisher} published this item on ${new Date(publishedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}.`],
      unknowns: official
        ? ["The headline alone does not prove that an attack is actively happening."]
        : ["The central claim may change until a direct statement or independent report confirms it."],
      metadata: finalCategories.includes("cyber") 
        ? {
            type: "cyber",
            severity: "Unknown",
            identifier,
            affected: "Check the linked source for affected people, organisations, products, or versions",
          }
        : { type: "general" },
      ...(imageUrl ? { imageUrl } : {}),
    });
    if (items.length >= 25) break;
  }
  return items;
}
