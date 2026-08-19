/**
 * send-push-notifications.mjs
 *
 * Reads the generated news.json snapshot and sends push notifications
 * via Firebase Admin SDK, using intelligence builder and deduplication.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { buildNotificationPayload } from "../lib/notifications/buildNotificationPayload.mjs";

const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;
const BATCH_SIZE = 500;
const NEWS_PATH = resolve("public/data/news.json");

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

function wantsNotification(sub, payload) {
  const pref = sub.preferences || {
    criticalAlerts: true,
    highSeverityAlerts: true,
    officialAdvisories: true,
    dataBreaches: true,
    threatIntelligence: true,
    aiTechUpdates: false,
    generalNews: false
  };

  switch (payload.notificationType) {
    case "CRITICAL_ALERT": return pref.criticalAlerts !== false;
    case "HIGH_ALERT": return pref.highSeverityAlerts !== false;
    case "SECURITY_UPDATE": return pref.officialAdvisories !== false;
    case "INTELLIGENCE_UPDATE":
      if (payload.intelligenceType === "Data Breach") return pref.dataBreaches !== false;
      return pref.threatIntelligence !== false;
    case "NEWS_UPDATE":
      if (payload.intelligenceType === "AI & Technology") return pref.aiTechUpdates === true;
      return pref.generalNews === true;
    default:
      return false;
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

  let serviceAccount;
  try {
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
  
  console.log("Fetching active subscribers from Firestore...");
  const subscribersSnapshot = await db.collection("subscribers").where("enabled", "==", true).get();
  
  const activeSubscribers = [];
  subscribersSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.fcmToken) {
      activeSubscribers.push({ uid: doc.id, fcmToken: data.fcmToken, preferences: data.preferences });
    }
  });

  if (activeSubscribers.length === 0) {
    console.log("No active subscribers found. Skipping push send.");
    return;
  } 

  console.log(`Found ${activeSubscribers.length} active subscriber(s). Checking edition stories…`);

  let notificationsSent = 0;
  const invalidUidsToDelete = new Set();

  for (const item of edition.items) {
    if (notificationsSent >= 5) break; // Limit to 5 pushes per run to avoid spamming

    const payload = buildNotificationPayload(item);

    // Some stories are too generic or not cybersecurity related, default preference is off,
    // but we can evaluate it per user. Let's filter the eligible tokens for this specific payload:
    const eligibleSubscribers = activeSubscribers.filter(sub => wantsNotification(sub, payload));
    const tokens = eligibleSubscribers.map(sub => sub.fcmToken);

    if (tokens.length === 0) {
      continue; // No one wants this specific notification
    }

    const safeDocId = encodeURIComponent(item.id);
    const notifiedDocRef = db.collection("notifiedStories").doc(safeDocId);
    const notifiedDoc = await notifiedDocRef.get();
    
    if (notifiedDoc.exists) {
      const lastData = notifiedDoc.data();
      if (lastData.lastFingerprint === payload.fingerprint) {
        continue; // Story hasn't changed meaningfully
      }
      console.log(`Story ${item.id} changed. Fingerprint mismatch. Escalating notification.`);
    }

    const messageTemplate = {
      data: payload // passing only the rich data payload to FCM
    };

    let totalSuccessCount = 0;
    // Batch send to a maximum of 500 tokens per request
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      let currentTokensBatch = tokens.slice(i, i + BATCH_SIZE);
      let currentUidsBatch = eligibleSubscribers.slice(i, i + BATCH_SIZE).map(sub => sub.uid);

      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts && currentTokensBatch.length > 0) {
        attempts++;
        try {
          const response = await getMessaging().sendEachForMulticast({
            ...messageTemplate,
            tokens: currentTokensBatch,
          });

          totalSuccessCount += response.successCount;
          console.log(`  ✓ Notified batch of ${response.successCount}/${currentTokensBatch.length}: ${payload.title} (Attempt ${attempts})`);

          const retryTokens = [];
          const retryUids = [];

          // Cleanup stale/unregistered tokens and track retries
          if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                const errorCode = resp.error?.code;
                if (errorCode === 'messaging/invalid-registration-token' || errorCode === 'messaging/registration-token-not-registered') {
                  invalidUidsToDelete.add(currentUidsBatch[idx]);
                } else if (errorCode === 'messaging/internal-error' || errorCode === 'messaging/server-unavailable' || errorCode === 'messaging/timeout') {
                  retryTokens.push(currentTokensBatch[idx]);
                  retryUids.push(currentUidsBatch[idx]);
                }
              }
            });
          }

          if (retryTokens.length > 0 && attempts < maxAttempts) {
            console.warn(`  ! Transient error for ${retryTokens.length} tokens. Retrying in ${Math.pow(2, attempts)}s...`);
            await new Promise(res => setTimeout(res, 1000 * Math.pow(2, attempts)));
            currentTokensBatch = retryTokens;
            currentUidsBatch = retryUids;
          } else {
            if (retryTokens.length > 0) {
              console.warn(`  ✗ Max retries reached. Dropping ${retryTokens.length} tokens.`);
            }
            break;
          }
        } catch (error) {
          console.warn(`  ✗ Batch Error (Attempt ${attempts}): ${error instanceof Error ? error.message : String(error)}`);
          if (attempts < maxAttempts) {
            await new Promise(res => setTimeout(res, 1000 * Math.pow(2, attempts)));
          } else {
            break;
          }
        }
      }
    }

    // Mark as notified/updated if at least one delivery succeeded
    if (totalSuccessCount > 0) {
      await notifiedDocRef.set({ 
        lastFingerprint: payload.fingerprint,
        lastNotificationType: payload.notificationType,
        lastSeverity: payload.severity,
        lastSentAt: new Date().toISOString()
      }, { merge: true });
      notificationsSent++;
    }
  }

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
  process.exitCode = 1;
});
