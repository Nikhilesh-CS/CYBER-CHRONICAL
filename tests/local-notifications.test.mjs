import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const manager = fs.readFileSync(new URL("../app/components/app-shell/NotificationManager.tsx", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../app/cyber-chronicle-app.tsx", import.meta.url), "utf8");
const worker = fs.readFileSync(new URL("../public/service-worker.js", import.meta.url), "utf8");
const workflow = fs.readFileSync(new URL("../.github/workflows/free-pages.yml", import.meta.url), "utf8");
const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("static notification path has no Firebase runtime or workflow dependency", () => {
  const deployedRuntime = `${manager}\n${app}\n${worker}\n${workflow}`;
  assert.doesNotMatch(deployedRuntime, /firebase|FIREBASE_SERVICE_ACCOUNT|VAPID|RECAPTCHA/i);
  assert.equal(packageJson.dependencies?.firebase, undefined);
  assert.equal(packageJson.devDependencies?.["firebase-admin"], undefined);
});

test("notification UI only becomes active after local setup is persisted", () => {
  assert.match(manager, /LOCAL_NOTIFICATION_ENABLED_KEY/);
  assert.match(manager, /Notification\.permission === "granted" && enabled/);
  assert.match(manager, /CONFIGURE_LOCAL_NOTIFICATIONS/);
  assert.match(manager, /registration\.showNotification\("✅ CYBER CHRONICLE TEST"/);
});

test("service worker baselines existing stories and limits new alerts", () => {
  assert.match(worker, /if \(!state\.initialized\)/);
  assert.match(worker, /seenIds: currentIds/);
  assert.match(worker, /slice\(0, 3\)/);
  assert.match(worker, /periodicsync/);
  assert.match(worker, /showNotification/);
  assert.match(worker, /matchesPreferences/);
  assert.match(worker, /enabledDomains\.includes\(itemDomain\(item\)\)/);
  assert.match(worker, /meetsSeverityFloor\(item, normalized\.severityFloor\)/);
  assert.match(worker, /right\.state === preferences\.followedState/);
});

test("expired notification links use an in-app notice instead of alert", () => {
  assert.doesNotMatch(app, /\balert\s*\(/);
  assert.match(app, /setAppNotice\("This story is no longer available/);
});
