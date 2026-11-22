import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { SITE_BASE_PATH } from "../lib/story-links.ts";

const root = resolve("out");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".xml": "application/rss+xml", ".webmanifest": "application/manifest+json", ".txt": "text/plain" };

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    if (!url.pathname.startsWith(`${SITE_BASE_PATH}/`)) throw new Error("Outside the export base path");
    const relative = decodeURIComponent(url.pathname.slice(SITE_BASE_PATH.length + 1));
    const target = resolve(root, relative, !extname(relative.replace(/\/$/, "")) ? "index.html" : "");
    if (!target.startsWith(`${root}${sep}`)) throw new Error("Outside the export directory");
    const body = await readFile(target);
    response.writeHead(200, { "Content-Type": `${mime[extname(target)] || "application/octet-stream"}` });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(4173, "127.0.0.1", () => console.log("Export ready"));
