import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { plainTitle, isFutureDatedStory } from "../lib/editorial.ts";
import { beginnerExplanation } from "../lib/explanations.ts";
import { isCyberStory } from "../lib/reader.ts";
import { SITE_BASE_PATH, SITE_ORIGIN, storyShareUrl, storyPath } from "../lib/story-links.ts";

const dataDirectory = resolve(process.env.NEWS_DATA_DIR || "public/data");
const feedDirectory = process.argv.includes("--export") ? resolve("out") : dirname(dataDirectory);
const edition = JSON.parse(await readFile(resolve(dataDirectory, "news.json"), "utf8"));
const home = `${SITE_ORIGIN}${SITE_BASE_PATH}/`;
const generatedAt = Date.parse(edition.generatedAt);
const escape = (value = "") => String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/[&<>"']/g,
  (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]);
const stories = edition.items.filter((item) => !isFutureDatedStory(item, generatedAt))
  .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
const cyber = stories.filter(isCyberStory);

async function writeFeed(file, title, entries) {
  const items = entries.slice(0, 50).map((entry) => [
    "<item>", `<title>${escape(entry.title)}</title>`,
    `<link>${escape(entry.url)}</link>`, `<guid isPermaLink="false">${escape(entry.id)}</guid>`,
    `<pubDate>${new Date(entry.publishedAt).toUTCString()}</pubDate>`,
    `<description>${escape(entry.description)}</description>`, "</item>",
  ].join("")).join("\n");
  const output = resolve(feedDirectory, file);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${escape(title)}</title><link>${escape(home)}</link><description>Source-linked cybersecurity news and reviewed reports.</description><language>en-IN</language>\n${items}\n</channel></rss>\n`);
}

const asFeedEntries = (items) => items.map((item) => ({
  title: plainTitle(item), id: item.id, publishedAt: item.publishedAt,
  url: storyShareUrl(item), description: beginnerExplanation(item),
}));

await writeFeed("feed.xml", "Cyber Chronicle", asFeedEntries(cyber));
await writeFeed("feeds/general.xml", "Cyber Chronicle General News", asFeedEntries(stories.filter((item) => !isCyberStory(item))));
const categories = [...new Set(stories.flatMap((item) => item.categories))];
for (const category of categories) {
  if (!/^[a-z]+$/.test(category)) continue;
  await writeFeed(`feeds/category-${category}.xml`, `Cyber Chronicle ${category}`, asFeedEntries(stories.filter((item) => item.categories.includes(category))));
}
for (const severity of ["Critical", "High", "Medium", "Low", "Unknown"]) {
  await writeFeed(`feeds/severity-${severity.toLowerCase()}.xml`, `Cyber Chronicle ${severity} severity`, asFeedEntries(cyber.filter((item) => item.metadata.severity === severity)));
}
const digestEntries = [1, 7].map((days) => {
  const coverage = cyber.filter((item) => Date.parse(item.publishedAt) > generatedAt - days * 86_400_000).slice(0, days === 1 ? 6 : 15);
  const title = days === 1 ? "Daily Cyber Digest" : "Weekly Cyber Digest";
  return { title, id: `${days}:${edition.generatedAt.slice(0, 10)}`, url: `${home}digest/`, publishedAt: edition.generatedAt,
    description: coverage.length ? coverage.map((item) => `${plainTitle(item)} (${SITE_ORIGIN}${storyPath(item)})`).join("\n") : "No cybersecurity stories in this window." };
});
await writeFeed("feeds/digest.xml", "Cyber Chronicle Digests", digestEntries);
