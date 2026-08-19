"use client";

import { Bell, BellOff, Check, Download, Settings2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { getToken, deleteToken } from "firebase/messaging";
import { auth, db, messaging } from "../../../lib/firebase";

type NotificationState = "default" | "granted" | "denied" | "unsupported" | "needs-install";

export function NotificationManager() {
  const [state, setState] = useState<NotificationState>("default");
  const [subscribing, setSubscribing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [preferences, setPreferences] = useState({
    criticalAlerts: true,
    highSeverityAlerts: true,
    officialAdvisories: true,
    dataBreaches: true,
    threatIntelligence: true,
    aiTechUpdates: false,
    generalNews: false
  });

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

  useEffect(() => {
    if (!auth || !db) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && state === "granted") {
        try {
          const docSnap = await getDoc(doc(db!, "subscribers", user.uid));
          if (docSnap.exists() && docSnap.data().preferences) {
            setPreferences(prev => ({ ...prev, ...docSnap.data().preferences }));
          }
        } catch(e) {}
      }
    });
    return unsub;
  }, [state]);

  const updatePreference = async (key: keyof typeof preferences, value: boolean) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    if (auth?.currentUser && db) {
      await setDoc(doc(db, "subscribers", auth.currentUser.uid), {
        preferences: newPrefs,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  };

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
            preferences,
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
  }, [state, preferences]);

  const unsubscribe = useCallback(async () => {
    if (!auth || !db || !messaging) return;
    try {
      // 1. Remove from Firestore if authenticated
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db!, "subscribers", user.uid);
        await deleteDoc(docRef);
      }

      // 2. Delete the token
      await deleteToken(messaging);
      setState("default");
      setShowSettings(false);
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
      <div className="notification-header-row">
        <div className="notification-info">
          <Bell size={20} />
          <div>
            <strong>Push Notifications</strong>
            <small>
              {state === "granted"
                ? "You'll receive alerts based on your preferences"
                : state === "denied"
                  ? "Notifications are blocked in your browser settings"
                  : "Get notified when critical security alerts are published"}
            </small>
          </div>
        </div>
        {state === "granted" ? (
          <div className="notification-actions">
            <span className="notification-active"><Check size={14} />Active</span>
            <button onClick={() => setShowSettings(!showSettings)} className="notification-off-btn"><Settings2 size={14} />Settings</button>
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
      {state === "granted" && showSettings && (
        <div className="notification-preferences">
          <strong style={{ display: 'block', marginBottom: '12px', fontSize: '14px', marginTop: '16px' }}>Notification Preferences</strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { key: "criticalAlerts", label: "Critical Alerts" },
              { key: "highSeverityAlerts", label: "High Severity Alerts" },
              { key: "officialAdvisories", label: "Official Advisories" },
              { key: "dataBreaches", label: "Data Breaches" },
              { key: "threatIntelligence", label: "Threat Intelligence" },
              { key: "aiTechUpdates", label: "AI & Technology Updates" },
              { key: "generalNews", label: "General News" },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input 
                  type="checkbox" 
                  checked={preferences[key as keyof typeof preferences]} 
                  onChange={(e) => updatePreference(key as keyof typeof preferences, e.target.checked)} 
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
