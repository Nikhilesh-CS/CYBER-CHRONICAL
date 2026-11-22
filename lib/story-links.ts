import type { RealIntelligenceItem } from "./models.ts";

export const SITE_ORIGIN = "https://nikhilesh-cs.github.io";
export const SITE_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/CYBER-CHRONICAL";

export function storySlug(id: string) {
  let first = 2166136261;
  let second = 5381;
  for (let index = 0; index < id.length; index += 1) {
    const code = id.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second, 33) ^ code;
  }
  return `${(first >>> 0).toString(36)}-${(second >>> 0).toString(36)}`;
}

export function storyPath(item: RealIntelligenceItem) {
  return `${SITE_BASE_PATH}/stories/${storySlug(item.id)}/`;
}

export function cvePath(id: string) {
  return `${SITE_BASE_PATH}/cve/${id}/`;
}

export function storyShareUrl(item: RealIntelligenceItem) {
  return `${SITE_ORIGIN}${storyPath(item)}`;
}
