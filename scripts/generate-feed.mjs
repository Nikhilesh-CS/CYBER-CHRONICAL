import fs from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const data = JSON.parse(await fs.readFile(path.join(root, "public/data/news.json"), "utf8"));
const escape = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const items = data.items.slice(0, 50).map((item) => `<item><title>${escape(item.title)}</title><link>${escape(item.sourceUrl || item.url || "https://nikhilesh-cs.github.io/CYBER-CHRONICAL/")}</link><guid isPermaLink="false">${escape(item.id)}</guid><pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate><description>${escape(item.studentSummary || item.summary || "Cyber Chronicle curated report")}</description></item>`).join("");
const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Cyber Chronicle</title><link>https://nikhilesh-cs.github.io/CYBER-CHRONICAL/</link><description>Trusted cybersecurity news, simplified.</description><language>en-IN</language>${items}</channel></rss>`;
await fs.writeFile(path.join(root, "public/feed.xml"), xml);
