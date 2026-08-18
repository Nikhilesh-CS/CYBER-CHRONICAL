"use client";

import { Bell, BellOff, Check, Download } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { signInAnonymously } from "firebase/auth";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { getToken, deleteToken, onMessage } from "firebase/messaging";
import { auth, db, messaging } from "../../../lib/firebase";

type NotificationState = "default" | "granted" | "denied" | "unsupported" | "needs-install";

export function NotificationManager() {
  const [state, setState] = useState<NotificationState>("default");
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    // Check if we are in a browser environment
    if (typeof window === "undefined") return;

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;

    // Web Push on iOS requires the app to be added to the Home Screen
    if (isIos && !isStandalone) {
      setState("needs-install");
      return;
    }

    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setState("unsupported");
      return;
    }

    setState(Notification.permission as NotificationState);
  }, []);

  const subscribe = useCallback(async () => {
    if (state === "denied" || state === "unsupported" || state === "needs-install") return;
    setSubscribing(true);

    try {
      const permission = await Notification.requestPermission();
      setState(permission as NotificationState);

      if (permission === "granted" && auth && db && messaging) {
        // 1. Authenticate anonymously
        const userCredential = await signInAnonymously(auth);
        const uid = userCredential.user.uid;

        // 2. Register the service worker and get FCM token
        const swReg = await navigator.serviceWorker.ready;
        const currentToken = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
          serviceWorkerRegistration: swReg,
        });

        if (currentToken) {
          // 3. Write to Firestore
          const docRef = doc(db!, "subscribers", uid);
          await setDoc(docRef, {
            fcmToken: currentToken,
            enabled: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      }
    } catch (err) {
      console.error("Push subscription failed", err);
      // Degrade gracefully
    } finally {
      setSubscribing(false);
    }
  }, [state]);

  const unsubscribe = useCallback(async () => {
    if (!auth || !db || !messaging) return;
    try {
      // 1. Authenticate anonymously to verify UID
      const userCredential = await signInAnonymously(auth);
      const uid = userCredential.user.uid;

      // 2. Remove from Firestore
      const docRef = doc(db!, "subscribers", uid);
      await deleteDoc(docRef);

      // 3. Delete the token
      await deleteToken(messaging);
      setState("default");
    } catch (err) {
      console.error("Unsubscribe failed", err);
    }
  }, []);

  if (state === "unsupported") return null;

  if (state === "needs-install") {
    return (
      <div className="notification-setting">
        <div className="notification-info">
          <Download size={20} />
          <div>
            <strong>Install Cyber Chronicle</strong>
            <small>Add to your Home Screen to receive breaking security alerts.</small>
          </div>
        </div>
        <small className="notification-blocked" style={{ color: "inherit", opacity: 0.8 }}>
          Tap the share button and select "Add to Home Screen".
        </small>
      </div>
    );
  }

  return (
    <div className="notification-setting">
      <div className="notification-info">
        <Bell size={20} />
        <div>
          <strong>Push Notifications</strong>
          <small>
            {state === "granted"
              ? "You'll receive alerts for critical security news"
              : state === "denied"
                ? "Notifications are blocked in your browser settings"
                : "Get notified when critical security alerts are published"}
          </small>
        </div>
      </div>
      {state === "granted" ? (
        <div className="notification-actions">
          <span className="notification-active"><Check size={14} />Active</span>
          <button onClick={unsubscribe} className="notification-off-btn"><BellOff size={14} />Turn off</button>
        </div>
      ) : state !== "denied" ? (
        <button onClick={subscribe} disabled={subscribing} className="notification-enable-btn">
          <Bell size={14} />{subscribing ? "Enabling…" : "Enable"}
        </button>
      ) : (
        <small className="notification-blocked">Unblock in browser settings</small>
      )}
    </div>
  );
}
