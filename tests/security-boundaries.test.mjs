import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DEFAULT_ACADEMY_PROGRESS, loadCourseProgress } from "../lib/courses/progress.ts";
import { readInterestProfile } from "../lib/intelligence/client.ts";
import { DEFAULT_NAVIGATION_STATE, navigationStateFromUrl, navigationUrl } from "../lib/navigation.ts";
import { parseRssFeed } from "../lib/parsers/rss.ts";
import { loadPreferences, LEGACY_NOTIFICATION_PREFERENCES_KEY, PREFERENCES_KEY } from "../lib/preferences.ts";
import { readSavedArchive } from "../lib/reader.ts";
import { normalizeReadingSize, readStoryIds } from "../lib/storage.ts";
import { reviewedHttpsUrl } from "../lib/urls.ts";

const edition = JSON.parse(await readFile(new URL("../public/data/news.json", import.meta.url), "utf8"));

test("external links require a parsed HTTPS URL and an exact reviewed publisher host at ingestion", () => {
  const host = ["news.example"];
  const valid = "https://news.example/articles/weekly?edition=2&section=cyber";
  assert.equal(reviewedHttpsUrl(valid, host)?.href, valid);
  for (const value of [null, {}, "not a URL", "//news.example/story", "http://news.example/story", "https:///news.example",
    "javascript:", "data:text/plain,hello", "https://name:password@news.example/story", "https://news.example:444/story",
    "https://sub.news.example/story", "https://news.example.example/story", "https://news.\nexample/", "https://news.example\\path"]) {
    assert.equal(reviewedHttpsUrl(value, host), undefined, String(value));
  }
});

test("query parameters are never navigation destinations and internal story links round-trip", () => {
  const url = new URL("https://chronicle.example/CYBER-CHRONICAL/");
  for (const key of ["url", "ref", "redirect", "next", "returnUrl"]) url.searchParams.set(key, "https://publisher.example/");
  assert.deepEqual(navigationStateFromUrl(url), DEFAULT_NAVIGATION_STATE);
  const destination = new URL(navigationUrl(url, { ...DEFAULT_NAVIGATION_STATE, storyId: edition.items[0].id }));
  assert.equal(destination.origin, url.origin);
  assert.equal(destination.pathname, url.pathname);
  assert.equal(navigationStateFromUrl(destination).storyId, edition.items[0].id);
});

test("RSS skips invalid records and keeps encoded markup as article text", () => {
  const source = {
    id: "reviewed", name: "Reviewed", publisher: "Reviewed", region: "global",
    authority: "news", categories: ["cyber"], trustTier: 2,
    allowedHosts: ["news.example"], dependencyGroup: "reviewed", strictFilter: false,
  };
  const rssItem = (link, date = "Wed, 25 Nov 2026 10:00:00 GMT") => `<item><title>&lt;mark&gt;Example headline&lt;/mark&gt;</title><link>${link}</link><pubDate>${date}</pubDate></item>`;
  const result = parseRssFeed(`<rss><channel>${rssItem("https://news.example/report")}${rssItem("https://outside.example/report")}${rssItem("https://news.example/undated", "")}</channel></rss>`, source);
  assert.equal(result.length, 1);
  assert.ok(result[0].title.endsWith("<mark>Example headline</mark>"));
  assert.equal(result[0].evidence[0].url, "https://news.example/report");
});

test("corrupted storage falls back independently and keeps valid saved data", () => {
  const storage = { getItem: () => "{" };
  assert.deepEqual(readStoryIds(storage, "read-alerts"), []);
  assert.deepEqual(readSavedArchive(storage), []);
  assert.equal(readInterestProfile(storage), null);
  assert.deepEqual(loadCourseProgress(storage), DEFAULT_ACADEMY_PROGRESS);
  assert.deepEqual(readStoryIds({ getItem: () => "null" }, "saved"), []);
  assert.deepEqual(readStoryIds({ getItem: () => '["valid",null,3,"valid"]' }, "saved"), ["valid"]);
  assert.equal(normalizeReadingSize({}), "medium");
  assert.equal(normalizeReadingSize("large"), "large");

  const [story] = edition.items;
  const records = [story, { ...story, aliases: {} }, { ...story, metadata: { type: "cyber", vulnerabilities: [null] } }];
  assert.deepEqual(readSavedArchive({ getItem: () => JSON.stringify(records) }), [story]);
  assert.equal(readSavedArchive({ getItem: () => JSON.stringify(edition.items.slice(0, 200)) }).length, 200);
});

test("storage uses typed preferences and retains valid profiles and lesson progress", () => {
  const values = new Map([
    [PREFERENCES_KEY, '{"density":"compact","watchlist":["Chrome",1],"notifications":{"criticalAlerts":"false","generalNews":true,"unknown":true}}'],
    [LEGACY_NOTIFICATION_PREFERENCES_KEY, "{"],
  ]);
  const preferences = loadPreferences({
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  });
  assert.equal(preferences.density, "compact");
  assert.deepEqual(preferences.watchlist, ["Chrome"]);
  assert.equal(preferences.notifications.criticalAlerts, true);
  assert.equal(preferences.notifications.generalNews, true);
  assert.equal(Object.hasOwn(preferences.notifications, "unknown"), false);

  const updatedAt = "2026-11-25T10:00:00.000Z";
  const getStored = (value) => ({ getItem: () => JSON.stringify(value) });
  const profile = { vector: [0.6, 0.8], engagementCount: 2, updatedAt };
  assert.deepEqual(readInterestProfile(getStored(profile)), profile);
  assert.equal(readInterestProfile(getStored({ ...profile, vector: ["0.6", 0.8] })), null);

  const completed = { quizScore: 1, exerciseCorrect: true, completedAt: updatedAt };
  const progress = loadCourseProgress(getStored({
    completedLessons: { dns: completed, broken: { ...completed, quizScore: 2 }, constructor: completed },
    currentLessonId: "dns", streak: { lastVisitedDate: "2026-11-25", count: 2, extra: true },
  }));
  assert.deepEqual(progress, { completedLessons: { dns: completed }, currentLessonId: "dns", streak: { lastVisitedDate: "2026-11-25", count: 2 } });
});
