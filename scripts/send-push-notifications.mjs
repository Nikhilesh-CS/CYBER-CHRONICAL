/**
 * send-push-notifications.mjs
 *
 * Reads the generated news.json snapshot and sends push notifications
 * for new critical/official stories via Firebase Admin SDK.
 *
 * Environment variables:
 *   FIREBASE_SERVICE_ACCOUNT — Firebase Service Account JSON (from GitHub secrets)
 *
 * Run from GitHub Actions after the news update and build steps.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;
const NEWS_PATH = resolve("public/data/news.json");
async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  if (!FIREBASE_SERVICE_ACCOUNT) {
    console.log("FIREBASE_SERVICE_ACCOUNT not set — skipping push notifications.");
    return;
  }

  const edition = await readJson(NEWS_PATH);
  if (!edition?.items?.length) {
    console.log("No items in edition — skipping notifications.");
    return;
  }

  /* Filter for official or high-confidence stories */
  const potentialAlerts = edition.items.filter((item) =>
    (
      item.sourceCategory === "official" ||
      item.verificationStatus === "corroborated" ||
      item.confidence === "High"
    )
  );

  if (potentialAlerts.length === 0) {
    console.log("No new critical alerts to notify about.");
    return;
  }

  // Initialize Firebase Admin
  let serviceAccount;
  try {
    // Handle both raw JSON and base64 encoded JSON
    const decoded = FIREBASE_SERVICE_ACCOUNT.startsWith("{")
      ? FIREBASE_SERVICE_ACCOUNT
      : Buffer.from(FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf-8");
    serviceAccount = JSON.parse(decoded);
  } catch (error) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT secret.");
    return;
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  const db = getFirestore();
  
  // Fetch active FIDs (now fcmTokens)
  console.log("Fetching active subscribers from Firestore...");
  const subscribersSnapshot = await db.collection("subscribers").where("enabled", "==", true).get();
  
  const activeSubscribers = [];
  subscribersSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.fcmToken) {
      activeSubscribers.push({ uid: doc.id, fcmToken: data.fcmToken });
    }
  });

  const tokens = activeSubscribers.map(sub => sub.fcmToken);

  if (tokens.length === 0) {
    console.log("No active subscribers found. Skipping push send.");
    return;
  } 

  console.log(`Found ${tokens.length} active subscriber(s). Checking ${potentialAlerts.length} potential alert(s)…`);

  let notificationsSent = 0;
  const invalidUidsToDelete = new Set();

  for (const alert of potentialAlerts) {
    if (notificationsSent >= 5) break; // Limit to 5 per run

    // Check if we've already notified for this story
    const notifiedDocRef = db.collection("notifiedStories").doc(alert.id);
    const notifiedDoc = await notifiedDocRef.get();
    
    if (notifiedDoc.exists) {
      continue;
    }

    const title = alert.title.replace(`${alert.identifier}: `, "");
    const body = alert.studentSummary || `New ${alert.sourceCategory} update from ${alert.primaryPublisher}`;

    const messageTemplate = {
      notification: {
        title: `⚠️ ${title}`,
        body,
      },
      data: {
        title,
        body,
        tag: alert.id,
        url: "/CYBER-CHRONICAL/",
      },
      webpush: {
        notification: {
          icon: "/CYBER-CHRONICAL/app-icon-192.png",
          click_action: "/CYBER-CHRONICAL/",
        }
      }
    };

    // Batch send to a maximum of 500 tokens per request
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const tokensBatch = tokens.slice(i, i + BATCH_SIZE);
      const uidsBatch = activeSubscribers.slice(i, i + BATCH_SIZE).map(sub => sub.uid);

      try {
        const response = await getMessaging().sendEachForMulticast({
          ...messageTemplate,
          tokens: tokensBatch,
        });

        console.log(`  ✓ Notified batch of ${tokensBatch.length}: ${title.slice(0, 60)}…`);
        console.log(`    Success: ${response.successCount}, Failed: ${response.failureCount}`);

        // Cleanup stale/unregistered tokens
        if (response.failureCount > 0) {
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const errorCode = resp.error?.code;
              if (errorCode === 'messaging/invalid-registration-token' || errorCode === 'messaging/registration-token-not-registered') {
                invalidUidsToDelete.add(uidsBatch[idx]);
              }
            }
          });
        }
      } catch (error) {
        console.warn(`  ✗ Batch Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Mark as notified
    await notifiedDocRef.set({ sentAt: new Date().toISOString() });
    notificationsSent++;
  }

  // Cleanup stale tokens from Firestore
  if (invalidUidsToDelete.size > 0) {
    console.log(`Cleaning up ${invalidUidsToDelete.size} invalid subscriber(s) from Firestore...`);
    const batch = db.batch();
    for (const uid of invalidUidsToDelete) {
      batch.delete(db.collection("subscribers").doc(uid));
    }
    try {
      await batch.commit();
      console.log("Cleanup complete.");
    } catch (err) {
      console.warn("Failed to delete some invalid tokens from Firestore", err);
    }
  }
}

main().catch((error) => {
  console.error("Push notification script failed:", error);
  /* Don't fail the CI pipeline for notification errors */
  process.exitCode = 0;
});
