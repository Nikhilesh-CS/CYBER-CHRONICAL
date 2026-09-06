import assert from "node:assert/strict";
import test from "node:test";
import { breakingScore, intelligencePriority, isBreakingStory, isFutureDatedStory } from "../lib/editorial.ts";
import { buildIntelligenceIndex, cosineSimilarity, lexicalVector, relatedStoryIds } from "../lib/intelligence/semantic-engine.mjs";
import { learnFromStory, rankForReader } from "../lib/intelligence/client.ts";

function item(id, title, overrides = {}) {
  return {
    id,
    title,
    summary: title,
    studentSummary: title,
    primaryPublisher: "Test Publisher",
    publishedAt: "2026-08-28T10:00:00.000Z",
    updatedAt: "2026-08-28T10:00:00.000Z",
    categories: ["cyber"],
    independentSourceCount: 1,
    verificationStatus: "single-source",
    confidence: "Medium",
    metadata: { type: "cyber", severity: "High" },
    ...overrides,
  };
}

test("breaking score decays and expires after two hours", () => {
  const story = item("critical", "Critical zero-day", { metadata: { type: "cyber", severity: "Critical" }, verificationStatus: "official" });
  const freshNow = Date.parse("2026-08-28T10:20:00.000Z");
  assert.equal(isBreakingStory(story, freshNow), true);
  assert.ok(breakingScore(story, freshNow) > 70);
  assert.equal(isBreakingStory(story, Date.parse("2026-08-28T12:01:00.000Z")), false);
});

test("ordinary recent news is not mislabeled breaking", () => {
  const story = item("general", "Company publishes annual report", { metadata: { type: "general" } });
  assert.equal(isBreakingStory(story, Date.parse("2026-08-28T10:10:00.000Z")), false);
});

test("event promotions do not take the lead over reported news", () => {
  const event = item("event", "[Virtual Event] What Every Enterprise Should Know", { metadata: { type: "general" }, confidence: "Medium" });
  const report = item("report", "Security researchers disclose an active vulnerability", { metadata: { type: "cyber", severity: "High" } });
  assert.ok(intelligencePriority(report) > intelligencePriority(event));
  assert.equal(isBreakingStory(event, Date.parse("2026-08-28T10:10:00.000Z")), false);
});

test("future-dated event stories are withheld until their announced date", () => {
  const event = item("future", "[Virtual Event] Cloud Security — November 12, 2026", { metadata: { type: "general" } });
  assert.equal(isFutureDatedStory(event, Date.parse("2026-09-06T10:00:00.000Z")), true);
  assert.equal(isFutureDatedStory(event, Date.parse("2026-11-13T10:00:00.000Z")), false);
});

test("semantic index reuses vectors and connects nearest stories", async () => {
  const items = [item("a", "Chrome zero-day exploit"), item("b", "Browser vulnerability exploited"), item("c", "Space telescope image")];
  const vectors = [[1, 0, 0], [0.95, 0.05, 0], [0, 0, 1]];
  const index = await buildIntelligenceIndex(items, null, { embed: async () => vectors });
  assert.deepEqual(index.stories.a.relatedIds, ["b"]);
  assert.deepEqual(index.stories.c.relatedIds, []);

  let embedded = false;
  const reused = await buildIntelligenceIndex(items, index, { embed: async () => { embedded = true; return vectors; } });
  assert.equal(embedded, false);
  assert.deepEqual(reused.stories.a.vector, index.stories.a.vector);
});

test("local lexical fallback produces normalized comparable vectors", () => {
  const left = lexicalVector("ransomware attack hospital systems");
  const right = lexicalVector("hospital ransomware incident");
  assert.equal(left.length, right.length);
  assert.ok(cosineSimilarity(left, right) > cosineSimilarity(left, lexicalVector("space telescope galaxy")));
  const stories = { left: { vector: left }, right: { vector: right } };
  assert.deepEqual(relatedStoryIds("left", stories, 1, 0.1), ["right"]);
});

test("reader interests influence normal ordering without removing editorial scoring", () => {
  const cyber = item("cyber", "Critical browser exploit", { metadata: { type: "cyber", severity: "Critical" }, verificationStatus: "official", confidence: "High" });
  const ai = item("ai", "New artificial intelligence research", { metadata: { type: "general" }, categories: ["ai"] });
  const index = {
    generatedAt: "2026-08-28T10:00:00.000Z",
    model: "test",
    dimensions: 2,
    stories: {
      cyber: { vector: [1, 0] },
      ai: { vector: [0, 1] },
    },
  };
  const profile = learnFromStory(learnFromStory(null, [0, 1]), [0, 1]);
  const ranked = rankForReader([ai, cyber], index, profile);
  assert.equal(ranked[0].id, "cyber", "critical editorial priority must remain above affinity");
  assert.ok(profile.engagementCount >= 2);
});
