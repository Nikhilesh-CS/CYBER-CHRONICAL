import type { RealIntelligenceItem } from "./models.ts";
import { isRecord, isStoryId, readStoredJson } from "./storage.ts";
import { isCveId } from "./vulnerabilities/identifiers.ts";

export const SAVED_ARCHIVE_KEY = "cyber-chronicle-saved-archive";

export function isCyberStory(item: RealIntelligenceItem) {
  return item.metadata.type === "cyber" || item.categories.includes("cyber");
}

export function matchesStoryId(item: RealIntelligenceItem, id: string) {
  return item.id === id || Boolean(item.aliases?.includes(id));
}

export function isSavedStory(item: RealIntelligenceItem, saved: string[]) {
  return saved.some((id) => matchesStoryId(item, id));
}

export function readSavedArchive(storage: Pick<Storage, "getItem">): RealIntelligenceItem[] {
  const records = readStoredJson(storage, SAVED_ARCHIVE_KEY);
  return Array.isArray(records) ? records.slice(0, 200).filter(isArchivedStory) : [];
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function optionalStrings(record: Record<string, unknown>, fields: string[]) {
  return fields.every((key) => record[key] === undefined || typeof record[key] === "string");
}

function isVulnerabilityRecord(value: unknown) {
  if (!isRecord(value) || !isCveId(value.id)
    || !optionalStrings(value, ["severity", "action", "cveUrl", "nvdUrl", "vendorUrl"])
    || (value.affected !== undefined && !stringArray(value.affected))
    || (value.cvssScore !== undefined && (typeof value.cvssScore !== "number" || !(value.cvssScore >= 0 && value.cvssScore <= 10)))) return false;
  const { kev, epss } = value;
  return (kev === undefined || (isRecord(kev) && typeof kev.url === "string" && typeof kev.dateAdded === "string" && optionalStrings(kev, ["action", "dueDate"])))
    && (epss === undefined || (isRecord(epss) && typeof epss.url === "string" && typeof epss.date === "string"
      && typeof epss.probability === "number" && epss.probability >= 0 && epss.probability <= 1));
}

function isArchivedStory(value: unknown): value is RealIntelligenceItem {
  if (!isRecord(value) || !isStoryId(value.id)) return false;
  const fields = ["title", "summary", "studentSummary", "sourceId", "publishedAt", "updatedAt", "primaryPublisher"];
  if (!fields.every((key) => typeof value[key] === "string") || !optionalStrings(value, ["domain", "state", "imageUrl", "summarySource"])) return false;
  if (typeof value.region !== "string" || !["india", "global", "regional"].includes(value.region)
    || typeof value.verificationStatus !== "string" || !["official", "corroborated", "single-source"].includes(value.verificationStatus)
    || typeof value.storyState !== "string" || !["confirmed", "developing"].includes(value.storyState)
    || typeof value.confidence !== "string" || !["High", "Medium", "Low"].includes(value.confidence)
    || typeof value.independentSourceCount !== "number" || !Number.isSafeInteger(value.independentSourceCount)
    || !["categories", "references", "knownFacts", "unknowns"].every((key) => stringArray(value[key]))
    || (value.aliases !== undefined && (!Array.isArray(value.aliases) || !value.aliases.every(isStoryId)))) return false;
  const { evidence, metadata } = value;
  if (!Array.isArray(evidence) || !evidence.every((entry) => isRecord(entry)
    && ["publisher", "category", "url", "publishedAt", "dependencyGroup"].every((key) => typeof entry[key] === "string")
    && typeof entry.trustTier === "number" && [1, 2, 3, 4].includes(entry.trustTier)
    && optionalStrings(entry, ["sourceId"]))) return false;
  return isRecord(metadata) && (metadata.type === "general" || (metadata.type === "cyber"
    && optionalStrings(metadata, ["severity", "identifier", "affected", "action", "dueDate", "advisoryUrl"])
    && (metadata.cveIds === undefined || (Array.isArray(metadata.cveIds) && metadata.cveIds.every(isCveId)))
    && (metadata.vulnerabilities === undefined || (Array.isArray(metadata.vulnerabilities) && metadata.vulnerabilities.every(isVulnerabilityRecord)))));
}

export function savedStories(current: RealIntelligenceItem[], archive: RealIntelligenceItem[], ids: string[]) {
  const stories = current.filter((item) => isSavedStory(item, ids));
  const knownIds = new Set(stories.flatMap((item) => [item.id, ...item.aliases ?? []]));
  return [...stories, ...archive.filter((item) => !knownIds.has(item.id) && isSavedStory(item, ids))];
}
