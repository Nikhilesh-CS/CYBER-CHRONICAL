import type { RealIntelligenceItem, RealIntelligenceResponse, SourceResult } from "./models.ts";
import { getSourceDefinitions } from "./sources.ts";
import { fetchXml, parseRssFeed } from "./parsers/rss.ts";
import { enrichItemsWithPageImages, fetchHtml, parseCertInIndex } from "./parsers/html.ts";

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
  return error instanceof Error ? error.message.slice(0, 160) : "Upstream request failed";
}

export function mergeItems(items: RealIntelligenceItem[]): RealIntelligenceItem[] {
  const unique = [...new Map(items.map((item) => [item.id, item])).values()];
  const clusters = new Map<string, RealIntelligenceItem[]>();
  for (const item of unique) {
    // Basic title clustering
    const title = item.title.replace(/CC-[A-Z0-9]+: /, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const key = title.length >= 24 ? title : item.id;
    clusters.set(key, [...(clusters.get(key) ?? []), item]);
  }
  const merged = [...clusters.values()].map((group) => {
    if (group.length === 1) return group[0];
    const primary = [...group].sort((a, b) => {
      // Prioritize trustTier 1 (Official)
      const official = Number(b.verificationStatus === "official") - Number(a.verificationStatus === "official");
      return official || Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    })[0];
    const evidence = [...new Map(group.flatMap((item) => item.evidence).map((entry) => [entry.url, entry])).values()];
    const independentSourceCount = new Set(evidence.map((entry) => entry.dependencyGroup)).size;
    const official = evidence.some((entry) => entry.trustTier === 1);
    const imageUrl = primary.imageUrl || group.find(item => item.imageUrl)?.imageUrl;
    return {
      ...primary,
      references: evidence.map((entry) => entry.url),
      evidence,
      independentSourceCount,
      verificationStatus: official ? "official" as const : independentSourceCount >= 2 ? "corroborated" as const : "single-source" as const,
      storyState: official || independentSourceCount >= 2 ? "confirmed" as const : "developing" as const,
      confidence: official || independentSourceCount >= 2 ? "High" as const : primary.confidence,
      studentSummary: independentSourceCount >= 2 && !official
        ? `${independentSourceCount} independent publishers report the same update. Open the evidence links to compare what each source confirms.`
        : primary.studentSummary,
      imageUrl,
    };
  });
  return merged.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function createRealIntelligenceService(
  fetcher: typeof fetch = fetch,
  options: { sourceIds?: string[]; enrichImages?: boolean } = {},
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
        if (definition.kind === "html" && definition.identifierPrefix) {
          parsed = parseCertInIndex(await fetchHtml(definition.url, fetcher), definition);
        } else if (definition.kind === "rss") {
          parsed = parseRssFeed(await fetchXml(definition.url, fetcher), definition);
        }
        if (options.enrichImages !== false) {
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
      const previousSource = snapshot?.sources.find((source) => source.id === definition.id);
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

export const getRealIntelligence = createRealIntelligenceService();

export * from "./models.ts";
