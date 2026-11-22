import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { buildStorySearchIndex, formatDate, plainTitle, verificationLabel } from "../lib/editorial.ts";
import { beginnerExplanation } from "../lib/explanations.ts";
import { SITE_BASE_PATH, SITE_ORIGIN, cvePath, storyPath, storySlug } from "../lib/story-links.ts";
import { extractCveIds } from "../lib/vulnerabilities/identifiers.ts";

const { items, generatedAt } = JSON.parse(await readFile("public/data/news.json", "utf8"));
const home = `${SITE_BASE_PATH}/`;
const image = `${SITE_ORIGIN}${SITE_BASE_PATH}/og.png`;
const cveIndex = new Map();
const written = new Set();
const css = "html{color-scheme:light;font:16px/1.6 system-ui,sans-serif;background:#f7f5ef;color:#151718}main{max-width:810px;margin:0 auto;padding:24px 20px 80px}h1,h2{font-family:Georgia,serif;line-height:1.15}h1{font-size:clamp(34px,6vw,60px);margin-bottom:12px}section{border-top:1px solid #b8b5ac;margin-top:24px}a{color:#07554f;overflow-wrap:anywhere}a:focus-visible{outline:2px solid #08766f;outline-offset:3px}.known{font-weight:700;color:#a3202a}@media(prefers-color-scheme:dark){html{color-scheme:dark;background:#101313;color:#f3f1e9}a{color:#93ded5}.known{color:#ff8e97}}";
const escaped = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const link = (url, label) => `<a href="${escaped(url)}">${escaped(label)}</a>`;
const list = (entries) => `<ul>${entries.map((entry) => `<li>${entry}</li>`).join("")}</ul>`;
const section = (title, content) => `<section><h2>${escaped(title)}</h2>${content}</section>`;
const httpsOnly = (value) => typeof value === "string" && /^https:\/\//i.test(value);

async function page(path, title, description, body, { canonical = path, article = false } = {}) {
  const file = resolve("out", path.slice(SITE_BASE_PATH.length + 1), "index.html");
  if (written.has(file)) throw new Error(`Duplicate exported route ${path}`);
  written.add(file);
  const fullTitle = `${title} | Cyber Chronicle`;
  const fullUrl = `${SITE_ORIGIN}${canonical}`;
  const tags = [
    ["og:title", fullTitle], ["og:description", description], ["og:url", fullUrl],
    ["og:type", article ? "article" : "website"], ["og:image", image],
  ].map(([property, content]) => `<meta property="${property}" content="${escaped(content)}">`).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escaped(fullTitle)}</title><meta name="description" content="${escaped(description)}"><link rel="canonical" href="${escaped(fullUrl)}">${tags}<meta name="twitter:card" content="summary_large_image"><style>${css}</style></head><body><main>${link(home, "Cyber Chronicle home")}<h1>${escaped(title)}</h1>${body}</main></body></html>`;
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
}

for (const item of items) {
  const cyber = item.metadata.type === "cyber" ? item.metadata : undefined;
  const ids = cyber ? extractCveIds((cyber.cveIds ?? extractCveIds(`${item.title} ${item.summary}`)).join(" ")) : [];
  for (const id of ids) {
    const coverage = cveIndex.get(id) ?? [];
    coverage.push(item);
    cveIndex.set(id, coverage);
  }
  const explanation = beginnerExplanation(item);
  const body = [
    `<p>${escaped(item.primaryPublisher)} · <time datetime="${escaped(item.publishedAt)}">${escaped(formatDate(item.publishedAt))}</time> · ${escaped(verificationLabel(item))}</p>`,
    section("What happened", `<p>${escaped(explanation)}</p>`),
    cyber?.affected && !/^(?:check the linked source|specified in the official)/i.test(cyber.affected) ? section("Affected products", list(cyber.affected.split(" | ").map(escaped))) : "",
    cyber?.action ? section("Official mitigation guidance", `<p>${escaped(cyber.action)}</p>`) : "",
    section("Original evidence", list(item.evidence.filter((record) => httpsOnly(record.url)).map((record) => link(record.url, record.publisher)))),
    ids.length ? section("Vulnerability records", list(ids.map((id) => link(cvePath(id), id)))) : "",
  ].join("");
  await page(storyPath(item), plainTitle(item), explanation.slice(0, 220), body, { article: true });
  for (const alias of item.aliases ?? []) {
    const path = `${SITE_BASE_PATH}/stories/${storySlug(alias)}/`;
    if (!written.has(resolve("out", path.slice(SITE_BASE_PATH.length + 1), "index.html"))) {
      await page(path, plainTitle(item), explanation.slice(0, 220), body, { canonical: storyPath(item), article: true });
    }
  }
}

for (const [id, stories] of cveIndex) {
  const record = stories.flatMap(({ metadata }) => metadata.vulnerabilities ?? []).find((entry) => entry.id === id);
  const facts = [
    `<p>Severity ${escaped(record?.severity ?? "unknown")}${record?.cvssScore !== undefined ? ` · CVSS ${escaped(record.cvssScore)}/10` : ""}</p>`,
    `<p>${record?.kev && httpsOnly(record.kev.url) ? `<strong class="known">Known exploitation</strong> · ${link(record.kev.url, "CISA KEV")} · Added ${escaped(formatDate(record.kev.dateAdded))}` : "KEV match unavailable in this edition."}</p>`,
    `<p>${record?.epss && httpsOnly(record.epss.url) ? link(record.epss.url, `EPSS estimates ${(record.epss.probability * 100).toFixed(2)}% likelihood in 30 days · ${formatDate(record.epss.date)}`) : "EPSS score unavailable in this edition."}</p>`,
    record?.affected?.length ? section("Affected products", list(record.affected.map(escaped))) : "",
    record?.kev?.action || record?.action ? section("Official mitigation guidance", `<p>${escaped(record.kev?.action || record.action)}</p>`) : "",
    section("Reference records", list([
      link(`https://www.cve.org/CVERecord?id=${id}`, "CVE record"),
      ...(httpsOnly(record?.nvdUrl) ? [link(record.nvdUrl, "NVD record")] : []),
      ...(httpsOnly(record?.vendorUrl) ? [link(record.vendorUrl, "Vendor advisory")] : []),
    ])),
    section("Cyber Chronicle coverage", list(stories.map((story) => `${link(storyPath(story), plainTitle(story))} · ${escaped(story.primaryPublisher)}`))),
  ].join("");
  await page(cvePath(id), id, `Source-linked vulnerability evidence and Cyber Chronicle coverage for ${id}.`, facts);
}

await writeFile("out/data/search.json", JSON.stringify(buildStorySearchIndex(generatedAt, items)));
console.log(`Exported ${written.size} story and CVE pages with share metadata.`);
