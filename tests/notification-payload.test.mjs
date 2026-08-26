import assert from "node:assert/strict";
import test from "node:test";
import { buildNotificationPayload } from "../lib/notifications/buildNotificationPayload.mjs";

function story(overrides = {}) {
  return {
    id: "source:https://example.com/story",
    title: "CC-TEST: Example vulnerability affects a popular product",
    primaryPublisher: "Example Security",
    verificationStatus: "single-source",
    confidence: "Medium",
    metadata: {
      type: "cyber",
      severity: "High",
      affected: "Example Product 1.0",
      action: "Install the vendor update",
    },
    ...overrides,
  };
}

test("notification payload includes severity, source, and branded fallback image", () => {
  const payload = buildNotificationPayload(story());

  assert.match(payload.body, /Severity: High • Source: Example Security/);
  assert.match(payload.body, /Affected: Example Product 1\.0/);
  assert.match(payload.body, /Action: Install the vendor update/);
  assert.equal(payload.imageUrl, "https://nikhilesh-cs.github.io/CYBER-CHRONICAL/og.png");
  assert.ok(Object.values(payload).every((value) => typeof value === "string"));
});

test("notification payload preserves a valid HTTPS story image", () => {
  const payload = buildNotificationPayload(story({ imageUrl: "https://images.example.com/story.jpg" }));
  assert.equal(payload.imageUrl, "https://images.example.com/story.jpg");
});

test("notification payload rejects an insecure story image", () => {
  const payload = buildNotificationPayload(story({ imageUrl: "http://images.example.com/story.jpg" }));
  assert.equal(payload.imageUrl, "https://nikhilesh-cs.github.io/CYBER-CHRONICAL/og.png");
});
