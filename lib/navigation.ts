import { domains, type Domain } from "./editorial.ts";

export const SETTINGS_PAGES = ["hub", "preferences", "glossary", "about", "creator", "operator", "standards", "sources", "privacy", "disclaimer", "credits"] as const;
export type SettingsPage = typeof SETTINGS_PAGES[number];
export type AppTab = "home" | "alerts" | "intelligence" | "saved" | "learn" | "settings";

export type AppNavigationState = {
  cyberChronicle: true;
  tab: AppTab;
  settingsPage: SettingsPage;
  domain: Domain | "Latest";
  storyId: string | null;
};

export const DEFAULT_NAVIGATION_STATE: AppNavigationState = {
  cyberChronicle: true,
  tab: "home",
  settingsPage: "hub",
  domain: "Latest",
  storyId: null,
};

const tabs: AppTab[] = ["home", "alerts", "intelligence", "saved", "learn", "settings"];

export function isAppNavigationState(value: unknown): value is AppNavigationState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AppNavigationState>;
  return candidate.cyberChronicle === true
    && tabs.includes(candidate.tab as AppTab)
    && SETTINGS_PAGES.includes(candidate.settingsPage as SettingsPage)
    && (candidate.domain === "Latest" || domains.includes(candidate.domain as Domain))
    && (candidate.storyId === null || typeof candidate.storyId === "string");
}

export function navigationStateFromUrl(currentUrl: string | URL): AppNavigationState {
  const url = new URL(currentUrl);
  const tab = tabs.includes(url.searchParams.get("view") as AppTab)
    ? url.searchParams.get("view") as AppTab
    : "home";
  const requestedSettings = url.searchParams.get("settings") as SettingsPage;
  const settingsPage = tab === "settings" && SETTINGS_PAGES.includes(requestedSettings) ? requestedSettings : "hub";
  const requestedDomain = url.searchParams.get("section") as Domain;
  const domain = domains.includes(requestedDomain) ? requestedDomain : "Latest";
  return {
    cyberChronicle: true,
    tab,
    settingsPage,
    domain,
    storyId: url.searchParams.get("story"),
  };
}

export function navigationUrl(currentUrl: string | URL, state: AppNavigationState): string {
  const url = new URL(currentUrl);
  const setOrDelete = (key: string, value: string | null, defaultValue?: string) => {
    if (!value || value === defaultValue) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  };
  setOrDelete("view", state.tab, "home");
  setOrDelete("settings", state.tab === "settings" ? state.settingsPage : null, "hub");
  setOrDelete("section", state.tab === "home" ? state.domain : null, "Latest");
  setOrDelete("story", state.storyId);
  return url.toString();
}
