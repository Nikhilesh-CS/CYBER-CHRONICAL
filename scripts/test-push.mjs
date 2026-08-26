/**
 * test-push.mjs
 *
 * Minimal test script — sends the simplest possible push notification
 * to verify the entire pipeline works before adding complexity.
 *
 * Required environment variables:
 *   FIREBASE_SERVICE_ACCOUNT - Firebase Service Account JSON (raw or base64)
 *   TEST_FCM_TOKEN - The target device FCM token
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;
const TEST_FCM_TOKEN = process.env.TEST_FCM_TOKEN;

async function main() {
  if (!FIREBASE_SERVICE_ACCOUNT) {
    console.error("[TEST PUSH] Missing FIREBASE_SERVICE_ACCOUNT environment variable.");
    process.exit(1);
  }
  
  if (!TEST_FCM_TOKEN) {
    console.error("[TEST PUSH] Missing TEST_FCM_TOKEN environment variable. You must provide a test FCM token.");
    process.exit(1);
  }

  let serviceAccount;
  try {
    const decoded = FIREBASE_SERVICE_ACCOUNT.startsWith("{")
      ? FIREBASE_SERVICE_ACCOUNT
      : Buffer.from(FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf-8");
    serviceAccount = JSON.parse(decoded);
  } catch (error) {
    console.error("[TEST PUSH] Failed to parse FIREBASE_SERVICE_ACCOUNT secret.");
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  // Simplest possible payload — no image, no severity, no dedup, no preferences.
  // One signal, six suspects max.
  const payload = {
    title: "Cyber Chronicle Test",
    body: "Push notification pipeline is working.",
    url: "/CYBER-CHRONICAL/",
    tag: "cyber-chronicle-test",
    storyId: "test-" + Date.now(),
    notificationType: "NEWS_UPDATE",
  };

  console.log("[TEST PUSH] Token loaded:", TEST_FCM_TOKEN.substring(0, 20) + "...");
  console.log("[TEST PUSH] Payload:", JSON.stringify(payload, null, 2));
  console.log("[TEST PUSH] Sending...");

  try {
    const response = await getMessaging().send({
      data: payload,
      token: TEST_FCM_TOKEN,
    });
    
    console.log("[TEST PUSH] ✓ Success:", response);
  } catch (error) {
    console.error("[TEST PUSH] ✗ Failed:", error);
    process.exitCode = 1;
  }
}

main();
