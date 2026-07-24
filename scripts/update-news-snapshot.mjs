import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { getRealIntelligence } from "../lib/news.ts";

const outputPath = resolve("public/data/news.json");
const temporaryPath = `${outputPath}.tmp`;

async function readPreviousEdition() {
  try {
    return JSON.parse(await readFile(outputPath, "utf8"));
  } catch {
    return null;
  }
}

const previous = await readPreviousEdition();

try {
  const edition = await getRealIntelligence(new Date(), { force: true });
  if (!Array.isArray(edition.items) || edition.items.length === 0) {
    throw new Error("No reviewed source records were returned");
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(edition, null, 2)}\n`, "utf8");
  await rename(temporaryPath, outputPath);
  console.log(`Saved ${edition.items.length} reviewed records from ${edition.sources.length} sources.`);
} catch (error) {
  if (!previous?.items?.length) throw error;
  console.warn(`Refresh failed; keeping the previous ${previous.items.length}-record edition.`);
  console.warn(error instanceof Error ? error.message : String(error));
}
