export function extractCveIds(text: string): string[] {
  return [...new Set([...text.matchAll(/\bCVE-\d{4}-\d{4,19}\b/gi)].map(([id]) => id.toUpperCase()))].sort();
}

export function isCveId(value: unknown): value is string {
  return typeof value === "string" && /^CVE-\d{4}-\d{4,19}$/.test(value);
}
