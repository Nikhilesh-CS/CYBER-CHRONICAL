import type { RealIntelligenceItem } from "./models.ts";

export const STACK_PRODUCTS = ["Windows", "Android", "Chrome", "WordPress", "iOS", "macOS", "Linux", "Firefox", "Git", "Docker", "Kubernetes", "VMware", "SharePoint"] as const;
export type StackProduct = typeof STACK_PRODUCTS[number];

export function normalizeWatchlist(value: unknown): StackProduct[] {
  return Array.isArray(value) ? STACK_PRODUCTS.filter((product) => value.includes(product)) : [];
}

export function matchingProducts(item: RealIntelligenceItem, watchlist: readonly StackProduct[]) {
  if (item.metadata.type !== "cyber" || watchlist.length === 0) return [];
  const affected = [item.metadata.affected, ...(item.metadata.vulnerabilities ?? []).flatMap(({ affected }) => affected ?? [])].join(" ");
  const text = ` ${affected.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  return watchlist.filter((product) => text.includes(` ${product.toLowerCase()} `));
}

export function readReaderBackup(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("This file is not a Cyber Chronicle backup.");
  const data = input as { version?: unknown; saved?: unknown; watchlist?: unknown };
  if (data.version !== 1 || !Array.isArray(data.saved) || !Array.isArray(data.watchlist)
      || data.saved.length > 2_000 || !data.saved.every((id) => typeof id === "string" && id.length > 0 && id.length <= 1_000)) {
    throw new Error("This Cyber Chronicle backup is invalid or unsupported.");
  }
  return { saved: [...new Set<string>(data.saved)], watchlist: normalizeWatchlist(data.watchlist) };
}
