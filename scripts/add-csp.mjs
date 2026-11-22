import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const directory = resolve("out");
const files = await readdir(directory, { recursive: true });
for (const file of files.filter((name) => name.endsWith(".html"))) {
  const path = join(directory, file);
  const html = await readFile(path, "utf8");
  const inlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes, body]) => body && !/(?:^|\s)src\s*=/i.test(attributes))
    .map(([, , body]) => `'sha256-${createHash("sha256").update(body.replace(/\r\n?/g, "\n")).digest("base64")}'`);
  const policy = [
    "default-src 'none'",
    `script-src 'self' ${[...new Set(inlineScripts)].join(" ")}`.trimEnd(),
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}">`;
  const marker = /<head\b[^>]*>(?:\s*<meta\b[^>]*\bcharset=[^>]*>)?/i;
  if (!marker.test(html)) throw new Error(`Could not locate a document head in ${file}`);
  await writeFile(path, html.replace(marker, (head) => `${head}${meta}`), "utf8");
}
