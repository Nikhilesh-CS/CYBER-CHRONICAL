import type { RealIntelligenceItem } from "../models.ts";
import type { LegacyCertInDefinition } from "../sources.ts";
import { decodeHtml, FETCH_TIMEOUT_MS, MAX_RESPONSE_BYTES } from "./utils.ts";

const CERT_IN_ORIGIN = "https://www.cert-in.org.in";
const MAX_ITEMS_PER_SOURCE = 100;

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
