import type { SourceDefinition } from "../sources.ts";
import { buildFeedItems } from "./rss.ts";
import { decodeHtml } from "./utils.ts";

export function parseOfficialPressListing(html: string, definition: SourceDefinition) {
  const records: { title: string; link: string; publishedRaw: string }[] = [];
  const pib = definition.pressListing === "pib";
  const sebi = definition.pressListing === "sebi";
  const entries = pib ? html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi) : html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi);

  for (const [, entry] of entries) {
    const article = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'](?:"[^"]*"|'[^']*'|[^'">])*>([\s\S]*?)<\/a>/i.exec(entry);
    const date = (pib ? /Posted\s+on:\s*(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/i
      : sebi ? /<td\b[^>]*>\s*([A-Za-z]{3}\s+\d{1,2},\s*\d{4})\s*<\/td>/i
      : /<td\b[^>]*\bclass\s*=\s*["']date\d{4}["'][^>]*>([\s\S]*?)<\/td>/i).exec(entry)?.[1];
    if (!article || !date || (pib && !/\bPRID=\d+/i.test(article[1]))) continue;

    const title = decodeHtml(article[2].split(/<a\b/i, 1)[0]);
    let link: string;
    try { link = new URL(article[1].replace(/&amp;/gi, "&"), definition.siteUrl).toString(); }
    catch { continue; }
    const publishedRaw = `${decodeHtml(date)} 00:00:00 GMT+0530`;
    if (title && Number.isFinite(Date.parse(publishedRaw))) records.push({ title, link, publishedRaw });
  }

  records.sort((left, right) => Date.parse(right.publishedRaw) - Date.parse(left.publishedRaw));
  const items = buildFeedItems(records, { ...definition, feedSummaryPolicy: "metadata-only" });
  if (!items.length) throw new Error(`Invalid upstream schema: no ${definition.publisher} press releases`);
  return items;
}
