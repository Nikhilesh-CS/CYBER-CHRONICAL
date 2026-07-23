const CERT_IN_ORIGIN = "https://www.cert-in.org.in";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const FRESH_FOR_MS = 5 * 60 * 1_000;
const STALE_FOR_MS = 6 * 60 * 60 * 1_000;
const MAX_ITEMS_PER_SOURCE = 100;

export type RealIntelligenceItem = {
  id: string;
  source: "CERT-In Advisory" | "CERT-In Vulnerability Note";
  title: string;
  summary: string;
  publishedAt: string;
  updatedAt: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Unknown";
  identifier: string;
  affected: string;
  action?: string;
  dueDate?: string;
  references: string[];
};

export type SourceResult = {
  id: "cert-in-advisories" | "cert-in-vulnerability-notes";
  name: string;
  authority: string;
  url: string;
  retrievedFrom: string | null;
  retrievedAt: string | null;
  status: "current" | "failed";
  error?: string;
  itemCount: number;
};

export type RealIntelligenceResponse = {
  state: "fresh" | "cached" | "stale" | "partial" | "unavailable";
  generatedAt: string;
  lastSuccessfulAt: string | null;
  cacheAgeSeconds: number | null;
  notice: string;
  items: RealIntelligenceItem[];
  sources: SourceResult[];
};

type Snapshot = Omit<RealIntelligenceResponse, "state" | "cacheAgeSeconds" | "notice"> & {
  storedAt: number;
};

type CertInDefinition = {
  id: SourceResult["id"];
  name: string;
  source: RealIntelligenceItem["source"];
  identifierPrefix: "CIAD" | "CIVN";
  detailPageId: "PUBVLNOTES02" | "PUBVLNOTES01";
  url: string;
};

function sourceDefinitions(year: number): CertInDefinition[] {
  return [
    {
      id: "cert-in-advisories",
      name: "CERT-In Advisories",
      source: "CERT-In Advisory",
      identifierPrefix: "CIAD",
      detailPageId: "PUBVLNOTES02",
      url: `${CERT_IN_ORIGIN}/s2cMainServlet?pageid=PUBADVLIST02&year=${year}`,
    },
    {
      id: "cert-in-vulnerability-notes",
      name: "CERT-In Vulnerability Notes",
      source: "CERT-In Vulnerability Note",
      identifierPrefix: "CIVN",
      detailPageId: "PUBVLNOTES01",
      url: `${CERT_IN_ORIGIN}/s2cMainServlet?pageid=VLNLIST02&year=${year}`,
    },
  ];
}

function snapshotPayload(snapshot: Snapshot) {
  return {
    generatedAt: snapshot.generatedAt,
    lastSuccessfulAt: snapshot.lastSuccessfulAt,
    items: snapshot.items,
    sources: snapshot.sources,
  };
}

function decodeHtml(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_match, entity: string) => {
      const numeric = entity.toLowerCase().startsWith("x")
        ? Number.parseInt(entity.slice(1), 16)
        : Number.parseInt(entity, 10);
      return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : " ";
    })
    .replace(/&([a-z]+);/gi, (_match, entity: string) => named[entity.toLowerCase()] ?? " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCertInDate(value: string): string {
  const normalized = decodeHtml(value).replace(/^\(|\)$/g, "").trim();
  const match = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})$/.exec(normalized);
  if (!match) throw new Error("Invalid upstream schema: CERT-In publication date");
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const timestamp = Date.UTC(Number(match[3]), months.indexOf(match[1]), Number(match[2]));
  return new Date(timestamp).toISOString();
}

async function fetchHtml(url: string, fetcher: typeof fetch): Promise<string> {
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

function parseCertInIndex(html: string, definition: CertInDefinition): RealIntelligenceItem[] {
  if (!/Indian Computer Emergency Response Team/i.test(html) || !/Government of India/i.test(html)) {
    throw new Error("Invalid upstream schema: CERT-In authority markers");
  }

  const anchorPattern = new RegExp(`VLCODE=(${definition.identifierPrefix}-\\d{4}-\\d{4})`, "gi");
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
    const reference = `${CERT_IN_ORIGIN}/s2cMainServlet?pageid=${definition.detailPageId}&VLCODE=${encodeURIComponent(identifier)}`;
    items.push({
      id: `cert-in:${identifier.toLowerCase()}`,
      source: definition.source,
      title: `${identifier}: ${title}`,
      summary: "Official CERT-In metadata record. Open the source link for complete technical details and guidance.",
      publishedAt,
      updatedAt: publishedAt,
      severity: "Unknown",
      identifier,
      affected: "Specified in the official CERT-In record",
      references: [reference],
    });
    seen.add(identifier);
    if (items.length >= MAX_ITEMS_PER_SOURCE) break;
  }
  if (anchors.length === 0 || items.length === 0) {
    throw new Error(`Invalid upstream schema: no ${definition.identifierPrefix} records`);
  }
  return items;
}

function sourceError(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 160) : "Upstream request failed";
}

function mergeItems(items: RealIntelligenceItem[]): RealIntelligenceItem[] {
  const unique = new Map(items.map((item) => [item.id, item]));
  return [...unique.values()].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function createRealIntelligenceService(fetcher: typeof fetch = fetch) {
  let snapshot: Snapshot | null = null;
  let inFlight: Promise<RealIntelligenceResponse> | null = null;

  async function refresh(now = new Date()): Promise<RealIntelligenceResponse> {
    const retrievedAt = now.toISOString();
    const definitions = sourceDefinitions(now.getUTCFullYear());
    const settled = await Promise.allSettled(
      definitions.map(async (definition) => ({
        items: parseCertInIndex(await fetchHtml(definition.url, fetcher), definition),
        retrievedFrom: definition.url,
      })),
    );
    const items: RealIntelligenceItem[] = [];
    const sources: SourceResult[] = definitions.map((definition, index) => {
      const result = settled[index];
      if (result.status === "fulfilled") {
        items.push(...result.value.items);
        return {
          id: definition.id,
          name: definition.name,
          authority: "Indian Computer Emergency Response Team (CERT-In), Ministry of Electronics and Information Technology, Government of India",
          url: definition.url,
          retrievedFrom: result.value.retrievedFrom,
          retrievedAt,
          status: "current" as const,
          itemCount: result.value.items.length,
        };
      }
      return {
        id: definition.id,
        name: definition.name,
        authority: "Indian Computer Emergency Response Team (CERT-In), Ministry of Electronics and Information Technology, Government of India",
        url: definition.url,
        retrievedFrom: null,
        retrievedAt: null,
        status: "failed" as const,
        error: sourceError(result.reason),
        itemCount: 0,
      };
    });

    const successful = sources.filter((source) => source.status === "current").length;
    if (successful > 0) {
      snapshot = {
        generatedAt: retrievedAt,
        lastSuccessfulAt: retrievedAt,
        items: mergeItems(items),
        sources,
        storedAt: now.getTime(),
      };
      return {
        ...snapshotPayload(snapshot),
        state: successful === definitions.length ? "fresh" : "partial",
        cacheAgeSeconds: 0,
        notice: successful === definitions.length
          ? "Live records retrieved from official CERT-In India sources."
          : "One official CERT-In India source is unavailable; only successfully retrieved records are shown.",
      };
    }

    if (snapshot && now.getTime() - snapshot.storedAt <= STALE_FOR_MS) {
      const age = Math.max(0, Math.floor((now.getTime() - snapshot.storedAt) / 1_000));
      return {
        ...snapshotPayload(snapshot),
        state: "stale",
        cacheAgeSeconds: age,
        notice: "CERT-In India is temporarily unavailable. Showing the last successful snapshot with its age.",
      };
    }
    return {
      state: "unavailable",
      generatedAt: retrievedAt,
      lastSuccessfulAt: snapshot?.lastSuccessfulAt ?? null,
      cacheAgeSeconds: null,
      notice: "Official CERT-In India sources are currently unavailable. No incident data is being shown.",
      items: [],
      sources,
    };
  }

  return async function getRealIntelligence(now = new Date(), options: { force?: boolean } = {}): Promise<RealIntelligenceResponse> {
    if (!options.force && snapshot && now.getTime() - snapshot.storedAt < FRESH_FOR_MS) {
      return {
        ...snapshotPayload(snapshot),
        state: "cached",
        cacheAgeSeconds: Math.max(0, Math.floor((now.getTime() - snapshot.storedAt) / 1_000)),
        notice: "Verified CERT-In India records served from the short-lived source cache.",
      };
    }
    if (!inFlight) inFlight = refresh(now).finally(() => { inFlight = null; });
    return inFlight;
  };
}

export const getRealIntelligence = createRealIntelligenceService();
