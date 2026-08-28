import assert from "node:assert/strict";
import test from "node:test";
import { resolveState } from "../lib/geo/resolveState.ts";
import {
  DEFAULT_PREFERENCES,
  LEGACY_NOTIFICATION_PREFERENCES_KEY,
  PREFERENCES_KEY,
  loadPreferences,
  meetsSeverityFloor,
  normalizePreferences,
} from "../lib/preferences.ts";
import { rankForReader } from "../lib/intelligence/client.ts";

test("offline state resolution identifies representative Indian capitals", () => {
  assert.equal(resolveState(28.6139, 77.2090), "Delhi");
  assert.equal(resolveState(12.9716, 77.5946), "Karnataka");
  assert.equal(resolveState(19.0760, 72.8777), "Maharashtra");
  assert.equal(resolveState(13.0827, 80.2707), "Tamil Nadu");
  assert.equal(resolveState(11.0168, 76.9558), "Tamil Nadu");
  assert.equal(resolveState(11.6234, 92.7265), "Andaman and Nicobar Islands");
  assert.equal(resolveState(51.5072, -0.1276), null);
  assert.equal(resolveState(Number.NaN, 77), null);
});

test("combined preferences migrate the previous notification-only key", () => {
  const values = new Map([[LEGACY_NOTIFICATION_PREFERENCES_KEY, JSON.stringify({ generalNews: true, criticalAlerts: false })]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const preferences = loadPreferences(storage);
  assert.equal(preferences.notifications.generalNews, true);
  assert.equal(preferences.notifications.criticalAlerts, false);
  assert.equal(preferences.enabledDomains.length, DEFAULT_PREFERENCES.enabledDomains.length);
  assert.ok(values.has(PREFERENCES_KEY));
  assert.equal(values.has(LEGACY_NOTIFICATION_PREFERENCES_KEY), false);
});

test("preference normalization prevents an accidentally empty domain feed", () => {
  const normalized = normalizePreferences({ enabledDomains: [], severityFloor: "critical", followedState: "Karnataka" });
  assert.deepEqual(normalized.enabledDomains, DEFAULT_PREFERENCES.enabledDomains);
  assert.equal(normalized.severityFloor, "critical");
  assert.equal(normalized.followedState, "Karnataka");
  assert.equal(normalizePreferences({ followedState: "Not a real state" }).followedState, null);
  assert.equal(meetsSeverityFloor("Critical", "critical"), true);
  assert.equal(meetsSeverityFloor("High", "critical"), false);
  assert.equal(meetsSeverityFloor(undefined, "high"), false);
});

test("followed state boosts matching stories inside the existing ranking pipeline", () => {
  const item = (id, state) => ({
    id,
    sourceId: "test",
    title: `CC-TEST: ${id}`,
    summary: "Regional update",
    studentSummary: "Regional update",
    primaryPublisher: "Test",
    publishedAt: "2026-08-28T10:00:00.000Z",
    updatedAt: "2026-08-28T10:00:00.000Z",
    categories: ["india"],
    region: "india",
    independentSourceCount: 1,
    verificationStatus: "single-source",
    storyState: "developing",
    confidence: "Medium",
    evidence: [],
    references: [],
    knownFacts: [],
    unknowns: [],
    metadata: { type: "general" },
    state,
  });
  const ranked = rankForReader([item("other", "Delhi"), item("local", "Karnataka")], null, null, "Karnataka");
  assert.equal(ranked[0].id, "local");
});
