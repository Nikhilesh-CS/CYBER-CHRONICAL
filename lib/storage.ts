export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function readStoredJson(storage: Pick<Storage, "getItem"> | undefined, key: string): unknown {
  try {
    return JSON.parse(storage?.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

export function isStoryId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 4_096;
}

export function readStoryIds(storage: Pick<Storage, "getItem">, key: string): string[] {
  const value = readStoredJson(storage, key);
  return Array.isArray(value) ? [...new Set(value.filter(isStoryId))] : [];
}

export const READING_SIZES = ["small", "medium", "large"] as const;

export function normalizeReadingSize(value: unknown): typeof READING_SIZES[number] {
  return value === "small" || value === "large" ? value : "medium";
}
