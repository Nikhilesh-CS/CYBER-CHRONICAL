import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { getRealIntelligence } from "../lib/news.ts";
import { computeDomain, computeState } from "../lib/editorial.ts";
import { buildIntelligenceIndex } from "../lib/intelligence/semantic-engine.mjs";

const outputPath = resolve("public/data/news.json");
const temporaryPath = `${outputPath}.tmp`;
const intelligencePath = resolve("public/data/intelligence.json");
const intelligenceTemporaryPath = `${intelligencePath}.tmp`;
const cachedIntelligencePath = resolve(".cache/intelligence/intelligence.json");

async function readPreviousEdition() {
  try {
    return JSON.parse(await readFile(outputPath, "utf8"));
  } catch {
    return null;
  }
}

const previous = await readPreviousEdition();
let previousIntelligence = null;
try {
  try {
    previousIntelligence = JSON.parse(await readFile(cachedIntelligencePath, "utf8"));
  } catch {
    previousIntelligence = JSON.parse(await readFile(intelligencePath, "utf8"));
  }
} catch {
  // The first semantic build has no previous sidecar.
}

try {
  const edition = await getRealIntelligence(new Date(), { force: true });
  if (!Array.isArray(edition.items) || edition.items.length === 0) {
    throw new Error("No reviewed source records were returned");
  }

  const taggedItems = edition.items.map((item) => {
    const state = computeState(item);
    return { ...item, domain: computeDomain(item), ...(state ? { state } : {}) };
  });
  const taggedEdition = { ...edition, items: taggedItems };
  const stateCounts = new Map();
  for (const item of taggedItems) {
    if (item.state) stateCounts.set(item.state, (stateCounts.get(item.state) ?? 0) + 1);
  }

  const intelligence = await buildIntelligenceIndex(taggedItems, previousIntelligence);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(taggedEdition, null, 2)}\n`, "utf8");
  await writeFile(intelligenceTemporaryPath, `${JSON.stringify(intelligence)}\n`, "utf8");
  await rename(temporaryPath, outputPath);
  await rename(intelligenceTemporaryPath, intelligencePath);
  await mkdir(dirname(cachedIntelligencePath), { recursive: true });
  await copyFile(intelligencePath, cachedIntelligencePath);
  console.log(`Saved ${edition.items.length} reviewed records from ${edition.sources.length} sources.`);
  console.log(`[LOCATION] Tagged ${stateCounts.size === 0 ? 0 : taggedItems.filter((item) => item.state).length}/${taggedItems.length} stories across ${stateCounts.size} states/UTs${stateCounts.size > 0 ? `: ${[...stateCounts.entries()].sort((left, right) => right[1] - left[1]).map(([state, count]) => `${state} (${count})`).join(", ")}` : "."}`);
  console.log(`[INTELLIGENCE] Linked ${Object.keys(intelligence.stories).length} stories using ${intelligence.model} (${intelligence.dimensions} dimensions).`);
} catch (error) {
  if (!previous?.items?.length) throw error;
  console.warn(`Refresh failed; keeping the previous ${previous.items.length}-record edition.`);
  console.warn(error instanceof Error ? error.message : String(error));
}
