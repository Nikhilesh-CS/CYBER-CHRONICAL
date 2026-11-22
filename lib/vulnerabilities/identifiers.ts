export function extractCveIds(text: string): string[] {
  return [...new Set([...text.matchAll(/\bCVE-\d{4}-\d{4,19}\b/gi)].map(([id]) => id.toUpperCase()))].sort();
}
