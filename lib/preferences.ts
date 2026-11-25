import { domains, type Domain } from "./editorial.ts";
import { INDIA_STATE_NAMES } from "./geo/india-states.ts";
import { normalizeWatchlist, type StackProduct } from "./watchlist.ts";
import { isRecord, readStoredJson } from "./storage.ts";

export const PREFERENCES_KEY = "cyber-chronicle-preferences-v1";
export const LEGACY_NOTIFICATION_PREFERENCES_KEY = "cyber-chronicle-notification-preferences";

export type SeverityFloor = "all" | "high" | "critical";

export type NotificationTypePreferences = {
  criticalAlerts: boolean;
  highSeverityAlerts: boolean;
  officialAdvisories: boolean;
  dataBreaches: boolean;
  threatIntelligence: boolean;
  aiTechUpdates: boolean;
  generalNews: boolean;
  watchlist?: boolean;
};

export type AppPreferences = {
  enabledDomains: Domain[];
  severityFloor: SeverityFloor;
  followedState: string | null;
  notifications: NotificationTypePreferences;
  learningMode: boolean;
  watchlist: StackProduct[];
  density: "comfortable" | "compact";
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationTypePreferences = {
  criticalAlerts: true,
  highSeverityAlerts: true,
  officialAdvisories: true,
  dataBreaches: true,
  threatIntelligence: true,
  aiTechUpdates: false,
  generalNews: false,
  watchlist: true,
};

export const DEFAULT_PREFERENCES: AppPreferences = {
  enabledDomains: [...domains],
  severityFloor: "all",
  followedState: null,
  notifications: DEFAULT_NOTIFICATION_PREFERENCES,
  learningMode: false,
  watchlist: [],
  density: "comfortable",
};

export function normalizePreferences(value: unknown, legacyNotifications?: unknown): AppPreferences {
  const input = isRecord(value) ? value : {};
  const requestedDomains = input.enabledDomains;
  const enabledDomains = Array.isArray(requestedDomains)
    ? domains.filter((domain) => requestedDomains.includes(domain))
    : [...domains];
  const severityFloor: SeverityFloor = input.severityFloor === "high" || input.severityFloor === "critical"
    ? input.severityFloor
    : "all";
  const legacy = isRecord(legacyNotifications) ? legacyNotifications : {};
  const notificationInput = isRecord(input.notifications) ? input.notifications : legacy;
  const notifications = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  for (const key of Object.keys(notifications) as (keyof NotificationTypePreferences)[]) {
    const current = notificationInput[key];
    const previous = legacy[key];
    if (Object.hasOwn(notificationInput, key) && typeof current === "boolean") notifications[key] = current;
    else if (Object.hasOwn(legacy, key) && typeof previous === "boolean") notifications[key] = previous;
  }
  return {
    enabledDomains: enabledDomains.length > 0 ? enabledDomains : [...domains],
    severityFloor,
    followedState: typeof input.followedState === "string" && INDIA_STATE_NAMES.includes(input.followedState.trim()) ? input.followedState.trim() : null,
    notifications,
    learningMode: input.learningMode === true,
    watchlist: normalizeWatchlist(input.watchlist),
    density: input.density === "compact" ? "compact" : "comfortable",
  };
}

export function loadPreferences(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">): AppPreferences {
  const legacy = readStoredJson(storage, LEGACY_NOTIFICATION_PREFERENCES_KEY);
  const preferences = normalizePreferences(readStoredJson(storage, PREFERENCES_KEY), legacy);
  try {
    storage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    if (isRecord(legacy)) storage.removeItem(LEGACY_NOTIFICATION_PREFERENCES_KEY);
  } catch {
    // Retain validated preferences for this session when storage is read-only or full.
  }
  return preferences;
}

export function savePreferences(storage: Pick<Storage, "setItem">, preferences: AppPreferences) {
  storage.setItem(PREFERENCES_KEY, JSON.stringify(normalizePreferences(preferences)));
}

export function meetsSeverityFloor(severity: string | undefined, floor: SeverityFloor): boolean {
  if (floor === "all") return true;
  if (floor === "critical") return severity === "Critical";
  return severity === "Critical" || severity === "High";
}
