import type { RealIntelligenceItem, VulnerabilityEvidence } from "../models.ts";
import { extractCveIds } from "./identifiers.ts";
import { cachedJson } from "./cache.ts";
import { REVIEWED_ADVISORIES } from "./reviewed-advisories.ts";

const KEV_CATALOG = "https://www.cisa.gov/known-exploited-vulnerabilities-catalog";
const KEV_FEED = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const EPSS_API = "https://api.first.org/data/v1/epss";
const CVE_API = "https://cveawg.mitre.org/api/cve";
const NVD_API = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const HOUR = 60 * 60 * 1_000;
const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;
const MAX_CVE_LOOKUPS = 40;

type Severity = typeof SEVERITIES[number];
type Cvss = { baseSeverity?: string; baseScore?: number };
type CveRecord = {
  cveMetadata?: { cveId?: string; state?: string };
  containers?: { cna?: {
    metrics?: Array<{ cvssV4_0?: Cvss; cvssV3_1?: Cvss; cvssV3_0?: Cvss }>;
    affected?: Array<{
      vendor?: string; product?: string; defaultStatus?: string;
      versions?: Array<{ status?: string; version?: string; lessThan?: string; lessThanOrEqual?: string }>;
    }>;
    solutions?: Array<{ lang?: string; value?: string }>;
  } };
};
type KevRow = { cveID?: string; dateAdded?: string; dueDate?: string; requiredAction?: string };
type EpssRow = { cve?: string; epss?: string; date?: string };
type NvdMatch = {
  vulnerable?: boolean; criteria?: string;
  versionStartIncluding?: string; versionStartExcluding?: string;
  versionEndIncluding?: string; versionEndExcluding?: string;
};
type NvdCve = {
  id?: string;
  vulnStatus?: string;
  metrics?: Record<string, Array<{ type?: string; cvssData?: Cvss }>>;
  configurations?: Array<{ nodes?: Array<{ cpeMatch?: NvdMatch[] }> }>;
};

function boundedText(value: unknown, limit = 240): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  return cleaned.length > limit ? `${cleaned.slice(0, limit).trimEnd()}…` : cleaned;
}

function validDay(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value));
}

async function fetchJson<T>(url: string, fetcher: typeof fetch): Promise<T | undefined> {
  try {
    const response = await fetcher(url, {
      headers: { accept: "application/json", "user-agent": "CyberChronicle/1.0" },
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
    const limit = 4 * 1024 * 1024;
    if (!response.ok || Number(response.headers.get("content-length")) > limit) return undefined;
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > limit) return undefined;
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return undefined;
  }
}

function cvssSeverity(cvss: Cvss | undefined): Severity | undefined {
  const severity = SEVERITIES.find((level) => level.toUpperCase() === cvss?.baseSeverity?.toUpperCase());
  if (severity) return severity;
  const score = cvss?.baseScore;
  if (typeof score !== "number" || !Number.isFinite(score) || score <= 0 || score > 10) return undefined;
  return score >= 9 ? "Critical" : score >= 7 ? "High" : score >= 4 ? "Medium" : "Low";
}

function cveEvidence(id: string, record: CveRecord | undefined): VulnerabilityEvidence | undefined {
  if (record?.cveMetadata?.cveId !== id || record.cveMetadata.state !== "PUBLISHED") return undefined;
  const cna = record.containers?.cna;
  if (!cna) return undefined;
  const metrics = Array.isArray(cna.metrics) ? cna.metrics : [];
  const scores = metrics.map((metric) => metric.cvssV4_0 ?? metric.cvssV3_1 ?? metric.cvssV3_0);
  const severities = scores.map(cvssSeverity);
  const severity = [...SEVERITIES].reverse().find((level) => severities.includes(level));
  const score = severity ? scores.find((value) => cvssSeverity(value) === severity)?.baseScore : undefined;
  const affected = (Array.isArray(cna.affected) ? cna.affected : []).flatMap((entry) => {
    const product = boundedText(entry.product, 100);
    if (!product || /^(?:unknown|n\/a|unspecified)$/i.test(product)) return [];
    const vendor = boundedText(entry.vendor, 60);
    const label = vendor && !/^(?:unknown|n\/a)$/i.test(vendor) && !product.toLowerCase().includes(vendor.toLowerCase())
      ? `${vendor} ${product}`
      : product;
    const versions = (Array.isArray(entry.versions) ? entry.versions : [])
      .filter((version) => version.status === "affected")
      .map((version) => {
        const start = boundedText(version.version, 40);
        const before = boundedText(version.lessThan, 40);
        const through = boundedText(version.lessThanOrEqual, 40);
        if (!start || /^(?:0|n\/a|\*)$/i.test(start)) return before ? `before ${before}` : through ? `through ${through}` : "";
        return before ? `${start} to before ${before}` : through ? `${start} through ${through}` : start;
      });
    return versions.length || entry.defaultStatus === "affected"
      ? versions.length ? versions.map((version) => [label, version].filter(Boolean).join(" ")) : [label]
      : [];
  });
  const solution = (Array.isArray(cna.solutions) ? cna.solutions : []).find((entry) => /^en\b/i.test(entry.lang ?? ""));
  const action = boundedText(solution?.value);
  return {
    id,
    cveUrl: `https://www.cve.org/CVERecord?id=${id}`,
    ...(severity ? { severity } : {}),
    ...(typeof score === "number" && score >= 0 && score <= 10 ? { cvssScore: score } : {}),
    ...(affected.length ? { affected: [...new Set(affected)].slice(0, 12) } : {}),
    ...(action ? { action } : {}),
  };
}

function nvdEvidence(record: NvdCve): Partial<VulnerabilityEvidence> {
  const metrics = ["cvssMetricV40", "cvssMetricV31", "cvssMetricV30"].flatMap((name) => record.metrics?.[name] ?? []);
  const preferred = metrics.find((metric) => metric.type === "Primary" && cvssSeverity(metric.cvssData))
    ?? metrics.find((metric) => cvssSeverity(metric.cvssData));
  const severity = cvssSeverity(preferred?.cvssData);
  const score = preferred?.cvssData?.baseScore;
  const configurations = Array.isArray(record.configurations) ? record.configurations : [];
  const matches = configurations.flatMap((configuration) => configuration.nodes ?? []).flatMap((node) => node.cpeMatch ?? []);
  const affected = [...new Set(matches.flatMap((match) => {
    if (!match.vulnerable || !match.criteria) return [];
    const [, , , rawVendor, rawProduct, rawVersion] = match.criteria.split(/(?<!\\):/);
    const vendor = boundedText(rawVendor?.replace(/_/g, " "), 60);
    const product = boundedText(rawProduct?.replace(/_/g, " "), 100);
    if (!product || /^[*-]$/.test(product)) return [];
    const name = vendor && !/^[*-]$/.test(vendor) && !product.startsWith(vendor) ? `${vendor} ${product}` : product;
    const start = match.versionStartIncluding ? `from ${match.versionStartIncluding}` : match.versionStartExcluding ? `after ${match.versionStartExcluding}` : "";
    const end = match.versionEndIncluding ? `through ${match.versionEndIncluding}` : match.versionEndExcluding ? `before ${match.versionEndExcluding}` : "";
    const version = start || end ? [start, end].filter(Boolean).join(" ") : rawVersion && !/^[*-]$/.test(rawVersion) ? rawVersion : "";
    return [boundedText([name, version].filter(Boolean).join(" "), 160) ?? name];
  }))].slice(0, 12);
  return {
    nvdUrl: `https://nvd.nist.gov/vuln/detail/${record.id}`,
    ...(severity ? { severity } : {}),
    ...(typeof score === "number" && score >= 0 && score <= 10 ? { cvssScore: score } : {}),
    ...(affected.length ? { affected } : {}),
  };
}

export async function enrichVulnerabilities(items: RealIntelligenceItem[], fetcher: typeof fetch, cacheDirectory?: string): Promise<RealIntelligenceItem[]> {
  const fetchCached = <T>(url: string, age = 24 * HOUR) => cachedJson(cacheDirectory, url, age, () => fetchJson<T>(url, fetcher));
  const cyber = items.filter((item) => item.metadata.type === "cyber");
  const idsForItem = new Map(cyber.map((item) => [item.id, item.metadata.type === "cyber"
    ? item.metadata.cveIds ?? extractCveIds(`${item.title} ${item.summary}`) : []]));
  const allIds = [...new Set([...idsForItem.values()].flat())];
  if (!allIds.length) return items;

  // Prefer single-vulnerability reports when allocating the bounded CVE lookups.
  const singleIds = [...idsForItem.values()].filter((ids) => ids.length === 1).flat();
  const lookupIds = [...new Set([...singleIds, ...allIds])].slice(0, MAX_CVE_LOOKUPS);
  const [kev, epss, nvd, cveRecords] = await Promise.all([
    fetchCached<{ vulnerabilities?: KevRow[] }>(KEV_FEED, HOUR),
    fetchCached<{ data?: EpssRow[] }>(`${EPSS_API}?cve=${lookupIds.join(",")}`, 4 * HOUR),
    Promise.all(Array.from({ length: Math.ceil(lookupIds.length / 10) }, (_, index) => {
      const ids = lookupIds.slice(index * 10, index * 10 + 10);
      return fetchCached<{ vulnerabilities?: Array<{ cve: NvdCve }> }>(`${NVD_API}?cveIds=${ids.join(",")}`);
    })),
    (async () => {
      const records = new Map<string, VulnerabilityEvidence>();
      for (let start = 0; start < lookupIds.length; start += 8) {
        const group = lookupIds.slice(start, start + 8);
        const results = await Promise.all(group.map(async (id) => cveEvidence(id, await fetchCached<CveRecord>(`${CVE_API}/${id}`))));
        for (const result of results) if (result) records.set(result.id, result);
      }
      return records;
    })(),
  ]);

  const wanted = new Set(allIds);
  for (const { cve } of nvd.flatMap((page) => Array.isArray(page?.vulnerabilities) ? page.vulnerabilities : [])) {
    if (!cve?.id || !wanted.has(cve.id) || cve.vulnStatus === "Rejected") continue;
    cveRecords.set(cve.id, { ...cveRecords.get(cve.id), ...nvdEvidence(cve), id: cve.id });
  }
  for (const row of Array.isArray(kev?.vulnerabilities) ? kev.vulnerabilities : []) {
    const id = row.cveID;
    if (!id || !wanted.has(id) || !validDay(row.dateAdded)) continue;
    cveRecords.set(id, { ...cveRecords.get(id), id, kev: {
      url: KEV_CATALOG, dateAdded: row.dateAdded,
      ...(validDay(row.dueDate) ? { dueDate: row.dueDate } : {}), action: boundedText(row.requiredAction),
    } });
  }
  for (const row of Array.isArray(epss?.data) ? epss.data : []) {
    const id = row.cve;
    const probability = row.epss?.length ? Number(row.epss) : Number.NaN;
    if (!id || !wanted.has(id) || !validDay(row.date) || !(probability >= 0 && probability <= 1)) continue;
    cveRecords.set(id, { ...cveRecords.get(id), id, epss: { probability, date: row.date, url: `${EPSS_API}?cve=${id}` } });
  }
  for (const id of wanted) {
    const advisory = REVIEWED_ADVISORIES[id];
    if (advisory) cveRecords.set(id, { ...advisory, ...cveRecords.get(id) });
  }

  return items.map((item) => {
    const cveIds = idsForItem.get(item.id);
    if (item.metadata.type !== "cyber" || !cveIds?.length) return item;
    const vulnerabilities = cveIds.flatMap((id) => cveRecords.get(id) ?? []);
    // A score or action for one CVE must never be presented as applying to an entire roll-up.
    const single = cveIds.length === 1 ? vulnerabilities[0] : undefined;
    const completeSeverity = vulnerabilities.length === cveIds.length && vulnerabilities.every((vulnerability) => vulnerability.severity)
      ? [...SEVERITIES].reverse().find((level) => vulnerabilities.some(({ severity }) => severity === level)) : undefined;
    const severity = item.metadata.severity && item.metadata.severity !== "Unknown" ? item.metadata.severity : completeSeverity;
    return { ...item, metadata: {
      ...item.metadata, cveIds, vulnerabilities,
      severity: severity ?? "Unknown",
      affected: item.metadata.affected || single?.affected?.join(" | "),
      action: item.metadata.action || single?.kev?.action || single?.action,
      advisoryUrl: item.metadata.advisoryUrl || single?.vendorUrl,
      dueDate: item.metadata.dueDate || single?.kev?.dueDate,
    } };
  });
}
