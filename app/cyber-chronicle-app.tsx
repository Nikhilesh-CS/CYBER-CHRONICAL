"use client";

import {
  ArrowRight, Check, ChevronRight, Clock3, Download,
  ExternalLink, Menu, Moon, RefreshCw, Search, ShieldCheck, Sun, X, Wifi, WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { RealIntelligenceItem, RealIntelligenceResponse } from "../lib/news";
import {
  type EditorialCategory, categories, categorySlug, editorialCategory,
  formatDate, plainTitle, relativeTime, verificationLabel,
} from "../lib/editorial";
import { beginnerExplanation } from "../lib/explanations";
import { NewsCard } from "./components/cards/NewsCard";
import { ArticleReader } from "./components/article/ArticleReader";
import { StoryMeta } from "./components/shared/StoryMeta";
import { SectionHeading } from "./components/shared/SectionHeading";
import { ShareButton } from "./components/shared/ShareButton";
import { MobileTabBar, type MobileTab } from "./components/app-shell/MobileTabBar";
import { PullToRefresh } from "./components/app-shell/PullToRefresh";
import { NotificationManager } from "./components/app-shell/NotificationManager";

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
  const [activeCategory, setActiveCategory] = useState<EditorialCategory | "Latest">("Latest");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [saved, setSaved] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("home");
  const [isOnline, setIsOnline] = useState(true);

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
    const restore = window.setTimeout(() => {
      if (storedTheme === "dark") {
        setTheme("dark");
        document.documentElement.dataset.theme = "dark";
      }
      if (storedSaved) {
        try { setSaved(JSON.parse(storedSaved)); } catch { setSaved([]); }
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
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register(serviceWorkerUrl, { updateViaCache: "none" });
    setIsOnline(navigator.onLine);
    return () => {
      window.clearTimeout(restore);
      window.clearInterval(timer);
      window.removeEventListener("focus", resume);
      window.removeEventListener("beforeinstallprompt", onInstall);
    };
  }, [refresh, serviceWorkerUrl]);

  useEffect(() => {
    document.body.style.overflow = selected ? "hidden" : "";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
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
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ordered.filter((item) => {
      const categoryMatches = activeCategory === "Latest" || activeCategory === "Top Stories" || editorialCategory(item) === activeCategory;
      const searchMatches = !needle || `${plainTitle(item)} ${item.primaryPublisher} ${item.identifier}`.toLowerCase().includes(needle);
      return categoryMatches && searchMatches;
    });
  }, [activeCategory, ordered, query]);

  const hero = filtered[0] ?? ordered[0];
  const topStories = filtered.slice(1, 5);
  const alerts = ordered.filter((item) => editorialCategory(item) === "Active Security Alerts").slice(0, 4);
  const privacy = ordered.filter((item) => editorialCategory(item) === "Privacy & Data Breaches").slice(0, 4);
  const consumer = ordered.filter((item) => editorialCategory(item) === "Mobile & Consumer").slice(0, 4);
  const enterprise = ordered.filter((item) => editorialCategory(item) === "Company & Enterprise").slice(0, 4);
  const technology = ordered.filter((item) => editorialCategory(item) === "Technology & AI").slice(0, 4);
  const world = ordered.filter((item) => editorialCategory(item) === "World Cyber News").slice(0, 4);
  const editorPicks = ordered.filter((item) => item.verificationStatus !== "single-source" || item.sourceCategory === "security-research").slice(0, 3);
  const editionTime = Date.parse(data.generatedAt);
  const weeklyCutoff = Number.isFinite(editionTime) ? editionTime - 7 * 24 * 60 * 60 * 1_000 : 0;
  const weeklyHighlights = ordered.filter((item) => Date.parse(item.publishedAt) >= weeklyCutoff).slice(8, 12);
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
      window.localStorage.setItem("cyber-chronicle-saved", JSON.stringify(next));
      return next;
    });
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const categoryCount = (category: EditorialCategory) =>
    ordered.filter((item) => editorialCategory(item) === category).length;

  const handleTabChange = (tab: MobileTab) => {
    setMobileTab(tab);
    if (tab === "search") {
      setQuery("");
      setActiveCategory("Latest");
    }
    if (tab === "alerts") {
      setActiveCategory("Active Security Alerts");
    }
    if (tab === "home") {
      setActiveCategory("Latest");
      setQuery("");
    }
  };

  if (!hero) {
    return (
      <main className="empty-edition">
        <div className="wordmark">Cyber Chronicle</div>
        <h1>The live edition is temporarily unavailable.</h1>
        <p>{data.notice}</p>
        <button onClick={() => void refresh(true)}><RefreshCw size={16} />Try again</button>
      </main>
    );
  }

  /* ---- Settings View ---- */
  const settingsView = (
    <div className="settings-view">
      <div className="settings-header">
        <h1>Settings</h1>
        <small>Customize your Cyber Chronicle experience</small>
      </div>

      <div className="settings-group">
        <strong>Appearance</strong>
        <button className="settings-row" onClick={toggleTheme}>
          <span>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</span>
          <div><strong>{theme === "light" ? "Dark mode" : "Light mode"}</strong><small>Switch to {theme === "light" ? "dark" : "light"} theme</small></div>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="settings-group">
        <strong>Notifications</strong>
        <NotificationManager />
      </div>

      <div className="settings-group">
        <strong>App</strong>
        {installPrompt && (
          <button className="settings-row" onClick={() => void install()}>
            <span><Download size={18} /></span>
            <div><strong>Install Cyber Chronicle</strong><small>Add to your home screen for quick access</small></div>
            <ChevronRight size={16} />
          </button>
        )}
        <div className="settings-row settings-info">
          <span><ShieldCheck size={18} /></span>
          <div>
            <strong>About</strong>
            <small>Free edition · {data.sources.length} sources · {ordered.length} stories</small>
            <small>Last updated {formatDate(data.generatedAt, true)} IST</small>
          </div>
        </div>
      </div>

      <div className="settings-group">
        <strong>Connection</strong>
        <div className="settings-row settings-info">
          <span>{isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}</span>
          <div>
            <strong>{isOnline ? "Online" : "Offline"}</strong>
            <small>{isOnline ? `${currentSources}/${data.sources.length} sources reporting` : "Reading cached edition"}</small>
          </div>
        </div>
      </div>
    </div>
  );

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
            <NewsCard key={item.id} item={item} variant="compact" saved onSave={() => toggleSaved(item.id)} onOpen={() => setSelected(item)} />
          ))}
        </div>
      )}
    </div>
  );

  /* ---- Search View ---- */
  const searchView = (
    <div className="search-view">
      <div className="search-view-header">
        <h1>Search</h1>
        <label className="search-view-input">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search all cybersecurity news"
            aria-label="Search all cybersecurity news"
            autoFocus
          />
          {query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button>}
        </label>
      </div>
      {query ? (
        <div className="search-results">
          <small>{filtered.length} {filtered.length === 1 ? "result" : "results"}</small>
          {filtered.map((item) => (
            <NewsCard key={item.id} item={item} variant="compact" saved={saved.includes(item.id)} onSave={() => toggleSaved(item.id)} onOpen={() => setSelected(item)} />
          ))}
          {filtered.length === 0 && <p className="search-no-results">No stories match &ldquo;{query}&rdquo;</p>}
        </div>
      ) : (
        <div className="search-suggestions">
          <strong>Browse by category</strong>
          {categories.map((category) => (
            <button key={category} onClick={() => { setActiveCategory(category); setMobileTab("home"); }}>
              <span>{category}</span>
              <em>{categoryCount(category)} stories</em>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
      )}
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
        {ordered.filter((item) => editorialCategory(item) === "Active Security Alerts").map((item, index) => (
          <button className="alert-news-item" key={item.id} onClick={() => setSelected(item)}>
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
      {(query || activeCategory !== "Latest") && (
        <div className="results-banner">
          <div><span>Viewing</span><h1>{query ? `Search: "${query}"` : activeCategory}</h1></div>
          <b>{filtered.length} stories</b>
        </div>
      )}

      <section className="lead-grid" aria-label="Lead stories">
        <article className="lead-article">
          <button className="lead-click" onClick={() => setSelected(hero)} aria-label={`Read ${plainTitle(hero)}`} />
          <div className={`lead-visual art-${categorySlug(editorialCategory(hero))}`}>
            <span>CYBER CHRONICLE</span>
            <b>{editorialCategory(hero)}</b>
            <em>Verified reporting from the live newsroom</em>
          </div>
          <div className="lead-copy">
            <div className="lead-label"><span>{editorialCategory(hero)}</span><span>{hero.storyState === "developing" ? "Developing" : "Confirmed"}</span></div>
            <h1>{plainTitle(hero)}</h1>
            <p>{beginnerExplanation(hero)}</p>
            <StoryMeta item={hero} />
          </div>
        </article>

        <aside className="top-stories">
          <SectionHeading kicker="The latest" title="Top Stories" />
          {topStories.map((item, index) => (
            <button className="top-story" key={item.id} onClick={() => setSelected(item)}>
              <span>0{index + 1}</span>
              <div><small>{editorialCategory(item)}</small><h3>{plainTitle(item)}</h3><p>{relativeTime(item.publishedAt)} · {item.primaryPublisher}</p></div>
            </button>
          ))}
        </aside>
      </section>

      <section className="trust-ribbon" aria-label="Newsroom transparency">
        <div><ShieldCheck size={20} /><span><strong>Evidence first</strong>Every story links to its sources</span></div>
        <div><Check size={20} /><span><strong>Clear status</strong>Developing reports are labelled</span></div>
        <div><RefreshCw size={20} /><span><strong>Updated regularly</strong>Free automation checks sources throughout the day</span></div>
        <a href="#standards">Our standards<ArrowRight size={14} /></a>
      </section>

      <section className="news-section" id="alerts">
        <SectionHeading kicker="Need to know" title="Active Security Alerts" action="View all alerts" onAction={() => handleTabChange("alerts")} />
        <div className="alert-news-grid">
          {alerts.map((item, index) => (
            <button className="alert-news-item" key={item.id} onClick={() => setSelected(item)}>
              <span className="alert-number">{String(index + 1).padStart(2, "0")}</span>
              <div><span>{verificationLabel(item)}</span><h3>{plainTitle(item)}</h3><p>{beginnerExplanation(item)}</p><small>{formatDate(item.publishedAt)} · {item.primaryPublisher}</small></div>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      </section>

      <section className="news-section">
        <SectionHeading kicker="Across the internet" title="World Cyber News" />
        <div className="four-card-grid">
          {world.map((item, index) => <NewsCard key={item.id} item={item} variant={index === 0 ? "feature" : "standard"} saved={saved.includes(item.id)} onSave={() => toggleSaved(item.id)} onOpen={() => setSelected(item)} />)}
        </div>
      </section>

      <section className="split-news">
        <div className="news-section">
          <SectionHeading kicker="Business" title="Company & Enterprise" />
          <div className="stacked-news">
            {enterprise.map((item) => <NewsCard key={item.id} item={item} variant="compact" saved={saved.includes(item.id)} onSave={() => toggleSaved(item.id)} onOpen={() => setSelected(item)} />)}
          </div>
        </div>
        <div className="news-section">
          <SectionHeading kicker="Your information" title="Privacy & Data Breaches" />
          <div className="stacked-news">
            {privacy.map((item) => <NewsCard key={item.id} item={item} variant="compact" saved={saved.includes(item.id)} onSave={() => toggleSaved(item.id)} onOpen={() => setSelected(item)} />)}
          </div>
        </div>
      </section>

      <section className="daily-briefing">
        <div className="briefing-intro"><span>THE DAILY BRIEFING</span><h2>Today&apos;s Cyber Roundup</h2><p>The essential cybersecurity stories, explained in a few minutes.</p><small>{formatDate(data.generatedAt, true)} IST</small></div>
        <ol>
          {ordered.slice(0, 5).map((item) => <li key={item.id}><button onClick={() => setSelected(item)}><span>{editorialCategory(item)}</span><strong>{plainTitle(item)}</strong><ArrowRight size={15} /></button></li>)}
        </ol>
      </section>

      <section className="split-news">
        <div className="news-section">
          <SectionHeading kicker="Everyday safety" title="Mobile & Consumer Security" />
          <div className="stacked-news">
            {consumer.map((item) => <NewsCard key={item.id} item={item} variant="compact" saved={saved.includes(item.id)} onSave={() => toggleSaved(item.id)} onOpen={() => setSelected(item)} />)}
          </div>
        </div>
        <div className="news-section">
          <SectionHeading kicker="The future" title="Technology & AI Security" />
          <div className="stacked-news">
            {technology.map((item) => <NewsCard key={item.id} item={item} variant="compact" saved={saved.includes(item.id)} onSave={() => toggleSaved(item.id)} onOpen={() => setSelected(item)} />)}
          </div>
        </div>
      </section>

      <section className="editors-week">
        <div className="editors-picks">
          <SectionHeading kicker="Chosen for clarity" title="Editor's Picks" />
          {editorPicks.map((item, index) => (
            <button key={item.id} onClick={() => setSelected(item)}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><small>{editorialCategory(item)}</small><h3>{plainTitle(item)}</h3><p>{beginnerExplanation(item)}</p></div>
              <ArrowRight size={17} />
            </button>
          ))}
        </div>
        <div className="weekly-highlights">
          <SectionHeading kicker="The week in cyber" title="Weekly Highlights" />
          <div>
            {weeklyHighlights.map((item) => (
              <button key={item.id} onClick={() => setSelected(item)}>
                <span>{formatDate(item.publishedAt)}</span>
                <strong>{plainTitle(item)}</strong>
                <small>{item.primaryPublisher}</small>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="trending-section">
        <div><span>Trending now</span><h2>What readers are following</h2></div>
        <div className="trend-list">
          {categories.slice(1).map((category, index) => <button key={category} onClick={() => setActiveCategory(category)}><b>{String(index + 1).padStart(2, "0")}</b><span>{category}</span><em>{categoryCount(category)} stories</em></button>)}
        </div>
      </section>

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
      case "search": return searchView;
      case "saved": return savedView;
      case "settings": return settingsView;
      default: return homeFeed;
    }
  })();

  return (
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
          <button className={activeCategory === "Latest" ? "active" : ""} onClick={() => { setActiveCategory("Latest"); setMobileMenu(false); setMobileTab("home"); }}>Latest</button>
          {categories.map((category) => (
            <button key={category} className={activeCategory === category ? "active" : ""} onClick={() => { setActiveCategory(category); setMobileMenu(false); setMobileTab("home"); }}>
              {category}
            </button>
          ))}
        </nav>

        <div className="breaking-strip">
          <strong>BREAKING</strong>
          <button onClick={() => setSelected(hero)}><span>{plainTitle(hero)}</span><ChevronRight size={15} /></button>
          <small>{relativeTime(hero.publishedAt)}</small>
        </div>
        {refreshMessage && <div className="refresh-note"><Check size={15} />{refreshMessage}<button onClick={() => setRefreshMessage(null)} aria-label="Dismiss update message"><X size={14} /></button></div>}
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
        alertCount={alerts.length}
        savedCount={saved.length}
      />

      {selected && (
        <ArticleReader item={selected} saved={saved.includes(selected.id)} onSave={() => toggleSaved(selected.id)} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
