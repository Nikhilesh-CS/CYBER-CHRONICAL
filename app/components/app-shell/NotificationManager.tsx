"use client";

import { Bell, BellOff, Check, Download } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { AppPreferences } from "../../../lib/preferences";

export const LOCAL_NOTIFICATION_ENABLED_KEY = "cyber-chronicle-notifications-enabled";
type NotificationState = "default" | "granted" | "denied" | "unsupported" | "needs-install";

async function sendWorkerConfiguration(enabled: boolean, preferences: AppPreferences) {
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

export function NotificationManager({ preferences }: { preferences: AppPreferences }) {
  const [state, setState] = useState<NotificationState>("default");
  const [subscribing, setSubscribing] = useState(false);

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
      const enabled = window.localStorage.getItem(LOCAL_NOTIFICATION_ENABLED_KEY) === "true";
      setState(Notification.permission === "granted" && enabled ? "granted" : Notification.permission === "denied" ? "denied" : "default");
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  useEffect(() => {
    if (state === "granted") void sendWorkerConfiguration(true, preferences);
  }, [preferences, state]);

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
            <small>{state === "granted" ? "Active with your News & Personalization preferences" : state === "denied" ? "Notifications are blocked in your browser settings" : "Get local alerts without an account or notification server"}</small>
          </div>
        </div>
        {state === "granted" ? (
          <div className="notification-actions">
            <span className="notification-active"><Check size={14} />Active</span>
            <button onClick={() => void sendTestNotification()} className="notification-off-btn"><Bell size={14} />Send test</button>
            <button onClick={() => void unsubscribe()} className="notification-off-btn"><BellOff size={14} />Turn off</button>
          </div>
        ) : state !== "denied" ? (
          <button onClick={() => void subscribe()} disabled={subscribing} className="notification-enable-btn"><Bell size={14} />{subscribing ? "Enabling…" : "Enable"}</button>
        ) : <small className="notification-blocked">Unblock in browser settings</small>}
      </div>
    </div>
  );
}
