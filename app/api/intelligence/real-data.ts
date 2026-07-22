const CISA_KEV_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const CISA_KEV_MIRROR_URL =
  "https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.json";
const NVD_CVE_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const NVD_RECENT_FEED_URL = "https://nvd.nist.gov/feeds/json/cve/2.0/nvdcve-2.0-recent.json.gz";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const MAX_DECOMPRESSED_BYTES = 32 * 1024 * 1024;
const FRESH_FOR_MS = 15 * 60 * 1_000;
const STALE_FOR_MS = 6 * 60 * 60 * 1_000;

export type RealIntelligenceItem = {
  id: string;
  source: "CISA KEV" | "NVD";
  title: string;
  summary: string;
  publishedAt: string;
  updatedAt: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Unknown";
  cve: string;
  affected: string;
  action?: string;
  dueDate?: string;
  references: string[];
};

export type SourceResult = {
  id: "cisa-kev" | "nvd-cves";
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

type JsonObject = Record<string, unknown>;
type Snapshot = Omit<RealIntelligenceResponse, "state" | "cacheAgeSeconds" | "notice"> & {
  storedAt: number;
};

function snapshotPayload(snapshot: Snapshot) {
  return {
    generatedAt: snapshot.generatedAt,
    lastSuccessfulAt: snapshot.lastSuccessfulAt,
    items: snapshot.items,
    sources: snapshot.sources,
  };
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid upstream schema: ${field}`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function safeUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function severity(value: unknown): RealIntelligenceItem["severity"] {
  const normalized = typeof value === "string" ? value.toLowerCase() : "";
  if (normalized === "critical") return "Critical";
  if (normalized === "high") return "High";
  if (normalized === "medium" || normalized === "moderate") return "Medium";
  if (normalized === "low") return "Low";
  return "Unknown";
}

async function fetchJson(url: string, fetcher: typeof fetch): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetcher(url, {
      headers: { accept: "application/json", "user-agent": "CyberChronicle/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Upstream returned HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    const normalizedContentType = contentType.toLowerCase();
    const isOfficialRawMirror = url === CISA_KEV_MIRROR_URL && normalizedContentType.includes("text/plain");
    if (!normalizedContentType.includes("json") && !isOfficialRawMirror) {
      throw new Error("Upstream returned a non-JSON response");
    }
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_RESPONSE_BYTES) throw new Error("Upstream response is too large");
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_RESPONSE_BYTES) throw new Error("Upstream response is too large");
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Upstream request timed out");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchGzipJson(url: string, fetcher: typeof fetch): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetcher(url, {
      headers: { accept: "application/gzip", "user-agent": "CyberChronicle/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Upstream returned HTTP ${response.status}`);
    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.includes("gzip") && !contentType.includes("octet-stream")) {
      throw new Error("Upstream returned a non-gzip response");
    }
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_RESPONSE_BYTES) throw new Error("Upstream response is too large");
    const compressed = await response.arrayBuffer();
    if (compressed.byteLength > MAX_RESPONSE_BYTES) throw new Error("Upstream response is too large");
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
    const decompressed = await new Response(stream).arrayBuffer();
    if (decompressed.byteLength > MAX_DECOMPRESSED_BYTES) throw new Error("Decompressed upstream response is too large");
    return JSON.parse(new TextDecoder().decode(decompressed)) as unknown;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Upstream request timed out");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function parseCisaKev(payload: unknown): RealIntelligenceItem[] {
  if (!isObject(payload) || !Array.isArray(payload.vulnerabilities)) {
    throw new Error("Invalid upstream schema: CISA KEV vulnerabilities");
  }
  return payload.vulnerabilities.slice(0, 100).map((raw, index) => {
    if (!isObject(raw)) throw new Error(`Invalid upstream schema: CISA KEV item ${index}`);
    const cve = requiredString(raw.cveID, `CISA KEV item ${index}.cveID`);
    const dateAdded = requiredString(raw.dateAdded, `CISA KEV item ${index}.dateAdded`);
    const vendor = requiredString(raw.vendorProject, `CISA KEV item ${index}.vendorProject`);
    const product = requiredString(raw.product, `CISA KEV item ${index}.product`);
    const notes = optionalString(raw.notes);
    const reference = notes ? safeUrl(notes.split(/\s+/).find((part) => part.startsWith("https://"))) : undefined;
    return {
      id: `cisa-kev:${cve}`,
      source: "CISA KEV",
      title: `${cve}: ${requiredString(raw.vulnerabilityName, `CISA KEV item ${index}.vulnerabilityName`)}`,
      summary: requiredString(raw.shortDescription, `CISA KEV item ${index}.shortDescription`),
      publishedAt: dateAdded,
      updatedAt: dateAdded,
      severity: "Unknown",
      cve,
      affected: `${vendor} ${product}`,
      action: optionalString(raw.requiredAction),
      dueDate: optionalString(raw.dueDate),
      references: reference ? [reference] : [CISA_KEV_URL],
    };
  });
}

function englishDescription(cve: JsonObject): string {
  if (!Array.isArray(cve.descriptions)) return "";
  const entry = cve.descriptions.find((item) => isObject(item) && item.lang === "en");
  return isObject(entry) ? optionalString(entry.value) ?? "" : "";
}

function nvdSeverity(cve: JsonObject): RealIntelligenceItem["severity"] {
  if (!isObject(cve.metrics)) return "Unknown";
  for (const key of ["cvssMetricV40", "cvssMetricV31", "cvssMetricV30", "cvssMetricV2"]) {
    const metrics = cve.metrics[key];
    if (!Array.isArray(metrics)) continue;
    for (const metric of metrics) {
      if (!isObject(metric) || !isObject(metric.cvssData)) continue;
      const parsed = severity(metric.cvssData.baseSeverity);
      if (parsed !== "Unknown") return parsed;
    }
  }
  return "Unknown";
}

function parseNvd(payload: unknown): RealIntelligenceItem[] {
  if (!isObject(payload) || !Array.isArray(payload.vulnerabilities)) {
    throw new Error("Invalid upstream schema: NVD vulnerabilities");
  }
  return payload.vulnerabilities.map((wrapper, index) => {
    if (!isObject(wrapper) || !isObject(wrapper.cve)) {
      throw new Error(`Invalid upstream schema: NVD item ${index}`);
    }
    const cve = wrapper.cve;
    const id = requiredString(cve.id, `NVD item ${index}.id`);
    const published = requiredString(cve.published, `NVD item ${index}.published`);
    const updated = requiredString(cve.lastModified, `NVD item ${index}.lastModified`);
    const references = Array.isArray(cve.references)
      ? cve.references.flatMap((entry) => (isObject(entry) ? [safeUrl(entry.url)].filter(Boolean) as string[] : [])).slice(0, 5)
      : [];
    return {
      id: `nvd:${id}`,
      source: "NVD",
      title: `${id}: National Vulnerability Database record`,
      summary: requiredString(englishDescription(cve), `NVD item ${index}.description`),
      publishedAt: published,
      updatedAt: updated,
      severity: nvdSeverity(cve),
      cve: id,
      affected: "See the NVD configuration data for affected products",
      references: references.length ? references : [`https://nvd.nist.gov/vuln/detail/${encodeURIComponent(id)}`],
    };
  }).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 100);
}

function sourceError(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 160) : "Upstream request failed";
}

function nvdUrl(now: Date): string {
  const start = new Date(now.getTime() - 48 * 60 * 60 * 1_000);
  const query = new URLSearchParams({
    lastModStartDate: start.toISOString(),
    lastModEndDate: now.toISOString(),
    resultsPerPage: "100",
  });
  return `${NVD_CVE_URL}?${query}`;
}

function mergeItems(items: RealIntelligenceItem[]): RealIntelligenceItem[] {
  const byCve = new Map<string, RealIntelligenceItem>();
  for (const item of [...items].sort((a, b) => (a.source === "CISA KEV" ? -1 : b.source === "CISA KEV" ? 1 : 0))) {
    const existing = byCve.get(item.cve);
    if (!existing) {
      byCve.set(item.cve, item);
      continue;
    }
    existing.references = [...new Set([...existing.references, ...item.references])];
  }
  return [...byCve.values()].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function createRealIntelligenceService(fetcher: typeof fetch = fetch) {
  let snapshot: Snapshot | null = null;
  let inFlight: Promise<RealIntelligenceResponse> | null = null;

  async function refresh(now = new Date()): Promise<RealIntelligenceResponse> {
    const retrievedAt = now.toISOString();
    const definitions = [
      {
        id: "cisa-kev" as const,
        name: "Known Exploited Vulnerabilities Catalog",
        authority: "U.S. Cybersecurity and Infrastructure Security Agency",
        url: CISA_KEV_URL,
        parse: parseCisaKev,
        load: async () => {
          try {
            return { payload: await fetchJson(CISA_KEV_URL, fetcher), retrievedFrom: CISA_KEV_URL };
          } catch {
            return { payload: await fetchJson(CISA_KEV_MIRROR_URL, fetcher), retrievedFrom: CISA_KEV_MIRROR_URL };
          }
        },
      },
      {
        id: "nvd-cves" as const,
        name: "National Vulnerability Database CVE API",
        authority: "U.S. National Institute of Standards and Technology",
        url: NVD_CVE_URL,
        parse: parseNvd,
        load: async () => {
          const url = nvdUrl(now);
          try {
            return { payload: await fetchJson(url, fetcher), retrievedFrom: url };
          } catch {
            return { payload: await fetchGzipJson(NVD_RECENT_FEED_URL, fetcher), retrievedFrom: NVD_RECENT_FEED_URL };
          }
        },
      },
    ];
    const settled = await Promise.allSettled(
      definitions.map(async (definition) => {
        const loaded = await definition.load();
        return { items: definition.parse(loaded.payload), retrievedFrom: loaded.retrievedFrom };
      }),
    );
    const items: RealIntelligenceItem[] = [];
    const sources: SourceResult[] = definitions.map((definition, index) => {
      const result = settled[index];
      if (result.status === "fulfilled") {
        items.push(...result.value.items);
        return { ...definition, parse: undefined, load: undefined, retrievedFrom: result.value.retrievedFrom, retrievedAt, status: "current" as const, itemCount: result.value.items.length };
      }
      return { ...definition, parse: undefined, load: undefined, retrievedFrom: null, retrievedAt: null, status: "failed" as const, error: sourceError(result.reason), itemCount: 0 };
    }).map((source) => ({
      id: source.id,
      name: source.name,
      authority: source.authority,
      url: source.url,
      retrievedFrom: source.retrievedFrom,
      retrievedAt: source.retrievedAt,
      status: source.status,
      ...(source.status === "failed" ? { error: source.error } : {}),
      itemCount: source.itemCount,
    }));

    const successful = sources.filter((source) => source.status === "current").length;
    if (successful > 0) {
      const deduplicated = mergeItems(items);
      snapshot = { generatedAt: retrievedAt, lastSuccessfulAt: retrievedAt, items: deduplicated, sources, storedAt: now.getTime() };
      return {
        ...snapshotPayload(snapshot),
        state: successful === definitions.length ? "fresh" : "partial",
        cacheAgeSeconds: 0,
        notice: successful === definitions.length
          ? "Live records retrieved from the attributed government sources."
          : "Some government sources are unavailable; only successfully retrieved records are shown.",
      };
    }

    if (snapshot && now.getTime() - snapshot.storedAt <= STALE_FOR_MS) {
      const age = Math.max(0, Math.floor((now.getTime() - snapshot.storedAt) / 1_000));
      return { ...snapshotPayload(snapshot), state: "stale", cacheAgeSeconds: age, notice: "Live sources are unavailable. Showing the last successful snapshot with its age." };
    }
    return {
      state: "unavailable",
      generatedAt: retrievedAt,
      lastSuccessfulAt: snapshot?.lastSuccessfulAt ?? null,
      cacheAgeSeconds: null,
      notice: "Authoritative sources are currently unavailable. No incident data is being shown.",
      items: [],
      sources,
    };
  }

  return async function getRealIntelligence(now = new Date()): Promise<RealIntelligenceResponse> {
    if (snapshot && now.getTime() - snapshot.storedAt < FRESH_FOR_MS) {
      return {
        ...snapshotPayload(snapshot),
        state: "cached",
        cacheAgeSeconds: Math.max(0, Math.floor((now.getTime() - snapshot.storedAt) / 1_000)),
        notice: "Verified records served from the short-lived source cache.",
      };
    }
    if (!inFlight) inFlight = refresh(now).finally(() => { inFlight = null; });
    return inFlight;
  };
}

export const getRealIntelligence = createRealIntelligenceService();
