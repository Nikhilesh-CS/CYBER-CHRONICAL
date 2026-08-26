import type { RealIntelligenceItem } from "../models.ts";
import type { LegacyCertInDefinition } from "../sources.ts";
import { decodeHtml, FETCH_TIMEOUT_MS, MAX_RESPONSE_BYTES } from "./utils.ts";

const CERT_IN_ORIGIN = "https://www.cert-in.org.in";
const MAX_ITEMS_PER_SOURCE = 100;
const ARTICLE_IMAGE_TIMEOUT_MS = 7_000;
const MAX_ARTICLE_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_CONCURRENT_IMAGE_FETCHES = 6;

let activeImageFetches = 0;
const imageFetchWaiters: Array<() => void> = [];

async function acquireImageFetchSlot(): Promise<void> {
  if (activeImageFetches < MAX_CONCURRENT_IMAGE_FETCHES) {
    activeImageFetches += 1;
    return;
  }
  await new Promise<void>((resolve) => imageFetchWaiters.push(resolve));
  activeImageFetches += 1;
}

function releaseImageFetchSlot(): void {
  activeImageFetches -= 1;
  imageFetchWaiters.shift()?.();
}

function decodeUrlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .trim();
}

export function normalizeImageUrl(value: string, baseUrl: string): string | undefined {
  try {
    const parsed = new URL(decodeUrlEntities(value), baseUrl);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function tagAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)) {
    attributes[match[1].toLowerCase()] = match[3];
  }
  return attributes;
}

export function extractHtmlImageUrl(html: string, pageUrl: string): string | undefined {
  const candidates = new Map<string, string>();
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = tagAttributes(match[0]);
    const key = (attributes.property || attributes.name || attributes.itemprop || "").toLowerCase();
    const value = attributes.content;
    if (key && value && !candidates.has(key)) candidates.set(key, value);
  }

  for (const key of ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src", "image"]) {
    const value = candidates.get(key);
    if (!value) continue;
    const normalized = normalizeImageUrl(value, pageUrl);
    if (normalized) return normalized;
  }

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attributes = tagAttributes(match[0]);
    if ((attributes.rel || "").toLowerCase().split(/\s+/).includes("image_src") && attributes.href) {
      const normalized = normalizeImageUrl(attributes.href, pageUrl);
      if (normalized) return normalized;
    }
  }

  for (const match of html.matchAll(/"image"\s*:\s*(?:\[\s*)?["']([^"']+)["']/gi)) {
    const normalized = normalizeImageUrl(match[1], pageUrl);
    if (normalized) return normalized;
  }

  return undefined;
}

async function fetchArticleImageUrl(
  pageUrl: string,
  allowedHosts: string[],
  fetcher: typeof fetch,
): Promise<string | undefined> {
  let requestedUrl: URL;
  try {
    requestedUrl = new URL(pageUrl);
  } catch {
    return undefined;
  }
  if (requestedUrl.protocol !== "https:" || !allowedHosts.includes(requestedUrl.hostname.toLowerCase())) return undefined;

  await acquireImageFetchSlot();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ARTICLE_IMAGE_TIMEOUT_MS);
  try {
    const response = await fetcher(requestedUrl.toString(), {
      cache: "no-store",
      headers: { accept: "text/html", "user-agent": "CyberChronicle/1.0" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) return undefined;
    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.includes("text/html")) return undefined;

    const finalUrl = new URL(response.url || requestedUrl.toString());
    if (finalUrl.protocol !== "https:" || !allowedHosts.includes(finalUrl.hostname.toLowerCase())) return undefined;

    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_ARTICLE_RESPONSE_BYTES) return undefined;
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_ARTICLE_RESPONSE_BYTES) return undefined;
    return extractHtmlImageUrl(new TextDecoder("utf-8").decode(bytes), finalUrl.toString());
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
    releaseImageFetchSlot();
  }
}

export async function enrichItemsWithPageImages(
  items: RealIntelligenceItem[],
  definition: LegacyCertInDefinition,
  fetcher: typeof fetch,
): Promise<RealIntelligenceItem[]> {
  return Promise.all(items.map(async (item) => {
    if (item.imageUrl) return item;
    const pageUrl = item.references[0];
    if (!pageUrl) return item;
    const imageUrl = await fetchArticleImageUrl(pageUrl, definition.allowedHosts, fetcher);
    return imageUrl ? { ...item, imageUrl } : item;
  }));
}

function parseCertInDate(value: string): string {
  const normalized = decodeHtml(value).replace(/^\(|\)$/g, "").trim();
  const match = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})$/.exec(normalized);
  if (!match) throw new Error("Invalid upstream schema: CERT-In publication date");
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const timestamp = Date.UTC(Number(match[3]), months.indexOf(match[1]), Number(match[2]));
  return new Date(timestamp).toISOString();
}

export async function fetchHtml(url: string, fetcher: typeof fetch): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetcher(url, {
      cache: "no-store",
      headers: { accept: "text/html", "user-agent": "CyberChronicle/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Upstream returned HTTP ${response.status}`);
    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.includes("text/html")) throw new Error("Upstream returned a non-HTML response");
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_RESPONSE_BYTES) throw new Error("Upstream response is too large");
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_RESPONSE_BYTES) throw new Error("Upstream response is too large");
    return new TextDecoder("windows-1252").decode(bytes);
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Upstream request timed out");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function parseCertInIndex(html: string, definition: LegacyCertInDefinition): RealIntelligenceItem[] {
  if (!/Indian Computer Emergency Response Team/i.test(html) || !/Government of India/i.test(html)) {
    throw new Error("Invalid upstream schema: CERT-In authority markers");
  }

  const identifierPrefix = definition.identifierPrefix ?? "CIAD";
  const detailPageId = definition.detailPageId ?? "PUBVLNOTES02";

  const anchorPattern = new RegExp(`VLCODE=(${identifierPrefix}-\\d{4}-\\d{4})`, "gi");
  const anchors = [...html.matchAll(anchorPattern)];
  const items: RealIntelligenceItem[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < anchors.length; index += 1) {
    const match = anchors[index];
    const identifier = match[1].toUpperCase();
    if (seen.has(identifier)) continue;
    const start = match.index ?? 0;
    const end = Math.min(anchors[index + 1]?.index ?? html.length, start + 8_000);
    const record = html.slice(start, end);
    const dateMatch = /\(([A-Za-z]+\s+\d{1,2},\s+\d{4})\)/i.exec(record);
    const titleMatch = /padding-left:\s*\d+px[^>]*>([\s\S]*?)<\/span>/i.exec(record);
    if (!dateMatch || !titleMatch) {
      throw new Error(`Invalid upstream schema: incomplete ${identifier} metadata`);
    }
    const publishedAt = parseCertInDate(dateMatch[1]);
    const title = decodeHtml(titleMatch[1]);
    if (!title) throw new Error(`Invalid upstream schema: ${identifier} title`);
    const reference = `${CERT_IN_ORIGIN}/s2cMainServlet?pageid=${detailPageId}&VLCODE=${encodeURIComponent(identifier)}`;
    
    items.push({
      id: `cert-in:${identifier.toLowerCase()}`,
      sourceId: definition.id,
      title: `${identifier}: ${title}`,
      summary: "Official CERT-In metadata record. Open the source link for complete technical details and guidance.",
      publishedAt,
      updatedAt: publishedAt,
      categories: definition.categories,
      region: definition.region,
      primaryPublisher: definition.publisher,
      verificationStatus: "official",
      storyState: "confirmed",
      confidence: "High",
      independentSourceCount: 1,
      references: [reference],
      evidence: [{
        publisher: definition.publisher,
        category: definition.categories.includes("cyber") ? "official" : definition.categories[0],
        url: reference,
        publishedAt,
        dependencyGroup: definition.dependencyGroup,
        trustTier: definition.trustTier,
      }],
      studentSummary: `CERT-In published an official security notice titled “${title}”. Open the official record to check affected versions and safety steps.`,
      knownFacts: [`CERT-In published ${identifier} on ${new Date(publishedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}.`],
      unknowns: ["This notice alone does not prove that your device or an Indian organisation was attacked."],
      metadata: {
        type: "cyber",
        severity: "Unknown",
        identifier,
        affected: "Specified in the official CERT-In record",
      },
    });
    seen.add(identifier);
    if (items.length >= MAX_ITEMS_PER_SOURCE) break;
  }
  if (anchors.length === 0 || items.length === 0) {
    throw new Error(`Invalid upstream schema: no ${identifierPrefix} records`);
  }
  return items;
}
