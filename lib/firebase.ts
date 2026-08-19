"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";
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
export const messaging = app ? getMessaging(app) : null;

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
