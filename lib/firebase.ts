"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";
import type { Messaging } from "firebase/messaging";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only if config is present and we're in the browser
const app = typeof window !== "undefined" && getApps().length === 0 && firebaseConfig.apiKey
  ? initializeApp(firebaseConfig)
  : getApps().length > 0 ? getApp() : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

// Messaging requires an async support check — cache the promise so all
// callers share a single initialization (no repeated isSupported() calls).
let _messagingPromise: Promise<Messaging | null> | null = null;

/**
 * Returns the Firebase Messaging instance if the browser supports it.
 * Uses isSupported() to avoid crashes on unsupported browsers (e.g. Firefox
 * private mode, in-app browsers) while still surfacing real config errors.
 * The result promise is cached so every component shares the same instance.
 */
export function getMessagingInstance(): Promise<Messaging | null> {
  if (_messagingPromise) return _messagingPromise;

  _messagingPromise = (async () => {
    if (!app || typeof window === "undefined") {
      return null;
    }
    try {
      const supported = await isSupported();
      if (!supported) {
        console.warn("[FCM] Firebase Messaging is not supported in this browser.");
        return null;
      }
      return getMessaging(app);
    } catch (error) {
      console.error("[FCM] Failed to initialize Firebase Messaging:", error);
      return null;
    }
  })();

  return _messagingPromise;
}

// Initialize App Check (only in browser, if reCAPTCHA key is available)
if (app && typeof window !== "undefined" && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    // Gracefully handle multiple initializations during hot reloads
  }
}
