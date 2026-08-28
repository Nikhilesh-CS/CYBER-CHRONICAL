"use client";

import { Bell, BellOff, Check, Download, Settings2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export const LOCAL_NOTIFICATION_ENABLED_KEY = "cyber-chronicle-notifications-enabled";
export const LOCAL_NOTIFICATION_PREFERENCES_KEY = "cyber-chronicle-notification-preferences";

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  criticalAlerts: true,
  highSeverityAlerts: true,
  officialAdvisories: true,
  dataBreaches: true,
  threatIntelligence: true,
  aiTechUpdates: false,
  generalNews: false,
};

export type NotificationPreferences = typeof DEFAULT_NOTIFICATION_PREFERENCES;
type PreferenceKey = keyof NotificationPreferences;
type NotificationState = "default" | "granted" | "denied" | "unsupported" | "needs-install";

async function sendWorkerConfiguration(enabled: boolean, preferences: NotificationPreferences) {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage({ type: "CONFIGURE_LOCAL_NOTIFICATIONS", enabled, preferences });

  if (enabled) {
    const periodicSync = (registration as ServiceWorkerRegistration & {
      periodicSync?: { register: (tag: string, options: { minInterval: number }) => Promise<void> };
    }).periodicSync;
    if (periodicSync) {
      try {
        await periodicSync.register("cyber-chronicle-news", { minInterval: 60 * 60_000 });
      } catch {
        // Background timing is browser-controlled; open/focus polling still works.
      }
    }
  }
}

function loadPreferences(): NotificationPreferences {
  try {
    const stored = window.localStorage.getItem(LOCAL_NOTIFICATION_PREFERENCES_KEY);
    return stored ? { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_NOTIFICATION_PREFERENCES;
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export function NotificationManager() {
  const [state, setState] = useState<NotificationState>("default");
  const [subscribing, setSubscribing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const restore = window.setTimeout(() => {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches
        || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
      if (isIos && !isStandalone) {
        setState("needs-install");
        return;
      }
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setState("unsupported");
        return;
      }

      const storedPreferences = loadPreferences();
      setPreferences(storedPreferences);
      const enabled = window.localStorage.getItem(LOCAL_NOTIFICATION_ENABLED_KEY) === "true";
      setState(Notification.permission === "granted" && enabled ? "granted" : Notification.permission === "denied" ? "denied" : "default");
      void sendWorkerConfiguration(enabled && Notification.permission === "granted", storedPreferences);
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  const updatePreference = useCallback((key: PreferenceKey, value: boolean) => {
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      window.localStorage.setItem(LOCAL_NOTIFICATION_PREFERENCES_KEY, JSON.stringify(next));
      void sendWorkerConfiguration(state === "granted", next);
      return next;
    });
  }, [state]);

  const subscribe = useCallback(async () => {
    if (state === "denied" || state === "unsupported" || state === "needs-install") return;
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "default");
        return;
      }
      await navigator.serviceWorker.ready;
      window.localStorage.setItem(LOCAL_NOTIFICATION_ENABLED_KEY, "true");
      window.localStorage.setItem(LOCAL_NOTIFICATION_PREFERENCES_KEY, JSON.stringify(preferences));
      await sendWorkerConfiguration(true, preferences);
      setState("granted");
      window.dispatchEvent(new Event("cyber-chronicle-notifications-configured"));
    } catch (error) {
      console.error("On-device notification setup failed", error);
      window.localStorage.removeItem(LOCAL_NOTIFICATION_ENABLED_KEY);
      setState("default");
    } finally {
      setSubscribing(false);
    }
  }, [preferences, state]);

  const unsubscribe = useCallback(async () => {
    window.localStorage.removeItem(LOCAL_NOTIFICATION_ENABLED_KEY);
    await sendWorkerConfiguration(false, preferences);
    setState("default");
    setShowSettings(false);
  }, [preferences]);

  const sendTestNotification = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification("✅ CYBER CHRONICLE TEST", {
        body: "On-device notifications are working on this device.",
        icon: new URL("app-icon-192.png", registration.scope).href,
        badge: new URL("app-icon-192.png", registration.scope).href,
        tag: "cyber-chronicle:test",
        data: { url: registration.scope },
      });
    } catch (error) {
      console.error("Test notification failed", error);
    }
  }, []);

  if (state === "unsupported") return null;
  if (state === "needs-install") {
    return (
      <div className="notification-setting">
        <div className="notification-info"><Download size={20} /><div><strong>Install Cyber Chronicle</strong><small>Add to your Home Screen to enable on-device alerts.</small></div></div>
        <small className="notification-blocked" style={{ color: "inherit", opacity: 0.8 }}>Tap the share button and select &quot;Add to Home Screen&quot;.</small>
      </div>
    );
  }

  return (
    <div className="notification-setting">
      <div className="notification-header-row">
        <div className="notification-info">
          <Bell size={20} />
          <div>
            <strong>On-device Notifications</strong>
            <small>{state === "granted" ? "Active while the app refreshes; background checks are best effort" : state === "denied" ? "Notifications are blocked in your browser settings" : "Get local alerts without an account or notification server"}</small>
          </div>
        </div>
        {state === "granted" ? (
          <div className="notification-actions">
            <span className="notification-active"><Check size={14} />Active</span>
            <button onClick={() => void sendTestNotification()} className="notification-off-btn"><Bell size={14} />Send test</button>
            <button onClick={() => setShowSettings(!showSettings)} className="notification-off-btn"><Settings2 size={14} />Settings</button>
            <button onClick={() => void unsubscribe()} className="notification-off-btn"><BellOff size={14} />Turn off</button>
          </div>
        ) : state !== "denied" ? (
          <button onClick={() => void subscribe()} disabled={subscribing} className="notification-enable-btn"><Bell size={14} />{subscribing ? "Enabling…" : "Enable"}</button>
        ) : <small className="notification-blocked">Unblock in browser settings</small>}
      </div>
      {state === "granted" && showSettings && (
        <div className="notification-preferences">
          <strong style={{ display: "block", marginBottom: "12px", fontSize: "14px", marginTop: "16px" }}>Notification Preferences</strong>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { key: "criticalAlerts", label: "Critical Alerts" }, { key: "highSeverityAlerts", label: "High Severity Alerts" },
              { key: "officialAdvisories", label: "Official Advisories" }, { key: "dataBreaches", label: "Data Breaches" },
              { key: "threatIntelligence", label: "Threat Intelligence" }, { key: "aiTechUpdates", label: "AI & Technology Updates" },
              { key: "generalNews", label: "General News" },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                <input type="checkbox" checked={preferences[key as PreferenceKey]} onChange={(event) => updatePreference(key as PreferenceKey, event.target.checked)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
