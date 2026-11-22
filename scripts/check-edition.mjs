import { readFile, appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getSourceDefinitions } from "../lib/sources.ts";

const now = Date.now();
const directory = process.env.NEWS_DATA_DIR || "public/data";
const edition = JSON.parse(await readFile(resolve(directory, "news.json"), "utf8"));
const age = now - Date.parse(edition.lastSuccessfulAt);
const sources = new Map(edition.sources.map((source) => [source.id, source]));
const tierOne = getSourceDefinitions(new Date(now).getUTCFullYear()).filter((source) => source.enabled && source.trustTier === 1);
const unavailable = tierOne.filter(({ id }) => sources.get(id)?.status !== "current");
const cyber = edition.items.filter((item) => item.metadata.type === "cyber");
const hasSeverity = (item) => ["Critical", "High", "Medium", "Low"].includes(item.metadata.severity);
const withCve = cyber.filter((item) => item.metadata.cveIds?.length);
const severityCount = withCve.filter(hasSeverity).length;
const errors = [];

if (!Number.isFinite(age) || age > 24 * 60 * 60 * 1_000 || age < -5 * 60_000) errors.push("The edition timestamp is missing, invalid, or older than 24 hours.");
if (!cyber.some(hasSeverity)) errors.push("The edition has no cybersecurity stories with a recorded severity.");
for (const { id, name } of unavailable) errors.push(`${name}: ${sources.get(id)?.error || "No current source record"}`);

const report = [
  `Tier-1 sources current: ${tierOne.length - unavailable.length}/${tierOne.length}.`,
  `CVE stories with recorded severity: ${severityCount}/${withCve.length}.`,
  ...errors.map((error) => `- ${error}`),
].join("\n");
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Edition source and data health\n\n${report}\n`);
if (errors.length) process.exitCode = 1;
