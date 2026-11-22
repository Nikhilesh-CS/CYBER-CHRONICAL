import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function cachedJson<T>(directory: string | undefined, key: string, maxAgeMs: number, load: () => Promise<T | undefined>) {
  if (!directory) return load();
  const file = join(directory, `${createHash("sha256").update(key).digest("hex")}.json`);
  try {
    const info = await stat(file);
    if (Date.now() - info.mtimeMs < maxAgeMs && info.size <= 4 * 1024 * 1024) {
      return JSON.parse(await readFile(file, "utf8")) as T;
    }
  } catch {
    // Missing or invalid cache entries are fetched again.
  }
  const data = await load();
  if (data !== undefined) {
    try {
      await mkdir(directory, { recursive: true });
      await writeFile(file, JSON.stringify(data), "utf8");
    } catch {
      // The feed stays available when the cache cannot be written.
    }
  }
  return data;
}
