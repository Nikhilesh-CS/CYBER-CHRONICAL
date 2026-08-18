export const FETCH_TIMEOUT_MS = 12_000;
export const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;

export function decodeHtml(value: string): string {
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

export function stableHash(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}
