import type { RealIntelligenceItem } from "./models.ts";

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
  try {
    const records: unknown = JSON.parse(storage.getItem(SAVED_ARCHIVE_KEY) || "[]");
    return Array.isArray(records) ? records.filter((item) => typeof item?.id === "string" && Array.isArray(item.evidence) && item.metadata) : [];
  } catch { return []; }
}

export function savedStories(current: RealIntelligenceItem[], archive: RealIntelligenceItem[], ids: string[]) {
  const stories = current.filter((item) => isSavedStory(item, ids));
  const knownIds = new Set(stories.flatMap((item) => [item.id, ...item.aliases ?? []]));
  return [...stories, ...archive.filter((item) => !knownIds.has(item.id) && isSavedStory(item, ids))];
}
