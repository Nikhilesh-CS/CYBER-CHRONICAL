const CERT_IN_ORIGIN = "https://www.cert-in.org.in";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const FRESH_FOR_MS = 5 * 60 * 1_000;
const STALE_FOR_MS = 6 * 60 * 60 * 1_000;
const MAX_ITEMS_PER_SOURCE = 100;

export type SourceCategory = "official" | "cyber-news" | "security-research" | "threat-intelligence";
export type VerificationStatus = "official" | "corroborated" | "single-source";
export type StoryState = "confirmed" | "developing";
export type ConfidenceLabel = "High" | "Medium" | "Low";

export type EvidenceLink = {
  publisher: string;
  category: SourceCategory;
  url: string;
  publishedAt: string;
  dependencyGroup: string;
  trustTier: 1 | 2 | 3 | 4;
};

export type RealIntelligenceItem = {
  id: string;
  source: string;
  sourceId: string;
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
  sourceCategory: SourceCategory;
  primaryPublisher: string;
  verificationStatus: VerificationStatus;
  storyState: StoryState;
  confidence: ConfidenceLabel;
  independentSourceCount: number;
  evidence: EvidenceLink[];
  studentSummary: string;
  knownFacts: string[];
  unknowns: string[];
};

export type SourceResult = {
  id: string;
  name: string;
  authority: string;
  category: SourceCategory;
  trustTier: 1 | 2 | 3 | 4;
  url: string;
  retrievedFrom: string | null;
  retrievedAt: string | null;
  status: "current" | "stale" | "failed";
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
  kind: "cert-in";
  id: string;
  name: string;
  source: string;
  identifierPrefix: "CIAD" | "CIVN";
  detailPageId: "PUBVLNOTES02" | "PUBVLNOTES01";
  url: string;
};

type RssDefinition = {
  kind: "rss";
  id: string;
  name: string;
  publisher: string;
  authority: string;
  category: Exclude<SourceCategory, "official"> | "official";
  trustTier: 1 | 2;
  dependencyGroup: string;
  url: string;
  allowedHosts: string[];
  strictCyberFilter: boolean;
};

type SourceDefinition = CertInDefinition | RssDefinition;

function sourceDefinitions(year: number): SourceDefinition[] {
  return [
    {
      kind: "cert-in",
      id: "cert-in-advisories",
      name: "CERT-In Advisories",
      source: "CERT-In Advisory",
      identifierPrefix: "CIAD",
      detailPageId: "PUBVLNOTES02",
      url: `${CERT_IN_ORIGIN}/s2cMainServlet?pageid=PUBADVLIST02&year=${year}`,
    },
    {
      kind: "cert-in",
      id: "cert-in-vulnerability-notes",
      name: "CERT-In Vulnerability Notes",
      source: "CERT-In Vulnerability Note",
      identifierPrefix: "CIVN",
      detailPageId: "PUBVLNOTES01",
      url: `${CERT_IN_ORIGIN}/s2cMainServlet?pageid=VLNLIST02&year=${year}`,
    },
    {
      kind: "rss",
      id: "et-ciso-news",
      name: "ET CISO News",
      publisher: "ET CISO",
      authority: "Economic Times CISO, Times Group, India",
      category: "cyber-news",
      trustTier: 2,
      dependencyGroup: "times-group-et-ciso",
      url: "https://ciso.economictimes.indiatimes.com/rss/recentstories",
      allowedHosts: ["ciso.economictimes.indiatimes.com"],
      strictCyberFilter: true,
    },
    {
      kind: "rss",
      id: "the-hacker-news",
      name: "The Hacker News",
      publisher: "The Hacker News",
      authority: "THN Media Private Limited, India",
      category: "cyber-news",
      trustTier: 2,
      dependencyGroup: "thn-media",
      url: "https://feeds.feedburner.com/TheHackersNews",
      allowedHosts: ["thehackernews.com", "www.thehackernews.com"],
      strictCyberFilter: false,
    },
    {
      kind: "rss",
      id: "seqrite-research",
      name: "Seqrite Labs Research",
      publisher: "Seqrite Labs",
      authority: "Seqrite / Quick Heal Technologies, India",
      category: "security-research",
      trustTier: 2,
      dependencyGroup: "quick-heal-seqrite",
      url: "https://www.seqrite.com/blog/feed/",
      allowedHosts: ["www.seqrite.com", "seqrite.com"],
      strictCyberFilter: true,
    },
    {
      kind: "rss",
      id: "cloudsek-intelligence",
      name: "CloudSEK Threat Intelligence",
      publisher: "CloudSEK",
      authority: "CloudSEK threat-intelligence research",
      category: "threat-intelligence",
      trustTier: 2,
      dependencyGroup: "cloudsek",
      url: "https://www.cloudsek.com/blog/rss.xml",
      allowedHosts: ["www.cloudsek.com", "cloudsek.com"],
      strictCyberFilter: true,
    },
    {
      kind: "rss",
      id: "microsoft-security-blog",
      name: "Microsoft Security Blog",
      publisher: "Microsoft Security",
      authority: "Microsoft Security official newsroom and research",
      category: "official",
      trustTier: 1,
      dependencyGroup: "microsoft",
      url: "https://www.microsoft.com/en-us/security/blog/feed/",
      allowedHosts: ["www.microsoft.com", "microsoft.com"],
      strictCyberFilter: false,
    },
    {
      kind: "rss",
      id: "cisco-talos-research",
      name: "Cisco Talos Research",
      publisher: "Cisco Talos",
      authority: "Cisco Talos threat research",
      category: "security-research",
      trustTier: 2,
      dependencyGroup: "cisco-talos",
      url: "https://blog.talosintelligence.com/rss/",
      allowedHosts: ["blog.talosintelligence.com"],
      strictCyberFilter: false,
    },
    {
      kind: "rss",
      id: "eset-welivesecurity",
      name: "ESET WeLiveSecurity",
      publisher: "ESET WeLiveSecurity",
      authority: "ESET security research newsroom",
      category: "security-research",
      trustTier: 2,
      dependencyGroup: "eset",
      url: "https://www.welivesecurity.com/en/rss/feed/",
      allowedHosts: ["www.welivesecurity.com", "welivesecurity.com"],
      strictCyberFilter: false,
    },
    {
      kind: "rss",
      id: "rbi-cyber-updates",
      name: "RBI Cyber & Digital Risk Updates",
      publisher: "Reserve Bank of India",
      authority: "Reserve Bank of India",
      category: "official",
      trustTier: 1,
      dependencyGroup: "reserve-bank-of-india",
      url: "https://rbi.org.in/notifications_rss.xml",
      allowedHosts: ["rbi.org.in", "www.rbi.org.in"],
      strictCyberFilter: true,
    },
    {
      kind: "rss",
      id: "sebi-cyber-updates",
      name: "SEBI Cyber & Market Security Updates",
      publisher: "SEBI",
      authority: "Securities and Exchange Board of India",
      category: "official",
      trustTier: 1,
      dependencyGroup: "sebi",
      url: "https://www.sebi.gov.in/sebirss.xml",
      allowedHosts: ["www.sebi.gov.in", "sebi.gov.in"],
      strictCyberFilter: true,
    },
    {
      kind: "rss",
      id: "bleepingcomputer-news",
      name: "BleepingComputer",
      publisher: "BleepingComputer",
      authority: "BleepingComputer cybersecurity and technology news",
      category: "cyber-news",
      trustTier: 2,
      dependencyGroup: "bleepingcomputer",
      url: "https://www.bleepingcomputer.com/feed/",
      allowedHosts: ["www.bleepingcomputer.com", "bleepingcomputer.com"],
      strictCyberFilter: false,
    },
    {
      kind: "rss",
      id: "krebs-on-security",
      name: "KrebsOnSecurity",
      publisher: "KrebsOnSecurity",
      authority: "Brian Krebs, independent investigative cybersecurity journalist",
      category: "security-research",
      trustTier: 2,
      dependencyGroup: "krebs-on-security",
      url: "https://krebsonsecurity.com/feed/",
      allowedHosts: ["krebsonsecurity.com", "www.krebsonsecurity.com"],
      strictCyberFilter: false,
    },
    {
      kind: "rss",
      id: "google-tag-blog",
      name: "Google Threat Analysis Group",
      publisher: "Google TAG",
      authority: "Google Threat Analysis Group, Alphabet Inc.",
      category: "official",
      trustTier: 1,
      dependencyGroup: "google",
      url: "https://blog.google/threat-analysis-group/rss/",
      allowedHosts: ["blog.google"],
      strictCyberFilter: false,
    },
    {
      kind: "rss",
      id: "kaspersky-securelist",
      name: "Kaspersky Securelist",
      publisher: "Kaspersky Securelist",
      authority: "Kaspersky Lab threat research and analysis",
      category: "threat-intelligence",
      trustTier: 2,
      dependencyGroup: "kaspersky",
      url: "https://securelist.com/feed/",
      allowedHosts: ["securelist.com", "www.securelist.com"],
      strictCyberFilter: false,
    },
    {
      kind: "rss",
      id: "dark-reading-news",
      name: "Dark Reading",
      publisher: "Dark Reading",
      authority: "Dark Reading, Informa TechTarget cybersecurity news",
      category: "cyber-news",
      trustTier: 2,
      dependencyGroup: "dark-reading",
      url: "https://www.darkreading.com/rss.xml",
      allowedHosts: ["www.darkreading.com", "darkreading.com"],
      strictCyberFilter: false,
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

async function fetchXml(url: string, fetcher: typeof fetch): Promise<string> {
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

function stableHash(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

function xmlField(block: string, field: string): string {
  const match = new RegExp(`<${field}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${field}>`, "i").exec(block);
  return decodeHtml((match?.[1] ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1"));
}

const CYBER_TOPIC = /\b(cyber(?:security|attack|crime)?|ransomware|malware|phish(?:ing)?|breach|hack(?:ed|ing)?|vulnerabilit(?:y|ies)|exploit|security (?:incident|risk|weakness|breach)|data leak|threat actor|digital fraud|identity theft|botnet|spyware|trojan)\b/i;
const OFFICIAL_CYBER_TOPIC = /\b(cyber(?:security|attack|crime)?|ransomware|malware|phish(?:ing)?|data breach|information security|technology risk|digital fraud|IT governance|IT systems?|payment security|operational resilience)\b/i;

function rssStudentSummary(definition: RssDefinition, title: string): string {
  if (definition.category === "official") {
    return `${definition.publisher} published an official update titled “${title}”. Open the source to see who it applies to and what action is required.`;
  }
  if (definition.category === "security-research" || definition.category === "threat-intelligence") {
    return `${definition.publisher} published research about “${title}”. It may contain early technical findings, so important details should be checked against other independent sources.`;
  }
  return `${definition.publisher} reports “${title}”. This is a developing news report until a direct statement or another independent source confirms the main claim.`;
}

function parseRssFeed(xml: string, definition: RssDefinition): RealIntelligenceItem[] {
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
    const filter = definition.category === "official" ? OFFICIAL_CYBER_TOPIC : CYBER_TOPIC;
    if (definition.strictCyberFilter && !filter.test(haystack)) continue;
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
    const official = definition.category === "official";
    const studentSummary = rssStudentSummary(definition, title);
    items.push({
      id: key,
      source: definition.publisher,
      sourceId: definition.id,
      title: `${identifier}: ${title}`,
      summary: "Source metadata only. Cyber Chronicle does not reproduce the publisher's article text.",
      publishedAt,
      updatedAt: publishedAt,
      severity: "Unknown",
      identifier,
      affected: "Check the linked source for affected people, organisations, products, or versions",
      references: [parsedUrl.toString()],
      sourceCategory: definition.category,
      primaryPublisher: definition.publisher,
      verificationStatus: official ? "official" : "single-source",
      storyState: official ? "confirmed" : "developing",
      confidence: official ? "High" : "Medium",
      independentSourceCount: 1,
      evidence: [{
        publisher: definition.publisher,
        category: definition.category,
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
    });
    if (items.length >= 25) break;
  }
  return items;
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
      sourceId: definition.id,
      title: `${identifier}: ${title}`,
      summary: "Official CERT-In metadata record. Open the source link for complete technical details and guidance.",
      publishedAt,
      updatedAt: publishedAt,
      severity: "Unknown",
      identifier,
      affected: "Specified in the official CERT-In record",
      references: [reference],
      sourceCategory: "official",
      primaryPublisher: "CERT-In",
      verificationStatus: "official",
      storyState: "confirmed",
      confidence: "High",
      independentSourceCount: 1,
      evidence: [{
        publisher: "CERT-In",
        category: "official",
        url: reference,
        publishedAt,
        dependencyGroup: "cert-in",
        trustTier: 1,
      }],
      studentSummary: `CERT-In published an official security notice titled “${title}”. Open the official record to check affected versions and safety steps.`,
      knownFacts: [`CERT-In published ${identifier} on ${new Date(publishedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}.`],
      unknowns: ["This notice alone does not prove that your device or an Indian organisation was attacked."],
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
  const unique = [...new Map(items.map((item) => [item.id, item])).values()];
  const clusters = new Map<string, RealIntelligenceItem[]>();
  for (const item of unique) {
    const title = item.title.replace(`${item.identifier}: `, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const key = title.length >= 24 ? title : item.id;
    clusters.set(key, [...(clusters.get(key) ?? []), item]);
  }
  const merged = [...clusters.values()].map((group) => {
    if (group.length === 1) return group[0];
    const primary = [...group].sort((a, b) => {
      const official = Number(b.sourceCategory === "official") - Number(a.sourceCategory === "official");
      return official || Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    })[0];
    const evidence = [...new Map(group.flatMap((item) => item.evidence).map((entry) => [entry.url, entry])).values()];
    const independentSourceCount = new Set(evidence.map((entry) => entry.dependencyGroup)).size;
    const official = evidence.some((entry) => entry.category === "official");
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
    };
  });
  return merged.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function createRealIntelligenceService(
  fetcher: typeof fetch = fetch,
  options: { sourceIds?: string[] } = {},
) {
  let snapshot: Snapshot | null = null;
  let inFlight: Promise<RealIntelligenceResponse> | null = null;

  async function refresh(now = new Date()): Promise<RealIntelligenceResponse> {
    const retrievedAt = now.toISOString();
    const definitions = sourceDefinitions(now.getUTCFullYear()).filter(
      (definition) => !options.sourceIds || options.sourceIds.includes(definition.id),
    );
    const settled = await Promise.allSettled(
      definitions.map(async (definition) => {
        const parsed = definition.kind === "cert-in"
          ? parseCertInIndex(await fetchHtml(definition.url, fetcher), definition)
          : parseRssFeed(await fetchXml(definition.url, fetcher), definition);
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
          authority: definition.kind === "cert-in"
            ? "Indian Computer Emergency Response Team (CERT-In), Ministry of Electronics and Information Technology, Government of India"
            : definition.authority,
          category: definition.kind === "cert-in" ? "official" as const : definition.category,
          trustTier: definition.kind === "cert-in" ? 1 as const : definition.trustTier,
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
        authority: definition.kind === "cert-in"
          ? "Indian Computer Emergency Response Team (CERT-In), Ministry of Electronics and Information Technology, Government of India"
          : definition.authority,
        category: definition.kind === "cert-in" ? "official" as const : definition.category,
        trustTier: definition.kind === "cert-in" ? 1 as const : definition.trustTier,
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
          ? "Live metadata retrieved from the reviewed global cybersecurity source network."
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
