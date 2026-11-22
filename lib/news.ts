import type { RealIntelligenceItem, RealIntelligenceResponse, SourceResult } from "./models.ts";
import { getSourceDefinitions } from "./sources.ts";
import { fetchXml, parseRssFeed } from "./parsers/rss.ts";
import { applyCertInDetails, enrichItemsWithPageImages, fetchHtml, parseCertInIndex } from "./parsers/html.ts";
import { parseOfficialPressListing } from "./parsers/press.ts";
import { enrichVulnerabilities } from "./vulnerabilities/enrichment.ts";
import { extractCveIds } from "./vulnerabilities/identifiers.ts";

const FRESH_FOR_MS = 5 * 60 * 1_000;
const STALE_FOR_MS = 6 * 60 * 60 * 1_000;

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

function sourceError(error: unknown): string {
  if (!(error instanceof Error)) return "Upstream request failed";
  const code = (error.cause as { code?: unknown } | undefined)?.code;
  return `${error.message}${typeof code === "string" && /^[A-Z0-9_]+$/.test(code) ? ` (${code})` : ""}`.slice(0, 160);
}

async function fetchTierOne<T>(load: () => Promise<T>, retry: boolean) {
  try {
    return await load();
  } catch (error) {
    if (!retry || !/(?:fetch failed|timed out|HTTP 429|HTTP 5\d\d)/i.test(sourceError(error))) throw error;
    await new Promise((resolve) => setTimeout(resolve, 750));
    return load();
  }
}

export function mergeItems(items: RealIntelligenceItem[]): RealIntelligenceItem[] {
  const unique = [...new Map(items.map((item) => [item.id, item])).values()];
  const clusters = new Map<string, RealIntelligenceItem[]>();
  for (const item of unique) {
    const title = item.title.replace(/^(?:CC-[A-Z0-9]+|CI(?:AD|VN)-\d{4}-\d+):\s*/i, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const cves = item.metadata.type === "cyber" ? item.metadata.cveIds ?? extractCveIds(item.title) : [];
    // A notice covering several CVEs cannot establish independent coverage for any one of them.
    const key = cves.length === 1 ? `cve:${cves[0]}`
      : title.length >= 24 ? `headline:${title}:${cves.join(",")}:${item.publishedAt.slice(0, 10)}` : `item:${item.id}`;
    clusters.set(key, [...(clusters.get(key) ?? []), item]);
  }
  const merged = [...clusters.entries()].map(([key, group]) => {
    if (group.length === 1) return group[0];
    const primary = [...group].sort((a, b) => {
      // Prioritize trustTier 1 (Official)
      const official = Number(b.verificationStatus === "official") - Number(a.verificationStatus === "official");
      return official || Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    })[0];
    const evidence = [...new Map(group.flatMap((item) => item.evidence).map((entry) => [entry.url, entry])).values()];
    const independentSourceCount = new Set(evidence.map((entry) => entry.dependencyGroup)).size;
    const official = evidence.some((entry) => entry.trustTier === 1);
    const corroborationBasis = key.startsWith("cve:") ? "cve" as const : "headline" as const;
    const corroborated = independentSourceCount >= 2;
    const confirmed = official || (corroborated && corroborationBasis === "headline");
    const imageUrl = primary.imageUrl || group.find(item => item.imageUrl)?.imageUrl;
    const aliases = [...new Set(group.flatMap((item) => [item.id, ...item.aliases ?? []]))].filter((id) => id !== primary.id);
    const scopedFact = corroborated && corroborationBasis === "cve"
      ? `${independentSourceCount} independent publishers discuss ${key.slice(4)}. Their reports may describe different claims or incidents.`
      : undefined;
    return {
      ...primary,
      references: evidence.map((entry) => entry.url),
      evidence,
      independentSourceCount,
      aliases,
      ...(corroborated ? { corroborationBasis } : {}),
      verificationStatus: official ? "official" as const : corroborated ? "corroborated" as const : "single-source" as const,
      storyState: confirmed ? "confirmed" as const : "developing" as const,
      confidence: confirmed ? "High" as const : primary.confidence,
      studentSummary: corroborated && !official && corroborationBasis === "headline"
        ? `${independentSourceCount} independent publishers report the same update. Open the evidence links to compare what each source confirms.`
        : primary.studentSummary,
      knownFacts: scopedFact ? [...primary.knownFacts, scopedFact] : primary.knownFacts,
      imageUrl,
    };
  });
  return merged.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function createRealIntelligenceService(
  fetcher: typeof fetch = fetch,
  options: { sourceIds?: string[]; enrichImages?: boolean; enrichVulnerabilities?: boolean; vulnerabilityCacheDir?: string; previousSources?: SourceResult[] } = {},
) {
  let snapshot: Snapshot | null = null;
  let inFlight: Promise<RealIntelligenceResponse> | null = null;

  async function refresh(now = new Date()): Promise<RealIntelligenceResponse> {
    const retrievedAt = now.toISOString();
    // Only use enabled sources and filter by sourceIds if provided
    const definitions = getSourceDefinitions(now.getUTCFullYear()).filter(
      (definition) => definition.enabled && (!options.sourceIds || options.sourceIds.includes(definition.id)),
    );
    const settled = await Promise.allSettled(
      definitions.map(async (definition) => {
        let parsed: RealIntelligenceItem[] = [];
        const readListing = () => fetchTierOne(() => fetchHtml(definition.url, fetcher, definition.allowedHosts), definition.trustTier === 1 && options.enrichVulnerabilities === true);
        if (definition.kind === "html" && definition.identifierPrefix) {
          parsed = parseCertInIndex(await readListing(), definition);
          if (options.enrichVulnerabilities) {
            const recent = parsed.slice(0, 12);
            const enriched = [];
            for (let start = 0; start < recent.length; start += 2) {
              const details = await Promise.all(recent.slice(start, start + 2).map(async (item) => {
                try {
                  return applyCertInDetails(item, await fetchHtml(item.references[0], fetcher, definition.allowedHosts));
                } catch {
                  return item;
                }
              }));
              enriched.push(...details);
            }
            parsed = [...enriched, ...parsed.slice(recent.length)];
          }
        } else if (definition.kind === "html" && definition.pressListing) {
          parsed = parseOfficialPressListing(await readListing(), definition);
        } else if (definition.kind === "rss") {
          const xml = await fetchTierOne(() => fetchXml(definition.url, fetcher, definition.allowedHosts), definition.trustTier === 1 && options.enrichVulnerabilities === true);
          parsed = parseRssFeed(xml, definition);
        }
        if (options.enrichImages !== false && !definition.identifierPrefix) {
          parsed = await enrichItemsWithPageImages(parsed, definition, fetcher);
        }
        return { items: parsed, retrievedFrom: definition.url };
      }),
    );
    const items: RealIntelligenceItem[] = [];
    const sources: SourceResult[] = definitions.map((definition, index) => {
      const result = settled[index];
      if (result.status === "fulfilled") {
        items.push(...result.value.items);
        return {
          id: definition.id,
          name: definition.name,
          authority: definition.authority,
          categories: definition.categories,
          trustTier: definition.trustTier,
          siteUrl: definition.siteUrl,
          url: definition.url,
          retrievedFrom: result.value.retrievedFrom,
          retrievedAt,
          status: "current" as const,
          itemCount: result.value.items.length,
        };
      }
      const staleItems = snapshot?.items.filter((item) => item.sourceId === definition.id) ?? [];
      const previousSource = (snapshot?.sources ?? options.previousSources)?.find((source) => source.id === definition.id);
      items.push(...staleItems);
      return {
        id: definition.id,
        name: definition.name,
        authority: definition.authority,
        categories: definition.categories,
        trustTier: definition.trustTier,
        siteUrl: definition.siteUrl,
        url: definition.url,
        retrievedFrom: previousSource?.retrievedFrom ?? null,
        retrievedAt: previousSource?.retrievedAt ?? null,
        status: staleItems.length ? "stale" as const : "failed" as const,
        error: sourceError(result.reason),
        itemCount: staleItems.length,
      };
    });

    const successful = sources.filter((source) => source.status === "current").length;
    if (successful > 0) {
      const merged = mergeItems(items);
      snapshot = {
        generatedAt: retrievedAt,
        lastSuccessfulAt: retrievedAt,
        items: options.enrichVulnerabilities ? await enrichVulnerabilities(merged, fetcher, options.vulnerabilityCacheDir) : merged,
        sources,
        storedAt: now.getTime(),
      };
      return {
        ...snapshotPayload(snapshot),
        state: successful === definitions.length ? "fresh" : "partial",
        cacheAgeSeconds: 0,
        notice: successful === definitions.length
          ? "Live metadata retrieved from the reviewed global source network."
          : "Some reviewed sources are unavailable. Current results and any clearly marked last verified source records are shown.",
      };
    }

    if (snapshot && now.getTime() - snapshot.storedAt <= STALE_FOR_MS) {
      const age = Math.max(0, Math.floor((now.getTime() - snapshot.storedAt) / 1_000));
      return {
        ...snapshotPayload(snapshot),
        state: "stale",
        cacheAgeSeconds: age,
        notice: "The source network is temporarily unavailable. Showing the last successful snapshot with its age.",
      };
    }
    return {
      state: "unavailable",
      generatedAt: retrievedAt,
      lastSuccessfulAt: snapshot?.lastSuccessfulAt ?? null,
      cacheAgeSeconds: null,
      notice: "The reviewed source network is currently unavailable. No unverified fallback data is being shown.",
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
        notice: "Reviewed source metadata served from the short-lived newsroom cache.",
      };
    }
    if (!inFlight) inFlight = refresh(now).finally(() => { inFlight = null; });
    return inFlight;
  };
}

export const newsroomEnrichment = {
  enrichVulnerabilities: true,
  vulnerabilityCacheDir: ".cache/vulnerabilities",
};
export const getRealIntelligence = createRealIntelligenceService(fetch, newsroomEnrichment);

export * from "./models.ts";
