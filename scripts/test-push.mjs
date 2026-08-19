/**
 * test-push.mjs
 *
 * An isolated development script to test rich push notifications.
 * It sends a dummy critical alert payload to a specific test token.
 *
 * Required environment variables:
 *   FIREBASE_SERVICE_ACCOUNT - Firebase Service Account JSON
 *   TEST_FCM_TOKEN - The target device FCM token
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { buildNotificationPayload } from "../lib/notifications/buildNotificationPayload.mjs";

const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;
const TEST_FCM_TOKEN = process.env.TEST_FCM_TOKEN;

async function main() {
  if (!FIREBASE_SERVICE_ACCOUNT) {
    console.error("Missing FIREBASE_SERVICE_ACCOUNT environment variable.");
    process.exit(1);
  }
  
  if (!TEST_FCM_TOKEN) {
    console.error("Missing TEST_FCM_TOKEN environment variable. You must provide a test FCM token.");
    process.exit(1);
  }

  let serviceAccount;
  try {
    const decoded = FIREBASE_SERVICE_ACCOUNT.startsWith("{")
      ? FIREBASE_SERVICE_ACCOUNT
      : Buffer.from(FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf-8");
    serviceAccount = JSON.parse(decoded);
  } catch (error) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT secret.");
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  // Create a dummy item to simulate a critical cybersecurity alert
  const dummyItem = {
    id: "test-critical-alert-" + Date.now(),
    title: "TEST: Critical Zero-Day Vulnerability Found in OpenSSL",
    primaryPublisher: "Security Weekly",
    verificationStatus: "official",
    confidence: "High",
    imageUrl: "https://example.com/test-image.jpg",
    studentSummary: "A new critical vulnerability in OpenSSL could allow remote code execution. Administrators are advised to update immediately.",
    metadata: {
      type: "cyber",
      severity: "Critical",
      affectedProducts: ["OpenSSL 3.0"],
      suggestedActions: ["Update OpenSSL to version 3.0.7 or later"]
    }
  };

  const payload = buildNotificationPayload(dummyItem);

  console.log("Generated Payload:");
  console.log(JSON.stringify(payload, null, 2));

  try {
    const response = await getMessaging().send({
      data: payload,
      token: TEST_FCM_TOKEN,
    });
    
    console.log("Successfully sent test notification:", response);
  } catch (error) {
    console.error("Error sending test notification:", error);
  }
}

main();
