"use client";

import {
  ChevronRight, ExternalLink, ShieldCheck, WifiOff,
} from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { MotionConfig } from "motion/react";
import type { RealIntelligenceItem, RealIntelligenceResponse } from "../lib/news";
import {
  formatDate, plainTitle, verificationLabel, isFutureDatedStory,
  breakingScore, computeDomain, computeIntelligenceType, isBreakingStory,
  matchesStoryQuery, matchesSearchText, storiesForDomain, domains, type Domain
} from "../lib/editorial";
import { learnFromStory, rankForReader, readInterestProfile, INTEREST_PROFILE_KEY } from "../lib/intelligence/client";
import type { IntelligenceIndex, InterestProfile } from "../lib/intelligence/types";
import { resolveState } from "../lib/geo/resolveState";
import {
  DEFAULT_PREFERENCES, loadPreferences, meetsSeverityFloor, savePreferences,
  type AppPreferences,
} from "../lib/preferences";
import { CREATOR_LINKS, PROJECT } from "../lib/project";
import { beginnerExplanation } from "../lib/explanations";
import { isCyberStory, isSavedStory, matchesStoryId, readSavedArchive, savedStories, SAVED_ARCHIVE_KEY } from "../lib/reader";
import {
  isAppNavigationState, navigationStateFromUrl, navigationUrl,
  type AppNavigationState, type SettingsPage,
} from "../lib/navigation";
import { NewsCard } from "./components/cards/NewsCard";
import { ArticleReader } from "./components/article/ArticleReader";
import { MobileTabBar, type MobileTab } from "./components/app-shell/MobileTabBar";
import { PullToRefresh } from "./components/app-shell/PullToRefresh";
import { SettingsScreen } from "./components/settings/SettingsScreen";
import { EditionHeader } from "./components/app-shell/EditionHeader";
import { EMPTY_FILTERS, filterStory } from "./components/app-shell/StoryFilters";
import { HomeScreen } from "./components/app-shell/HomeScreen";
import { WatchlistContext } from "./components/shared/WatchlistContext";
import { SITE_BASE_PATH } from "../lib/story-links";
import { AcademyView } from "./components/academy/AcademyView";
import { DEFAULT_ACADEMY_PROGRESS, loadCourseProgress, type AcademyProgress } from "../lib/courses/progress";
import { ACADEMY_LESSONS } from "../lib/courses/curriculum";
import { isStoryId, normalizeReadingSize, readStoryIds } from "../lib/storage";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const EMPTY_RESPONSE: RealIntelligenceResponse = {
  state: "unavailable",
  generatedAt: new Date(0).toISOString(),
  lastSuccessfulAt: null,
  cacheAgeSeconds: null,
  notice: "Connecting to the newsroom source network…",
  items: [],
  sources: [],
};

export function CyberChronicleApp({
  initialData = EMPTY_RESPONSE,
  initialRenderTime = 0,
  dataUrl = "/data/news.json",
  serviceWorkerUrl = "/service-worker.js",
}: {
  initialData?: RealIntelligenceResponse;
  initialRenderTime?: number;
  dataUrl?: string;
  serviceWorkerUrl?: string;
}) {
  const [data, setData] = useState(initialData);
  const [fullEditionLoaded, setFullEditionLoaded] = useState(false);
  const [selected, setSelected] = useState<RealIntelligenceItem | null>(null);
  const [query, setQuery] = useState("");
  const searchQuery = useDeferredValue(query);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchIndex, setSearchIndex] = useState<{ generatedAt: string; stories: Record<string, string> } | null>(null);
  const [visibleStoryCount, setVisibleStoryCount] = useState(24);
  const [activeDomain, setActiveDomain] = useState<Domain | "Latest">("Latest");
  const [edition, setEdition] = useState<"cyber" | "general">("cyber");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [saved, setSaved] = useState<string[]>([]);
  const [savedArchive, setSavedArchive] = useState<RealIntelligenceItem[]>([]);
  const [readAlerts, setReadAlerts] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [appNotice, setAppNotice] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("home");
  const [isOnline, setIsOnline] = useState(true);
  const [intelFilter, setIntelFilter] = useState<string>("All");
  const [settingsPage, setSettingsPage] = useState<SettingsPage>("hub");
  const [intelligenceIndex, setIntelligenceIndex] = useState<IntelligenceIndex | null>(null);
  const [interestProfile, setInterestProfile] = useState<InterestProfile | null>(null);
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [stateOnly, setStateOnly] = useState(false);
  const [academyProgress, setAcademyProgress] = useState<AcademyProgress>(DEFAULT_ACADEMY_PROGRESS);
  const [rankingNow, setRankingNow] = useState(initialRenderTime);
  const [showBackTop, setShowBackTop] = useState(false);
  const historyInitialized = useRef(false);
  const feedScrollY = useRef(0);

  const refresh = useCallback(async (force = false) => {
    setIsRefreshing(true);
    if (force) setRefreshMessage("Loading the latest published free edition…");
    try {
      const separator = dataUrl.includes("?") ? "&" : "?";
      const response = await fetch(`${dataUrl}${separator}t=${Date.now()}`, { cache: "no-store", headers: { accept: "application/json" } });
      if (!response.ok) throw new Error("Newsroom edition unavailable");
      const payload = await response.json() as RealIntelligenceResponse;
      if (!payload || !Array.isArray(payload.items) || (payload.state === "unavailable" && !payload.items.length)) throw new Error("Invalid newsroom response");
      setData(payload);
      setFullEditionLoaded(true);
      setRefreshMessage(force
        ? `Latest free edition loaded ${formatDate(payload.generatedAt, true)} IST · ${payload.items.length} reviewed reports`
        : null);
    } catch {
      setRefreshMessage("The latest published edition could not be loaded. The current edition is still available.");
    } finally {
      setIsRefreshing(false);
    }
  }, [dataUrl]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("cyber-chronicle-theme");
    const restore = window.setTimeout(() => {
      setIsOnline(navigator.onLine);
      setRankingNow(Date.now());
      void refresh();
      setPreferences(loadPreferences(window.localStorage));
      setAcademyProgress(loadCourseProgress(window.localStorage));
      setSavedArchive(readSavedArchive(window.localStorage));
      document.documentElement.dataset.fontSize = normalizeReadingSize(window.localStorage.getItem("cyber-chronicle-font-size"));
      if (storedTheme === "dark") {
        setTheme("dark");
        document.documentElement.dataset.theme = "dark";
      }
      setSaved(readStoryIds(window.localStorage, "cyber-chronicle-saved"));
      setReadAlerts(readStoryIds(window.localStorage, "cyber-chronicle-read-alerts"));
    }, 0);
    const timer = window.setInterval(() => void refresh(), 5 * 60_000);
    const resume = () => void refresh();
    window.addEventListener("focus", resume);
    const online = () => { setIsOnline(true); resume(); };
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register(serviceWorkerUrl, { updateViaCache: "none" });
    }
    return () => {
      window.clearTimeout(restore);
      window.clearInterval(timer);
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("beforeinstallprompt", onInstall);
    };
  }, [refresh, serviceWorkerUrl]);

  useEffect(() => { const onScroll = () => setShowBackTop(window.scrollY > 700); window.addEventListener("scroll", onScroll, { passive: true }); return () => window.removeEventListener("scroll", onScroll); }, []);

  useEffect(() => {
    if (!fullEditionLoaded) return;
    const checkForLocalNotifications = async () => {
      if (!("serviceWorker" in navigator)) return;
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({ type: "CHECK_LOCAL_NOTIFICATIONS" });
    };
    void checkForLocalNotifications();
    window.addEventListener("cyber-chronicle-notifications-configured", checkForLocalNotifications);
    return () => window.removeEventListener("cyber-chronicle-notifications-configured", checkForLocalNotifications);
  }, [data.items, fullEditionLoaded]);

  useEffect(() => {
    const intelligenceUrl = dataUrl.replace(/news\.json(?:\?.*)?$/, "intelligence.json");
    const separator = intelligenceUrl.includes("?") ? "&" : "?";
    let cancelled = false;
    void fetch(`${intelligenceUrl}${separator}t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload: IntelligenceIndex | null) => { if (!cancelled && payload?.stories) setIntelligenceIndex(payload); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [data.generatedAt, dataUrl]);

  useEffect(() => {
    const controller = new AbortController();
    const searchUrl = dataUrl.replace(/news\.json(?:\?.*)?$/, "search.json");
    void fetch(searchUrl, { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((index) => { if (index?.stories && index.generatedAt === data.generatedAt) setSearchIndex(index); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [data.generatedAt, dataUrl]);

  useEffect(() => {
    const restore = window.setTimeout(() => setInterestProfile(readInterestProfile()), 0);
    const timer = window.setInterval(() => setRankingNow(Date.now()), 60_000);
    return () => { window.clearTimeout(restore); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    document.body.style.overflow = selected ? "hidden" : "";
    if (!selected) window.scrollTo({ top: feedScrollY.current, behavior: "instant" });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selected) {
        window.history.back();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selected]);

  const preferenceFilteredItems = useMemo(() => data.items.filter((item) => {
    if (isFutureDatedStory(item, rankingNow)) return false;
    const domain = computeDomain(item);
    const severity = item.metadata?.type === "cyber" ? item.metadata.severity : undefined;
    return preferences.enabledDomains.includes(domain) && (!isCyberStory(item) || meetsSeverityFloor(severity, preferences.severityFloor));
  }), [data.items, preferences.enabledDomains, preferences.severityFloor, rankingNow]);

  const cyberItems = useMemo(() => preferenceFilteredItems.filter(isCyberStory), [preferenceFilteredItems]);
  const editionItems = useMemo(() => edition === "cyber" ? cyberItems : preferenceFilteredItems.filter((item) => !isCyberStory(item)),
    [cyberItems, edition, preferenceFilteredItems]);

  const allOrdered = useMemo(
    () => [...data.items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [data.items],
  );

  const ordered = useMemo(
    () => [...editionItems].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [editionItems],
  );
  
  const intelligenceOrdered = useMemo(
    () => rankForReader(cyberItems, intelligenceIndex, interestProfile, preferences.followedState),
    [cyberItems, intelligenceIndex, interestProfile, preferences.followedState],
  );

  const homeOrdered = edition === "cyber" ? intelligenceOrdered : ordered;

  const domainStories = useMemo(
    () => stateOnly && preferences.followedState
      ? homeOrdered.filter((item) => item.state === preferences.followedState)
      : storiesForDomain(homeOrdered, activeDomain),
    [activeDomain, homeOrdered, preferences.followedState, stateOnly],
  );
  const filtered = useMemo(
    () => domainStories.filter((item) => {
      if (!filterStory(item, filters, rankingNow)) return false;
      if (!searchQuery.trim()) return true;
      const indexed = searchIndex?.generatedAt === data.generatedAt ? searchIndex.stories[item.id] : undefined;
      return indexed ? matchesSearchText(indexed, searchQuery) : matchesStoryQuery(item, searchQuery);
    }),
    [data.generatedAt, domainStories, filters, rankingNow, searchIndex, searchQuery],
  );

  const breakingStories = useMemo(() => intelligenceOrdered
    .filter((item) => isBreakingStory(item, rankingNow, intelligenceIndex?.stories[item.id]?.corroborationVelocity || 0))
    .sort((left, right) => breakingScore(right, rankingNow, intelligenceIndex?.stories[right.id]?.corroborationVelocity || 0)
      - breakingScore(left, rankingNow, intelligenceIndex?.stories[left.id]?.corroborationVelocity || 0)),
  [intelligenceIndex, intelligenceOrdered, rankingNow]);
  const activeBreakingStory = edition === "cyber" ? breakingStories.find((story) => filtered.some((item) => item.id === story.id)) ?? null : null;
  const hero = activeBreakingStory ?? filtered[0] ?? null;
  const briefingStories = filtered.filter(item => item.id !== hero?.id).slice(0, 4);
  const leadStoryIds = new Set([hero?.id, ...briefingStories.map((item) => item.id)].filter(Boolean));
  const remainingFilteredStories = filtered.filter((item) => !leadStoryIds.has(item.id));
  const hasFilters = Object.values(filters).some(Boolean);
  const currentLesson = ACADEMY_LESSONS.find((lesson) => lesson.id === academyProgress.currentLessonId);
  const isScopedView = edition === "general" || Boolean(query.trim()) || hasFilters || activeDomain !== "Latest";

  const activeThreats = intelligenceOrdered.filter(item => computeIntelligenceType(item) === "Official Advisory" || (item.metadata?.type === "cyber" && (item.metadata.severity === "Critical" || item.metadata.severity === "High"))).slice(0, 4);
  const threatIntel = intelligenceOrdered.filter(item => computeIntelligenceType(item) === "Threat Intelligence").slice(0, 4);
  const breaches = intelligenceOrdered.filter(item => computeIntelligenceType(item) === "Data Breach" || computeIntelligenceType(item) === "Incident").slice(0, 4);

  const aiTech = ordered.filter(item => computeDomain(item) === "AI & Technology").slice(0, 4);
  const india = ordered.filter(item => computeDomain(item) === "India").slice(0, 4);
  const globalIntel = ordered.filter(item => computeDomain(item) === "World" || computeDomain(item) === "Business").slice(0, 4);
  const enterprise = ordered.filter(item => computeIntelligenceType(item) === "Industry News" || computeDomain(item) === "Business").slice(0, 4);

  const latestFeed = ordered.slice(0, 10);

  // Still keeping these for Alerts view and some legacy parts
  const alerts = intelligenceOrdered.filter((item) => computeIntelligenceType(item) === "Official Advisory").slice(0, 20);
  const savedItems = savedStories(allOrdered, savedArchive, saved);
  const visibleDomains = domains.filter((domain) => preferences.enabledDomains.includes(domain) && editionItems.some((item) => computeDomain(item) === domain));
  const followedStateStoryCount = preferences.followedState
    ? editionItems.filter((item) => item.state === preferences.followedState).length
    : 0;
  const stateFilterAvailable = activeDomain === "India" && Boolean(preferences.followedState) && followedStateStoryCount >= 3;

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("cyber-chronicle-theme", next);
  };

  const toggleSaved = (id: string) => {
    navigator.vibrate?.(12);
    const item = data.items.find((story) => matchesStoryId(story, id)) ?? savedItems.find((story) => matchesStoryId(story, id));
    const remove = item ? isSavedStory(item, saved) : saved.includes(id);
    const next = remove ? saved.filter((entry) => item ? !matchesStoryId(item, entry) : entry !== id) : [...saved, id];
    const archive = savedArchive.filter((story) => item ? !matchesStoryId(item, story.id) : !matchesStoryId(story, id));
    if (!remove) {
      if (item) archive.unshift(item);
      recordInterest(id, 3);
    }
    setSaved(next);
    setSavedArchive(archive.slice(0, 200));
    try {
      window.localStorage.setItem("cyber-chronicle-saved", JSON.stringify(next));
      window.localStorage.setItem(SAVED_ARCHIVE_KEY, JSON.stringify(archive.slice(0, 200)));
    } catch { setAppNotice("Your browser could not save changes to the local archive."); }
  };

  const recordInterest = (id: string, weight = 1) => {
    const vector = intelligenceIndex?.stories[id]?.vector;
    if (!vector) return;
    setInterestProfile((current) => {
      const next = learnFromStory(current, vector, weight);
      window.localStorage.setItem(INTEREST_PROFILE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const updatePreferences = (next: AppPreferences) => {
    setPreferences(next);
    savePreferences(window.localStorage, next);
    if (!next.followedState) setStateOnly(false);
    if (activeDomain !== "Latest" && !next.enabledDomains.includes(activeDomain)) setActiveDomain("Latest");
  };

  const resetInterestProfile = () => {
    window.localStorage.removeItem(INTEREST_PROFILE_KEY);
    setInterestProfile(null);
    setLocationMessage("Your learned reading interests were reset.");
  };

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationMessage("Location is not supported by this browser. Choose your state manually instead.");
      return;
    }
    setLocating(true);
    setLocationMessage(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const state = resolveState(coords.latitude, coords.longitude);
        setLocating(false);
        if (!state) {
          setLocationMessage("Your location could not be resolved to an Indian state. Choose one manually instead.");
          return;
        }
        setPreferences((current) => {
          const next = { ...current, followedState: state };
          savePreferences(window.localStorage, next);
          return next;
        });
        setLocationMessage(`${state} was saved. Your coordinates were not stored.`);
      },
      (error) => {
        setLocating(false);
        setLocationMessage(error.code === error.PERMISSION_DENIED
          ? "Location permission was not granted. You can still choose your state manually."
          : "Your state could not be detected. Choose it manually instead.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 30 * 60_000 },
    );
  };

  const currentNavigationState = (overrides: Partial<AppNavigationState> = {}): AppNavigationState => ({
    cyberChronicle: true,
    tab: mobileTab,
    settingsPage,
    domain: activeDomain,
    edition: edition === "general" ? "general" : undefined,
    storyId: selected?.id ?? null,
    ...overrides,
  });

  const commitNavigation = (state: AppNavigationState, mode: "push" | "replace" = "push") => {
    const method = mode === "push" ? "pushState" : "replaceState";
    window.history[method](state, "", navigationUrl(window.location.href, state));
  };

  const markAsRead = (item: RealIntelligenceItem, addToHistory = true, trackInterest = true) => {
    feedScrollY.current = window.scrollY;
    navigator.vibrate?.(12);
    if (trackInterest) recordInterest(item.id, 1);
    setSelected(item);
    if (addToHistory) {
      commitNavigation(currentNavigationState({ storyId: item.id }));
    }
    if (computeIntelligenceType(item) === "Official Advisory" && !readAlerts.includes(item.id)) {
      setReadAlerts((current) => {
        if (current.includes(item.id)) return current;
        const next = [...current, item.id];
        window.localStorage.setItem("cyber-chronicle-read-alerts", JSON.stringify(next));
        return next;
      });
    }
  };

  const openStoryById = useCallback(async (storyId: string, addToHistory = true, trackInterest = true) => {
    let item = data.items.find((story) => matchesStoryId(story, storyId))
      ?? readSavedArchive(window.localStorage).find((story) => matchesStoryId(story, storyId));
    if (!item) {
      try {
        const response = await fetch(dataUrl, { cache: "no-store", headers: { accept: "application/json" } });
        const payload = await response.json() as RealIntelligenceResponse;
        if (payload && Array.isArray(payload.items)) {
          item = payload.items.find((story) => matchesStoryId(story, storyId));
          if (item) setData(payload);
        }
      } catch {
        // ignore network error
      }
    }
    if (item) {
      markAsRead(item, addToHistory, trackInterest);
    } else {
      setSelected(null);
      setAppNotice("This story is no longer available in the current edition.");
    }
  }, [data.items, dataUrl, readAlerts]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const applyNavigation = (state: AppNavigationState) => {
      setMobileTab(state.tab);
      setSettingsPage(state.tab === "settings" ? state.settingsPage : "hub");
      setActiveDomain(state.tab === "home" ? state.domain : "Latest");
      setEdition(state.edition ?? "cyber");
      setMobileMenu(false);
      if (state.storyId) void openStoryById(state.storyId, false, false);
      else setSelected(null);
    };

    if (!historyInitialized.current) {
      historyInitialized.current = true;
      const requested = navigationStateFromUrl(window.location.href);
      if (requested.storyId) {
        const base = { ...requested, storyId: null };
        window.history.replaceState(base, "", navigationUrl(window.location.href, base));
        window.history.pushState(requested, "", navigationUrl(window.location.href, requested));
      } else {
        window.history.replaceState(requested, "", navigationUrl(window.location.href, requested));
      }
      applyNavigation(requested);
    }

    const handlePopState = (event: PopStateEvent) => {
      const state = isAppNavigationState(event.state)
        ? event.state
        : navigationStateFromUrl(window.location.href);
      applyNavigation(state);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [openStoryById]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source === navigator.serviceWorker.controller && event.data?.type === "NAVIGATE"
        && isStoryId(event.data.storyId)) {
        void openStoryById(event.data.storyId);
      }
    };
    navigator.serviceWorker?.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", handleMessage);
  }, [openStoryById]);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const domainCount = (domain: Domain) =>
    ordered.filter((item) => computeDomain(item) === domain).length;

  const handleTabChange = (tab: MobileTab) => {
    if (tab === mobileTab) {
      if (window.scrollY > 20) window.scrollTo({ top: 0, behavior: "smooth" });
      else void refresh(true);
      return;
    }
    const nextSettingsPage: SettingsPage = tab === "settings" ? settingsPage : "hub";
    const nextDomain = tab === "home" ? "Latest" : activeDomain;
    commitNavigation(currentNavigationState({ tab, settingsPage: nextSettingsPage, domain: nextDomain, storyId: null }));
    setSelected(null);
    setMobileTab(tab);
    if (tab !== "settings") {
      setSettingsPage("hub");
    }
    if (tab === "intelligence") {
      setQuery("");
      setActiveDomain("Latest");
    }
    if (tab === "alerts") {
      setIntelFilter("Official Advisory");
    }
    if (tab === "home") {
      setActiveDomain("Latest");
      setQuery("");
    }
    if (tab === "learn") {
      setQuery("");
      setActiveDomain("Latest");
    }
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (event.key === "/") { event.preventDefault(); document.querySelector<HTMLInputElement>(".header-search input")?.focus(); return; }
      if (event.key === "?") { setAppNotice("Shortcuts: j/k next or previous story · o open · s save · b close · / search"); return; }
      if (event.key === "b" && selected) { event.preventDefault(); window.history.back(); return; }
      if (!filtered.length) return;
      const currentIndex = Math.max(0, filtered.findIndex((item) => item.id === selected?.id));
      if (event.key === "j" || event.key === "k") { event.preventDefault(); const offset = event.key === "j" ? 1 : -1; markAsRead(filtered[(currentIndex + offset + filtered.length) % filtered.length]); }
      if (event.key === "o" && !selected) markAsRead(filtered[0]);
      if (event.key === "s" && selected) { event.preventDefault(); toggleSaved(selected.id); }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [filtered, selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSettingsPageChange = (page: SettingsPage) => {
    commitNavigation(currentNavigationState({ tab: "settings", settingsPage: page, storyId: null }));
    setMobileTab("settings");
    setSelected(null);
    setSettingsPage(page);
  };

  const handleDomainChange = (domain: Domain | "Latest") => {
    commitNavigation(currentNavigationState({ tab: "home", settingsPage: "hub", domain, storyId: null }));
    setActiveDomain(domain);
    setMobileMenu(false);
    setMobileTab("home");
    setSettingsPage("hub");
    setSelected(null);
    setStateOnly(false);
    setVisibleStoryCount(24);
  };

  const handleEditionChange = (next: "cyber" | "general") => {
    if (next === edition && mobileTab === "home") return;
    commitNavigation(currentNavigationState({ tab: "home", domain: "Latest", edition: next === "general" ? "general" : undefined, storyId: null }));
    setEdition(next);
    setFilters(EMPTY_FILTERS);
    setVisibleStoryCount(24);
    setActiveDomain("Latest");
    setStateOnly(false);
    setSelected(null);
    setMobileTab("home");
  };

  const relatedItems = (intelligenceIndex?.stories[selected?.id || ""]?.relatedIds || [])
    .map((id) => data.items.find((item) => item.id === id))
    .filter((item): item is RealIntelligenceItem => Boolean(item));

  /* ---- Saved View ---- */
  const savedView = (
    <div className="saved-view">
      <div className="saved-header">
        <h1>Saved Stories</h1>
        <small>{savedItems.length} {savedItems.length === 1 ? "story" : "stories"} saved</small>
      </div>
      {savedItems.length === 0 ? (
        <div className="saved-empty">
          <ShieldCheck size={40} />
          <h2>No saved stories yet</h2>
          <p>Tap the bookmark icon on any story to save it here for later reading.</p>
        </div>
      ) : (
        <div className="saved-list">
          {savedItems.map((item) => (
            <NewsCard key={item.id} item={item} variant="compact" saved onSave={() => toggleSaved(item.id)} onOpen={() => markAsRead(item)} />
          ))}
        </div>
      )}
    </div>
  );

  /* ---- Intelligence View ---- */
  let intelList = intelligenceOrdered;
  if (intelFilter === "High Severity") {
    intelList = intelList.filter(item => item.metadata?.type === "cyber" && (item.metadata.severity === "Critical" || item.metadata.severity === "High"));
  } else if (intelFilter !== "All") {
    intelList = intelList.filter(item => computeIntelligenceType(item) === intelFilter || computeDomain(item) === intelFilter);
  }

  const intelligenceView = (
    <div className="search-view">
      <div className="search-view-header">
        <h1>Intelligence Explorer</h1>
      </div>
      <div className="intelligence-filters">
        <strong id="intelligence-filter-label">Filter by intelligence type</strong>
        <div className="intelligence-filter-rail" role="toolbar" aria-labelledby="intelligence-filter-label">
          {["All", "Official Advisory", "High Severity", "Threat Intelligence", "Data Breach", "Vulnerability", "India", "AI & Technology"].map(filter => (
            <button
              key={filter}
              className={intelFilter === filter ? "active" : ""}
              onClick={() => setIntelFilter(filter)}
              aria-pressed={intelFilter === filter}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
      <div className="search-results">
        <small>{intelList.length} {intelList.length === 1 ? "result" : "results"}</small>
        {intelList.map((item) => (
          <NewsCard key={item.id} item={item} variant="compact" saved={isSavedStory(item, saved)} onSave={() => toggleSaved(item.id)} onOpen={() => markAsRead(item)} />
        ))}
        {intelList.length === 0 && <p className="search-no-results">No stories match</p>}
      </div>
    </div>
  );

  /* ---- Alerts View ---- */
  const alertsView = (
    <div className="alerts-view">
      <div className="alerts-view-header">
        <h1>Security Alerts</h1>
        <small>{alerts.length} active alerts</small>
      </div>
      <div className="alerts-full-list">
        {alerts.map((item, index) => (
          <button className="alert-news-item" key={item.id} onClick={() => markAsRead(item)}>
            <span className="alert-number">{String(index + 1).padStart(2, "0")}</span>
            <div><span>{verificationLabel(item)}</span><h3>{plainTitle(item)}</h3><p>{beginnerExplanation(item)}</p><small>{formatDate(item.publishedAt)} · {item.primaryPublisher}</small></div>
            <ChevronRight size={18} />
          </button>
        ))}
      </div>
    </div>
  );

  /* ---- View Router ---- */
  const activeView = (() => {
    switch (mobileTab) {
      case "alerts": return alertsView;
      case "intelligence": return intelligenceView;
      case "saved": return savedView;
      case "settings": return <SettingsScreen
        data={data} settingsPage={settingsPage} preferences={preferences} theme={theme} toggleTheme={toggleTheme}
        handleSettingsPageChange={handleSettingsPageChange} installPrompt={Boolean(installPrompt)} install={() => void install()}
        isOnline={isOnline} updatePreferences={updatePreferences} requestLocation={requestLocation} locating={locating}
        locationMessage={locationMessage} followedStateStoryCount={followedStateStoryCount}
        hasInterestProfile={Boolean(interestProfile)} resetInterestProfile={resetInterestProfile} saved={saved}
        onImportSaved={(items) => {
          setSaved(items);
          window.localStorage.setItem("cyber-chronicle-saved", JSON.stringify(items));
        }}
      />;
      case "learn": return <AcademyView progress={academyProgress} onProgressChange={setAcademyProgress} stories={cyberItems} onOpenStory={markAsRead} />;
      default: return <HomeScreen data={data} edition={edition} editionItems={editionItems} activeDomain={activeDomain}
        visibleDomains={visibleDomains} query={query} filters={filters} isScopedView={isScopedView} isRefreshing={isRefreshing}
        filteredCount={filtered.length} stateOnly={stateOnly} followedState={preferences.followedState} stateFilterAvailable={stateFilterAvailable}
        followedStateStoryCount={followedStateStoryCount} personalized={Boolean(interestProfile && interestProfile.engagementCount >= 2)}
        currentLessonTitle={currentLesson?.title} saved={saved} visibleStoryCount={visibleStoryCount} hero={hero}
        activeBreakingStory={activeBreakingStory} briefingStories={briefingStories} remainingFilteredStories={remainingFilteredStories}
        sections={{ activeThreats, threatIntel, breaches, aiTech, globalIntel, india, enterprise, latestFeed }}
        markAsRead={markAsRead} toggleSaved={toggleSaved} handleTabChange={handleTabChange} handleDomainChange={handleDomainChange}
        handleSettingsPageChange={handleSettingsPageChange} domainCount={domainCount} setStateOnly={setStateOnly}
        setFilters={(value) => { setFilters(value); setVisibleStoryCount(24); }}
        onShowMore={() => setVisibleStoryCount((count) => count + 24)} onClearQuery={() => setQuery("")} onRefresh={() => void refresh(true)} />;
    }
  })();

  return (
    <MotionConfig reducedMotion="user">
    <WatchlistContext.Provider value={preferences.watchlist}>
    <div className="publication-shell" data-density={preferences.density}>
      {!isOnline && (
        <div className="offline-banner">
          <WifiOff size={14} />
          <span>You&apos;re offline — reading saved edition</span>
        </div>
      )}

      <EditionHeader data={data} now={rankingNow} edition={edition} domain={activeDomain} domains={visibleDomains}
        query={query} mobileMenu={mobileMenu} isOnline={isOnline} isRefreshing={isRefreshing} canInstall={Boolean(installPrompt)}
        theme={theme} breaking={activeBreakingStory} refreshMessage={refreshMessage} notice={appNotice}
        onEditionChange={handleEditionChange} onDomainChange={handleDomainChange} onQueryChange={(value) => {
          if (mobileTab !== "home") handleDomainChange("Latest");
          setQuery(value);
          setVisibleStoryCount(24);
        }} onToggleMenu={() => setMobileMenu((value) => !value)} onToggleTheme={toggleTheme}
        onRefresh={() => void refresh(true)} onInstall={() => void install()}
        onOpenSources={() => handleSettingsPageChange("sources")} onOpenStory={markAsRead}
        onDismissRefresh={() => setRefreshMessage(null)} onDismissNotice={() => setAppNotice(null)} />

      <PullToRefresh onRefresh={() => refresh(true)}>
        {activeView}
      </PullToRefresh>

      <footer className="site-footer">
        <div className="footer-brand"><strong>{PROJECT.name}</strong><span>Trusted Cybersecurity News. Simplified.</span></div>
        <div><a href={`${SITE_BASE_PATH}/digest/`}>Daily &amp; weekly digest</a><a href={`${SITE_BASE_PATH}/feed.xml`}>RSS</a><a href="#standards">Editorial Standards</a><a href={`${PROJECT.repository}/issues/new/choose`}>Feedback</a><button onClick={() => void refresh(true)}>Refresh Edition</button></div>
        <div className="footer-creator"><span>Built & maintained by <strong>{PROJECT.creator.name}</strong></span><nav aria-label="Creator profiles">{CREATOR_LINKS.map((link) => <a key={link.key} href={link.href} target="_blank" rel="noopener noreferrer">{link.label}<ExternalLink size={10} aria-hidden="true" /></a>)}</nav></div>
        <small>Live source metadata · Original plain-language explanations · Every story links to evidence</small>
      </footer>

      <MobileTabBar
        active={mobileTab}
        onChange={handleTabChange}
        alertCount={alerts.filter(item => !readAlerts.includes(item.id)).length}
        savedCount={saved.length}
      />
      {showBackTop && <button className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">↑</button>}

      {selected && (
        <ArticleReader key={selected.id} item={selected} relatedItems={relatedItems} navigationItems={filtered} onOpenRelated={markAsRead} saved={isSavedStory(selected, saved)} onSave={() => toggleSaved(selected.id)} onClose={() => window.history.back()} />
      )}
    </div>
    </WatchlistContext.Provider>
    </MotionConfig>
  );
}
