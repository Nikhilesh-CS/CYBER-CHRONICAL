"use client";

import {
  ArrowRight, Check, ChevronRight, Download,
  ExternalLink, Menu, Moon, RefreshCw, Search, ShieldCheck, Sun, X, Wifi, WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { RealIntelligenceItem, RealIntelligenceResponse } from "../lib/news";
import {
  formatDate, plainTitle, relativeTime, verificationLabel,
  breakingScore, computeDomain, computeIntelligenceType, isBreakingStory,
  matchesStoryQuery, storiesForDomain, domains, type Domain
} from "../lib/editorial";
import { learnFromStory, rankForReader, readInterestProfile, INTEREST_PROFILE_KEY } from "../lib/intelligence/client";
import type { IntelligenceIndex, InterestProfile } from "../lib/intelligence/types";
import { beginnerExplanation } from "../lib/explanations";
import {
  isAppNavigationState, navigationStateFromUrl, navigationUrl,
  type AppNavigationState, type SettingsPage,
} from "../lib/navigation";
import { NewsCard } from "./components/cards/NewsCard";
import { ArticleReader } from "./components/article/ArticleReader";
import { SectionHeading } from "./components/shared/SectionHeading";
import { MobileTabBar, type MobileTab } from "./components/app-shell/MobileTabBar";
import { PullToRefresh } from "./components/app-shell/PullToRefresh";
import { NotificationManager } from "./components/app-shell/NotificationManager";
import { AboutView } from "./components/settings/views/AboutView";
import { CreatorView } from "./components/settings/views/CreatorView";
import { OperatorView } from "./components/settings/views/OperatorView";
import { StandardsView } from "./components/settings/views/StandardsView";
import { SourcesView } from "./components/settings/views/SourcesView";
import { PrivacyView } from "./components/settings/views/PrivacyView";
import { DisclaimerView } from "./components/settings/views/DisclaimerView";
import { CreditsView } from "./components/settings/views/CreditsView";
import { SettingsRow } from "./components/settings/SettingsRow";

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
  dataUrl = "/data/news.json",
  serviceWorkerUrl = "/service-worker.js",
}: {
  initialData?: RealIntelligenceResponse;
  dataUrl?: string;
  serviceWorkerUrl?: string;
}) {
  const [data, setData] = useState(initialData);
  const [selected, setSelected] = useState<RealIntelligenceItem | null>(null);
  const [query, setQuery] = useState("");
  const [activeDomain, setActiveDomain] = useState<Domain | "Latest">("Latest");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [saved, setSaved] = useState<string[]>([]);
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
  const [rankingNow, setRankingNow] = useState(() => Date.now());
  const historyInitialized = useRef(false);

  const refresh = useCallback(async (force = false) => {
    setIsRefreshing(true);
    if (force) setRefreshMessage("Loading the latest published free edition…");
    try {
      const separator = dataUrl.includes("?") ? "&" : "?";
      const response = await fetch(`${dataUrl}${separator}t=${Date.now()}`, { cache: "no-store", headers: { accept: "application/json" } });
      const payload = await response.json() as RealIntelligenceResponse;
      if (!payload || !Array.isArray(payload.items)) throw new Error("Invalid newsroom response");
      setData(payload);
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
    const storedSaved = window.localStorage.getItem("cyber-chronicle-saved");
    const storedReadAlerts = window.localStorage.getItem("cyber-chronicle-read-alerts");
    const restore = window.setTimeout(() => {
      setIsOnline(navigator.onLine);
      if (storedTheme === "dark") {
        setTheme("dark");
        document.documentElement.dataset.theme = "dark";
      }
      if (storedSaved) {
        try { setSaved(JSON.parse(storedSaved)); } catch { setSaved([]); }
      }
      if (storedReadAlerts) {
        try { setReadAlerts(JSON.parse(storedReadAlerts)); } catch { setReadAlerts([]); }
      }
    }, 0);
    const timer = window.setInterval(() => void refresh(), 5 * 60_000);
    const resume = () => void refresh();
    window.addEventListener("focus", resume);
    window.addEventListener("online", () => { setIsOnline(true); resume(); });
    window.addEventListener("offline", () => setIsOnline(false));
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
      window.removeEventListener("beforeinstallprompt", onInstall);
    };
  }, [refresh, serviceWorkerUrl]);

  useEffect(() => {
    const checkForLocalNotifications = async () => {
      if (!("serviceWorker" in navigator)) return;
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({ type: "CHECK_LOCAL_NOTIFICATIONS", items: data.items });
    };
    void checkForLocalNotifications();
    window.addEventListener("cyber-chronicle-notifications-configured", checkForLocalNotifications);
    return () => window.removeEventListener("cyber-chronicle-notifications-configured", checkForLocalNotifications);
  }, [data.items]);

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
    const restore = window.setTimeout(() => setInterestProfile(readInterestProfile()), 0);
    const timer = window.setInterval(() => setRankingNow(Date.now()), 60_000);
    return () => { window.clearTimeout(restore); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    document.body.style.overflow = selected ? "hidden" : "";
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

  const ordered = useMemo(
    () => [...data.items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [data.items],
  );
  
  const intelligenceOrdered = useMemo(
    () => rankForReader(data.items, intelligenceIndex, interestProfile),
    [data.items, intelligenceIndex, interestProfile],
  );

  const domainStories = useMemo(
    () => storiesForDomain(intelligenceOrdered, activeDomain),
    [activeDomain, intelligenceOrdered],
  );
  const filtered = useMemo(
    () => domainStories.filter((item) => matchesStoryQuery(item, query)),
    [domainStories, query],
  );

  const breakingStories = useMemo(() => intelligenceOrdered
    .filter((item) => isBreakingStory(item, rankingNow, intelligenceIndex?.stories[item.id]?.corroborationVelocity || 0))
    .sort((left, right) => breakingScore(right, rankingNow, intelligenceIndex?.stories[right.id]?.corroborationVelocity || 0)
      - breakingScore(left, rankingNow, intelligenceIndex?.stories[left.id]?.corroborationVelocity || 0)),
  [intelligenceIndex, intelligenceOrdered, rankingNow]);
  const breakingStory = breakingStories[0] ?? null;
  const activeBreakingStory = breakingStories.find((story) => filtered.some((item) => item.id === story.id)) ?? null;
  const hero = activeBreakingStory ?? filtered[0] ?? null;
  const editionHero = breakingStory ?? intelligenceOrdered[0] ?? ordered[0] ?? null;
  const headlineStory = hero ?? editionHero;
  const briefingStories = filtered.filter(item => item.id !== hero?.id).slice(0, 4);
  const leadStoryIds = new Set([hero?.id, ...briefingStories.map((item) => item.id)].filter(Boolean));
  const remainingFilteredStories = filtered.filter((item) => !leadStoryIds.has(item.id));
  const isScopedView = Boolean(query.trim()) || activeDomain !== "Latest";

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
  const currentSources = data.sources.filter((source) => source.status === "current").length;
  const savedItems = ordered.filter((item) => saved.includes(item.id));

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("cyber-chronicle-theme", next);
  };

  const toggleSaved = (id: string) => {
    setSaved((current) => {
      const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
      if (!current.includes(id)) recordInterest(id, 3);
      window.localStorage.setItem("cyber-chronicle-saved", JSON.stringify(next));
      return next;
    });
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

  const currentNavigationState = (overrides: Partial<AppNavigationState> = {}): AppNavigationState => ({
    cyberChronicle: true,
    tab: mobileTab,
    settingsPage,
    domain: activeDomain,
    storyId: selected?.id ?? null,
    ...overrides,
  });

  const commitNavigation = (state: AppNavigationState, mode: "push" | "replace" = "push") => {
    const method = mode === "push" ? "pushState" : "replaceState";
    window.history[method](state, "", navigationUrl(window.location.href, state));
  };

  const markAsRead = (item: RealIntelligenceItem, addToHistory = true, trackInterest = true) => {
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
    let item = data.items.find(x => x.id === storyId);
    if (!item) {
      try {
        const response = await fetch(dataUrl, { cache: "no-store", headers: { accept: "application/json" } });
        const payload = await response.json() as RealIntelligenceResponse;
        if (payload && Array.isArray(payload.items)) {
          item = payload.items.find(x => x.id === storyId);
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
      if (event.data && event.data.type === "NAVIGATE") {
        const url = new URL(event.data.url, window.location.origin);
        const storyId = url.searchParams.get("story");
        if (storyId) {
          void openStoryById(storyId);
        }
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
  };

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
  };

  if (!editionHero || !headlineStory) {
    return (
      <main className="empty-edition">
        <div className="wordmark">Cyber Chronicle</div>
        <h1>The live edition is temporarily unavailable.</h1>
        <p>{data.notice}</p>
        <button onClick={() => void refresh(true)}><RefreshCw size={16} />Try again</button>
      </main>
    );
  }

  const relatedItems = (intelligenceIndex?.stories[selected?.id || ""]?.relatedIds || [])
    .map((id) => data.items.find((item) => item.id === id))
    .filter((item): item is RealIntelligenceItem => Boolean(item));

  /* ---- Settings View ---- */
  const settingsHub = (
    <div className="settings-view">
      <div className="settings-header">
        <h1>Settings</h1>
        <small>Customize your Cyber Chronicle experience</small>
      </div>

      <div className="settings-group">
        <strong>Appearance</strong>
        <SettingsRow 
          icon={theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          title={theme === "light" ? "Dark mode" : "Light mode"}
          description={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          onClick={toggleTheme}
        />
      </div>

      <div className="settings-group">
        <strong>Notifications</strong>
        <NotificationManager />
      </div>

      <div className="settings-group">
        <strong>Intelligence & Data</strong>
        <SettingsRow icon={<ShieldCheck size={18} />} title="Intelligence Sources" description={`${data.sources.length} active sources reporting`} onClick={() => handleSettingsPageChange("sources")} />
        <SettingsRow icon={<Check size={18} />} title="Editorial Standards" description="How we verify and classify" onClick={() => handleSettingsPageChange("standards")} />
        <SettingsRow icon={<ShieldCheck size={18} />} title="Privacy & Data" description="How notifications use your data" onClick={() => handleSettingsPageChange("privacy")} />
      </div>

      <div className="settings-group">
        <strong>About</strong>
        <SettingsRow icon={<ExternalLink size={18} />} title="About Cyber Chronicle" onClick={() => handleSettingsPageChange("about")} />
        <SettingsRow icon={<ExternalLink size={18} />} title="Creator" onClick={() => handleSettingsPageChange("creator")} />
        <SettingsRow icon={<ExternalLink size={18} />} title="Operator Information" onClick={() => handleSettingsPageChange("operator")} />
        <SettingsRow icon={<ExternalLink size={18} />} title="Disclaimer" onClick={() => handleSettingsPageChange("disclaimer")} />
        <SettingsRow icon={<ExternalLink size={18} />} title="Credits & Attribution" onClick={() => handleSettingsPageChange("credits")} />
      </div>

      <div className="settings-group">
        <strong>App</strong>
        {installPrompt && (
          <SettingsRow icon={<Download size={18} />} title="Install Cyber Chronicle" description="Add to your home screen for quick access" onClick={() => void install()} />
        )}
        <SettingsRow 
          icon={isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
          title={isOnline ? "Online" : "Offline"}
          description={isOnline ? `${currentSources}/${data.sources.length} sources reporting` : "Reading cached edition"}
        />
      </div>
    </div>
  );

  const settingsView = (() => {
    switch (settingsPage) {
      case "about": return <AboutView onBack={() => window.history.back()} />;
      case "creator": return <CreatorView onBack={() => window.history.back()} />;
      case "operator": return <OperatorView onBack={() => window.history.back()} />;
      case "standards": return <StandardsView onBack={() => window.history.back()} />;
      case "sources": return <SourcesView onBack={() => window.history.back()} sources={data.sources} />;
      case "privacy": return <PrivacyView onBack={() => window.history.back()} />;
      case "disclaimer": return <DisclaimerView onBack={() => window.history.back()} />;
      case "credits": return <CreditsView onBack={() => window.history.back()} />;
      default: return settingsHub;
    }
  })();

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
      <div className="search-suggestions" style={{ marginBottom: "16px" }}>
        <strong>Filter by intelligence type</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
          {["All", "Official Advisory", "High Severity", "Threat Intelligence", "Data Breach", "Vulnerability", "India", "AI & Technology"].map(filter => (
            <button 
              key={filter} 
              onClick={() => setIntelFilter(filter)}
              style={{ 
                padding: "6px 12px", 
                borderRadius: "16px", 
                border: intelFilter === filter ? "1px solid var(--blue-600)" : "1px solid var(--border)",
                background: intelFilter === filter ? "var(--blue-50)" : "transparent",
                color: intelFilter === filter ? "var(--blue-700)" : "var(--foreground)"
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
      <div className="search-results">
        <small>{intelList.length} {intelList.length === 1 ? "result" : "results"}</small>
        {intelList.map((item) => (
          <NewsCard key={item.id} item={item} variant="compact" saved={saved.includes(item.id)} onSave={() => toggleSaved(item.id)} onOpen={() => markAsRead(item)} />
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

  /* ---- Home Feed ---- */
  const homeFeed = (
    <main className="news-home">
      {interestProfile && interestProfile.engagementCount >= 2 && (
        <motion.div className="interest-strip" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <span>FOR YOU</span>
          <p>Stories are now balanced using your reading and saved-story interests. Critical alerts always keep editorial priority.</p>
        </motion.div>
      )}
      {(query || activeDomain !== "Latest") && (
        <div className="results-banner">
          <div><span>Viewing</span><h1>{query ? `Search: "${query}"` : activeDomain}</h1></div>
          <b>{filtered.length} stories</b>
        </div>
      )}

      {hero ? (
        <section className={`lead-grid ${activeBreakingStory ? "lead-grid-breaking" : ""}`} aria-label="Lead stories">
          {activeBreakingStory && <motion.div className="breaking-hero-label" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}><i />LIVE BREAKING INTELLIGENCE</motion.div>}
          <NewsCard
            item={hero}
            variant="lead"
            saved={savedItems.some(s => s.id === hero.id)}
            onOpen={() => markAsRead(hero)}
            onSave={() => toggleSaved(hero.id)}
          />

          <aside className="top-stories">
            <SectionHeading kicker="Intelligence Briefing" title="Top Assessments" />
            <div className="briefing-assessments-grid">
              {briefingStories.map((item) => (
                <NewsCard
                  key={item.id}
                  item={item}
                  variant="compact"
                  saved={savedItems.some(s => s.id === item.id)}
                  onOpen={() => markAsRead(item)}
                  onSave={() => toggleSaved(item.id)}
                />
              ))}
            </div>
          </aside>
        </section>
      ) : (
        <section className="search-empty-state" aria-live="polite">
          <Search size={28} />
          <h2>No matching stories in this edition</h2>
          <p>Try fewer words, check the spelling, or search all sections. Search matches each word across headlines, summaries, categories, publishers, and advisory details.</p>
          <button onClick={() => { setQuery(""); handleDomainChange("Latest"); }}>Browse the latest edition</button>
        </section>
      )}

      {isScopedView && remainingFilteredStories.length > 0 && (
        <section className="news-section scoped-results" aria-label="More matching stories">
          <SectionHeading kicker="More results" title="All Matching Stories" />
          <div className="four-card-grid">
            {remainingFilteredStories.map((item) => <NewsCard key={item.id} item={item} variant="standard" saved={saved.includes(item.id)} onSave={() => toggleSaved(item.id)} onOpen={() => markAsRead(item)} />)}
          </div>
        </section>
      )}

      {!isScopedView && <>
      <section className="trust-ribbon" aria-label="Newsroom transparency">
        <div><ShieldCheck size={20} /><span><strong>Evidence first</strong>Every story links to its sources</span></div>
        <div><Check size={20} /><span><strong>Clear status</strong>Developing reports are labelled</span></div>
        <div><RefreshCw size={20} /><span><strong>Updated regularly</strong>Free automation checks sources throughout the day</span></div>
        <a href="#standards">Our standards<ArrowRight size={14} /></a>
      </section>

      <section className="news-section" id="alerts">
        <SectionHeading kicker="Need to know" title="Active Threats & Advisories" action="View all alerts" onAction={() => handleTabChange("alerts")} />
        <div className="alert-news-grid">
          {activeThreats.map((item) => (
            <NewsCard
              key={item.id}
              item={item}
              variant="alert"
              saved={savedItems.some(s => s.id === item.id)}
              onOpen={() => markAsRead(item)}
              onSave={() => toggleSaved(item.id)}
            />
          ))}
        </div>
      </section>

      <section className="news-section">
        <SectionHeading kicker="Analysis & Campaigns" title="Threat Intelligence" action="Filter by type" onAction={() => handleTabChange("intelligence")} />
        <div className="four-card-grid">
          {threatIntel.map((item, index) => <NewsCard key={item.id} item={item} variant={index === 0 ? "feature" : "standard"} saved={saved.includes(item.id)} onSave={() => toggleSaved(item.id)} onOpen={() => markAsRead(item)} />)}
        </div>
      </section>

      <section className="split-news">
        <div className="news-section">
          <SectionHeading kicker="Your information" title="Breaches & Incidents" />
          <div className="stacked-news">
            {breaches.map((item) => <NewsCard key={item.id} item={item} variant="compact" saved={saved.includes(item.id)} onSave={() => toggleSaved(item.id)} onOpen={() => markAsRead(item)} />)}
          </div>
        </div>
        <div className="news-section">
          <SectionHeading kicker="The future" title="AI & Emerging Technology" />
          <div className="stacked-news">
            {aiTech.map((item) => <NewsCard key={item.id} item={item} variant="compact" saved={saved.includes(item.id)} onSave={() => toggleSaved(item.id)} onOpen={() => markAsRead(item)} />)}
          </div>
        </div>
      </section>

      <section className="news-section">
        <SectionHeading kicker="Across the internet" title="Global Intelligence" />
        <div className="four-card-grid">
          {globalIntel.map((item, index) => <NewsCard key={item.id} item={item} variant={index === 0 ? "feature" : "standard"} saved={saved.includes(item.id)} onSave={() => toggleSaved(item.id)} onOpen={() => markAsRead(item)} />)}
        </div>
      </section>

      <section className="split-news">
        <div className="news-section">
          <SectionHeading kicker="National" title="India Intelligence" />
          <div className="stacked-news">
            {india.map((item) => <NewsCard key={item.id} item={item} variant="compact" saved={saved.includes(item.id)} onSave={() => toggleSaved(item.id)} onOpen={() => markAsRead(item)} />)}
          </div>
        </div>
        <div className="news-section">
          <SectionHeading kicker="Business" title="Enterprise & Industry" />
          <div className="stacked-news">
            {enterprise.map((item) => <NewsCard key={item.id} item={item} variant="compact" saved={saved.includes(item.id)} onSave={() => toggleSaved(item.id)} onOpen={() => markAsRead(item)} />)}
          </div>
        </div>
      </section>

      <section className="daily-briefing">
        <div className="briefing-intro"><span>RAW FEED</span><h2>Latest Feed</h2><p>The raw chronological stream of all reported events.</p><small>{formatDate(data.generatedAt, true)} IST</small></div>
        <ol>
          {latestFeed.map((item) => <li key={item.id}><button onClick={() => markAsRead(item)}><span>{computeDomain(item)}</span><strong>{plainTitle(item)}</strong><ArrowRight size={15} /></button></li>)}
        </ol>
      </section>

      <section className="trending-section">
        <div><span>Trending now</span><h2>What readers are following</h2></div>
        <div className="trend-list">
          {domains.map((domain, index) => <button key={domain} onClick={() => handleDomainChange(domain)}><b>{String(index + 1).padStart(2, "0")}</b><span>{domain}</span><em>{domainCount(domain)} stories</em></button>)}
        </div>
      </section>
      </>}

      <section className="standards-section" id="standards">
        <div><span>OUR PROMISE</span><h2>Trust is the story.</h2></div>
        <p>Cyber Chronicle separates confirmed facts from developing reports, shows the evidence behind every article, and never assigns risk or severity without source support.</p>
        <div className="standards-list"><span><Check size={16} />Original explanations</span><span><Check size={16} />Transparent sources</span><span><Check size={16} />No invented facts</span><span><Check size={16} />Plain-language reporting</span></div>
      </section>
    </main>
  );

  /* ---- View Router ---- */
  const activeView = (() => {
    switch (mobileTab) {
      case "alerts": return alertsView;
      case "intelligence": return intelligenceView;
      case "saved": return savedView;
      case "settings": return settingsView;
      default: return homeFeed;
    }
  })();

  return (
    <MotionConfig reducedMotion="user">
    <div className="publication-shell">
      {!isOnline && (
        <div className="offline-banner">
          <WifiOff size={14} />
          <span>You&apos;re offline — reading saved edition</span>
        </div>
      )}

      <header className="site-header">
        <div className="utility-bar">
          <span>{formatDate(new Date().toISOString())}</span>
          <span className="edition-status"><i />{isOnline ? "Free edition" : "Offline"} · {currentSources}/{data.sources.length} sources reporting</span>
          <div>
            {installPrompt && <button onClick={() => void install()}><Download size={14} />Install app</button>}
            <button onClick={() => void refresh(true)} disabled={isRefreshing || !isOnline}><RefreshCw className={isRefreshing ? "spin" : ""} size={14} />{isRefreshing ? "Updating" : "Refresh"}</button>
            <button onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>{theme === "light" ? <Moon size={15} /> : <Sun size={15} />}</button>
          </div>
        </div>

        <div className="masthead">
          <button className="mobile-menu-button" onClick={() => setMobileMenu((value) => !value)} aria-label="Open sections"><Menu size={22} /></button>
          <div className="masthead-title"><span className="brand-shield"><ShieldCheck size={22} /></span><div><strong>Cyber Chronicle</strong><small>Trusted Cybersecurity News. Simplified.</small></div></div>
          <label className="header-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the news" aria-label="Search the news" />{query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={15} /></button>}</label>
        </div>

        <nav className={mobileMenu ? "section-nav nav-open" : "section-nav"} aria-label="News sections">
          <button className={activeDomain === "Latest" ? "active" : ""} onClick={() => handleDomainChange("Latest")}>Latest</button>
          {domains.map((domain) => (
            <button key={domain} className={activeDomain === domain ? "active" : ""} onClick={() => handleDomainChange(domain)}>
              {domain}
            </button>
          ))}
        </nav>

        <motion.div
          key={activeBreakingStory?.id || headlineStory.id}
          className={`breaking-strip ${activeBreakingStory ? "breaking-active" : "breaking-latest"}`}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          <strong>{activeBreakingStory ? "BREAKING" : activeDomain === "Latest" ? "LATEST" : activeDomain.toUpperCase()}</strong>
          <button onClick={() => markAsRead(headlineStory)}><span>{plainTitle(headlineStory)}</span><ChevronRight size={15} /></button>
          <small>{relativeTime(headlineStory.publishedAt)}</small>
        </motion.div>
        {refreshMessage && <div className="refresh-note"><Check size={15} />{refreshMessage}<button onClick={() => setRefreshMessage(null)} aria-label="Dismiss update message"><X size={14} /></button></div>}
        <AnimatePresence>{appNotice && <motion.div className="refresh-note alert-banner" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><ShieldCheck size={15} /><span style={{ flex: 1 }}>{appNotice}</span><button onClick={() => setAppNotice(null)} aria-label="Dismiss"><X size={14} /></button></motion.div>}</AnimatePresence>
      </header>

      <PullToRefresh onRefresh={() => refresh(true)}>
        {activeView}
      </PullToRefresh>

      <footer className="site-footer">
        <div className="footer-brand"><strong>Cyber Chronicle</strong><span>Trusted Cybersecurity News. Simplified.</span></div>
        <div><a href="#alerts">Security Alerts</a><a href="#standards">Editorial Standards</a><button onClick={() => void refresh(true)}>Refresh Edition</button></div>
        <small>Live source metadata · Original plain-language explanations · Every story links to evidence</small>
      </footer>

      <MobileTabBar
        active={mobileTab}
        onChange={handleTabChange}
        alertCount={alerts.filter(item => !readAlerts.includes(item.id)).length}
        savedCount={saved.length}
      />

      {selected && (
        <ArticleReader key={selected.id} item={selected} relatedItems={relatedItems} onOpenRelated={markAsRead} saved={saved.includes(selected.id)} onSave={() => toggleSaved(selected.id)} onClose={() => window.history.back()} />
      )}
    </div>
    </MotionConfig>
  );
}
