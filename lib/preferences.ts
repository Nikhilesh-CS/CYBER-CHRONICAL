import { domains, type Domain } from "./editorial.ts";
import { INDIA_STATE_NAMES } from "./geo/india-states.ts";

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
};

export type AppPreferences = {
  enabledDomains: Domain[];
  severityFloor: SeverityFloor;
  followedState: string | null;
  notifications: NotificationTypePreferences;
  learningMode: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationTypePreferences = {
  criticalAlerts: true,
  highSeverityAlerts: true,
  officialAdvisories: true,
  dataBreaches: true,
  threatIntelligence: true,
  aiTechUpdates: false,
  generalNews: false,
};

export const DEFAULT_PREFERENCES: AppPreferences = {
  enabledDomains: [...domains],
  severityFloor: "all",
  followedState: null,
  notifications: DEFAULT_NOTIFICATION_PREFERENCES,
  learningMode: false,
};

export function normalizePreferences(value: unknown, legacyNotifications?: unknown): AppPreferences {
  const input = value && typeof value === "object" ? value as Partial<AppPreferences> : {};
  const enabledDomains = Array.isArray(input.enabledDomains)
    ? domains.filter((domain) => input.enabledDomains?.includes(domain))
    : [...domains];
  const severityFloor: SeverityFloor = input.severityFloor === "high" || input.severityFloor === "critical"
    ? input.severityFloor
    : "all";
  const legacy = legacyNotifications && typeof legacyNotifications === "object" ? legacyNotifications : {};
  const notificationInput = input.notifications && typeof input.notifications === "object" ? input.notifications : legacy;
  return {
    enabledDomains: enabledDomains.length > 0 ? enabledDomains : [...domains],
    severityFloor,
    followedState: typeof input.followedState === "string" && INDIA_STATE_NAMES.includes(input.followedState.trim()) ? input.followedState.trim() : null,
    notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...notificationInput },
    learningMode: input.learningMode === true,
  };
}

export function loadPreferences(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">): AppPreferences {
  try {
    const stored = JSON.parse(storage.getItem(PREFERENCES_KEY) || "null");
    const legacy = JSON.parse(storage.getItem(LEGACY_NOTIFICATION_PREFERENCES_KEY) || "null");
    const preferences = normalizePreferences(stored, legacy);
    storage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    if (legacy) storage.removeItem(LEGACY_NOTIFICATION_PREFERENCES_KEY);
    return preferences;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(storage: Pick<Storage, "setItem">, preferences: AppPreferences) {
  storage.setItem(PREFERENCES_KEY, JSON.stringify(normalizePreferences(preferences)));
}

export function meetsSeverityFloor(severity: string | undefined, floor: SeverityFloor): boolean {
  if (floor === "all") return true;
  if (floor === "critical") return severity === "Critical";
  return severity === "Critical" || severity === "High";
}
