import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { SITE_BASE_PATH, SITE_ORIGIN } from "../lib/story-links.ts";

const directory = resolve("out");
const files = await readdir(directory, { recursive: true, withFileTypes: true });
const checked = new Map();
const broken = [];

async function exists(file) {
  if (!checked.has(file)) checked.set(file, stat(file).then((info) => info.isFile()).catch(() => false));
  return checked.get(file);
}

for (const file of files.filter((entry) => entry.isFile() && entry.name.endsWith(".html"))) {
  const path = resolve(file.parentPath, file.name);
  const page = path.slice(directory.length + 1).replaceAll("\\", "/");
  const html = await readFile(path, "utf8");
  for (const [, raw] of html.matchAll(/\b(?:href|src)="([^" ]+)"/gi)) {
    if (raw.startsWith("#")) continue;
    const url = new URL(raw.replaceAll("&amp;", "&"), `${SITE_ORIGIN}${SITE_BASE_PATH}/${page}`);
    if (url.origin !== SITE_ORIGIN || (SITE_BASE_PATH && !url.pathname.startsWith(`${SITE_BASE_PATH}/`))) continue;
    const relative = decodeURIComponent(url.pathname.slice(SITE_BASE_PATH.length + 1));
    const target = resolve(directory, relative);
    if (!await exists(target) && !await exists(resolve(target, "index.html"))) broken.push(`${page} → ${raw}`);
  }
}

if (broken.length) {
  console.error([...new Set(broken)].join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Verified ${checked.size} exported internal files and route candidates.`);
}
