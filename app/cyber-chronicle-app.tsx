"use client";

import {
  ArrowRight, Bookmark, BookmarkCheck, Check, ChevronRight, Clock3, Download,
  ExternalLink, Menu, Moon, RefreshCw, Search, ShieldCheck, Sun, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { RealIntelligenceItem, RealIntelligenceResponse } from "./api/intelligence/real-data";

type EditorialCategory =
  | "Top Stories"
  | "World Cyber News"
  | "Active Security Alerts"
  | "Company & Enterprise"
  | "Privacy & Data Breaches"
  | "Mobile & Consumer"
  | "Technology & AI";

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

const categories: EditorialCategory[] = [
  "Top Stories",
  "World Cyber News",
  "Active Security Alerts",
  "Company & Enterprise",
  "Privacy & Data Breaches",
  "Mobile & Consumer",
  "Technology & AI",
];

function plainTitle(item: RealIntelligenceItem) {
  return item.title.replace(`${item.identifier}: `, "");
}

function formatDate(value: string, includeTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function editorialCategory(item: RealIntelligenceItem): EditorialCategory {
  const text = plainTitle(item).toLowerCase();
  if (item.sourceCategory === "official" || /\b(advisory|patch|vulnerabilit|exploit|zero.day|security update)\b/.test(text)) {
    return "Active Security Alerts";
  }
  if (/\b(breach|leak|privacy|personal data|stolen data|exposed|identity)\b/.test(text)) {
    return "Privacy & Data Breaches";
  }
  if (/\b(android|iphone|ios|mobile|smartphone|whatsapp|consumer|browser|extension|app)\b/.test(text)) {
    return "Mobile & Consumer";
  }
  if (/\b(ai|artificial intelligence|openai|model|cloud|github|software|technology)\b/.test(text)) {
    return "Technology & AI";
  }
  if (/\b(company|business|enterprise|bank|organisation|organization|startup|industry|ciso)\b/.test(text)) {
    return "Company & Enterprise";
  }
  return "World Cyber News";
}

function verificationLabel(item: RealIntelligenceItem) {
  if (item.verificationStatus === "official") return "Official source";
  if (item.verificationStatus === "corroborated") return `${item.independentSourceCount} sources confirm`;
  return "Developing story";
}

function simpleSummary(item: RealIntelligenceItem) {
  if (item.studentSummary) return item.studentSummary;
  return `${item.primaryPublisher} published an update about ${plainTitle(item)}. The details are being reviewed against the available evidence.`;
}

function whyItMatters(item: RealIntelligenceItem) {
  const category = editorialCategory(item);
  const copy: Record<EditorialCategory, string> = {
    "Top Stories": "This is among the most recent significant developments in the cybersecurity news cycle.",
    "World Cyber News": "Cyber incidents can spread across borders quickly, affecting services, supply chains, and people far from the original event.",
    "Active Security Alerts": "Security weaknesses can put devices or business systems at risk if affected software is left unpatched.",
    "Company & Enterprise": "A major security issue at one organisation can affect employees, customers, suppliers, and connected services.",
    "Privacy & Data Breaches": "Exposed personal information can be used for fraud, phishing, impersonation, or unwanted account access.",
    "Mobile & Consumer": "This may involve devices, apps, or online services used in everyday life, so clear practical guidance matters.",
    "Technology & AI": "Changes in widely used technology can create new security risks and alter how defenders and attackers operate.",
  };
  return copy[category];
}

function readerGuidance(item: RealIntelligenceItem) {
  const category = editorialCategory(item);
  if (category === "Active Security Alerts") {
    return [
      ["Home users", "Keep devices updated and check whether the named product is installed.", "watch"],
      ["Small businesses", "Ask your IT provider to review affected versions and official patch guidance.", "act"],
      ["Large organisations", "Confirm exposure, prioritise official remediation, and monitor for suspicious activity.", "urgent"],
    ] as const;
  }
  if (category === "Privacy & Data Breaches") {
    return [
      ["Home users", "Watch for direct notices from the organisation and be alert for follow-up phishing.", "watch"],
      ["Small businesses", "Check whether staff, customers, or suppliers use the affected service.", "watch"],
      ["Large organisations", "Review third-party exposure and prepare identity-protection guidance if needed.", "act"],
    ] as const;
  }
  return [
    ["Home users", "No immediate action unless you use a product or service named in the story.", "safe"],
    ["Small businesses", "Review the source and decide whether the development affects your systems or staff.", "watch"],
    ["Large organisations", "Track the story as it develops and validate relevance through official channels.", "watch"],
  ] as const;
}

function practicalActions(item: RealIntelligenceItem) {
  if (item.sourceCategory === "official") {
    return [
      "Open the official advisory and check the affected products or versions.",
      "Install approved security updates or follow the vendor’s mitigation guidance.",
      "Ask an IT professional for help if you are unsure whether the notice applies to you.",
    ];
  }
  return [
    "Read the linked evidence before sharing or acting on the headline.",
    "Look for a direct statement from the affected company, vendor, or public authority.",
    "Keep devices updated and remain cautious of messages that exploit breaking news.",
  ];
}

function SectionHeading({ kicker, title, action }: { kicker?: string; title: string; action?: string }) {
  return (
    <div className="section-heading">
      <div>{kicker && <span>{kicker}</span>}<h2>{title}</h2></div>
      {action && <button>{action}<ArrowRight size={15} /></button>}
    </div>
  );
}

function StoryMeta({ item }: { item: RealIntelligenceItem }) {
  return (
    <div className="story-meta">
      <span className={`verification verification-${item.verificationStatus}`}><ShieldCheck size={13} />{verificationLabel(item)}</span>
      <span>{relativeTime(item.publishedAt)}</span>
      <span>{item.primaryPublisher}</span>
    </div>
  );
}

function NewsCard({
  item,
  variant = "standard",
  saved,
  onOpen,
  onSave,
}: {
  item: RealIntelligenceItem;
  variant?: "standard" | "compact" | "feature";
  saved: boolean;
  onOpen: () => void;
  onSave: () => void;
}) {
  return (
    <article className={`news-card news-card-${variant}`}>
      <button className="card-hitbox" onClick={onOpen} aria-label={`Read ${plainTitle(item)}`} />
      <div className={`story-art art-${editorialCategory(item).toLowerCase().replaceAll(" ", "-").replaceAll("&", "and")}`}>
        <span>{editorialCategory(item)}</span>
        <b>CC</b>
      </div>
      <div className="card-copy">
        <div className="card-kicker"><span>{editorialCategory(item)}</span><button className="save-story" onClick={onSave} aria-label={saved ? "Remove saved story" : "Save story"}>{saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}</button></div>
        <h3>{plainTitle(item)}</h3>
        {variant !== "compact" && <p>{simpleSummary(item)}</p>}
        <StoryMeta item={item} />
      </div>
    </article>
  );
}

export function CyberChronicleApp({ initialData = EMPTY_RESPONSE }: { initialData?: RealIntelligenceResponse }) {
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

  const refresh = useCallback(async (force = false) => {
    setIsRefreshing(true);
    if (force) setRefreshMessage("The newsroom is checking every source…");
    try {
      const suffix = force ? `?refresh=1&t=${Date.now()}` : `?t=${Date.now()}`;
      const response = await fetch(`/api/intelligence${suffix}`, { cache: "no-store", headers: { accept: "application/json" } });
      const payload = await response.json() as RealIntelligenceResponse;
      if (!payload || !Array.isArray(payload.items)) throw new Error("Invalid newsroom response");
      setData(payload);
      setRefreshMessage(force
        ? `Newsroom updated ${formatDate(payload.generatedAt, true)} IST · ${payload.items.length} reviewed reports`
        : null);
    } catch {
      setRefreshMessage("Live sources could not be checked. The last verified edition is still available.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

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
    window.addEventListener("online", resume);
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/service-worker.js", { updateViaCache: "none" });
    return () => {
      window.clearTimeout(restore);
      window.clearInterval(timer);
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("beforeinstallprompt", onInstall);
    };
  }, [refresh]);

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

  return (
    <div className="publication-shell">
      <header className="site-header">
        <div className="utility-bar">
          <span>{formatDate(new Date().toISOString())}</span>
          <span className="edition-status"><i />Live edition · {currentSources}/{data.sources.length} sources reporting</span>
          <div>
            {installPrompt && <button onClick={() => void install()}><Download size={14} />Install app</button>}
            <button onClick={() => void refresh(true)} disabled={isRefreshing}><RefreshCw className={isRefreshing ? "spin" : ""} size={14} />{isRefreshing ? "Updating" : "Refresh"}</button>
            <button onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>{theme === "light" ? <Moon size={15} /> : <Sun size={15} />}</button>
          </div>
        </div>

        <div className="masthead">
          <button className="mobile-menu-button" onClick={() => setMobileMenu((value) => !value)} aria-label="Open sections"><Menu size={22} /></button>
          <div className="masthead-title"><span className="brand-shield"><ShieldCheck size={22} /></span><div><strong>Cyber Chronicle</strong><small>Trusted Cybersecurity News. Simplified.</small></div></div>
          <label className="header-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the news" aria-label="Search the news" />{query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={15} /></button>}</label>
        </div>

        <nav className={mobileMenu ? "section-nav nav-open" : "section-nav"} aria-label="News sections">
          <button className={activeCategory === "Latest" ? "active" : ""} onClick={() => { setActiveCategory("Latest"); setMobileMenu(false); }}>Latest</button>
          {categories.map((category) => (
            <button key={category} className={activeCategory === category ? "active" : ""} onClick={() => { setActiveCategory(category); setMobileMenu(false); }}>
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

      <main className="news-home">
        {(query || activeCategory !== "Latest") && (
          <div className="results-banner">
            <div><span>Viewing</span><h1>{query ? `Search: “${query}”` : activeCategory}</h1></div>
            <b>{filtered.length} stories</b>
          </div>
        )}

        <section className="lead-grid" aria-label="Lead stories">
          <article className="lead-article">
            <button className="lead-click" onClick={() => setSelected(hero)} aria-label={`Read ${plainTitle(hero)}`} />
            <div className={`lead-visual art-${editorialCategory(hero).toLowerCase().replaceAll(" ", "-").replaceAll("&", "and")}`}>
              <span>CYBER CHRONICLE</span>
              <b>{editorialCategory(hero)}</b>
              <em>Verified reporting from the live newsroom</em>
            </div>
            <div className="lead-copy">
              <div className="lead-label"><span>{editorialCategory(hero)}</span><span>{hero.storyState === "developing" ? "Developing" : "Confirmed"}</span></div>
              <h1>{plainTitle(hero)}</h1>
              <p>{simpleSummary(hero)}</p>
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
          <div><RefreshCw size={20} /><span><strong>Always current</strong>Sources checked throughout the day</span></div>
          <a href="#standards">Our standards<ArrowRight size={14} /></a>
        </section>

        <section className="news-section" id="alerts">
          <SectionHeading kicker="Need to know" title="Active Security Alerts" action="View all alerts" />
          <div className="alert-news-grid">
            {alerts.map((item, index) => (
              <button className="alert-news-item" key={item.id} onClick={() => setSelected(item)}>
                <span className="alert-number">{String(index + 1).padStart(2, "0")}</span>
                <div><span>{verificationLabel(item)}</span><h3>{plainTitle(item)}</h3><p>{simpleSummary(item)}</p><small>{formatDate(item.publishedAt)} · {item.primaryPublisher}</small></div>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        </section>

        <section className="news-section">
          <SectionHeading kicker="Across the internet" title="World Cyber News" action="More world news" />
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
          <div className="briefing-intro"><span>THE DAILY BRIEFING</span><h2>Today’s Cyber Roundup</h2><p>The essential cybersecurity stories, explained in a few minutes.</p><small>{formatDate(data.generatedAt, true)} IST</small></div>
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
            <SectionHeading kicker="Chosen for clarity" title="Editor’s Picks" />
            {editorPicks.map((item, index) => (
              <button key={item.id} onClick={() => setSelected(item)}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><small>{editorialCategory(item)}</small><h3>{plainTitle(item)}</h3><p>{simpleSummary(item)}</p></div>
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

      <footer className="site-footer">
        <div className="footer-brand"><strong>Cyber Chronicle</strong><span>Trusted Cybersecurity News. Simplified.</span></div>
        <div><a href="#alerts">Security Alerts</a><a href="#standards">Editorial Standards</a><button onClick={() => void refresh(true)}>Refresh Edition</button></div>
        <small>Live source metadata · Original plain-language explanations · Every story links to evidence</small>
      </footer>

      {selected && (
        <ArticleReader item={selected} saved={saved.includes(selected.id)} onSave={() => toggleSaved(selected.id)} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function ArticleReader({ item, saved, onSave, onClose }: { item: RealIntelligenceItem; saved: boolean; onSave: () => void; onClose: () => void }) {
  const guidance = readerGuidance(item);
  return (
    <div className="article-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <article className="article-reader" role="dialog" aria-modal="true" aria-labelledby="article-title">
        <div className="article-toolbar">
          <button onClick={onClose}><X size={20} />Close</button>
          <span>CYBER CHRONICLE</span>
          <button onClick={onSave}>{saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}{saved ? "Saved" : "Save"}</button>
        </div>
        <div className="article-body">
          <header className="article-header">
            <span className="article-section">{editorialCategory(item)}</span>
            <h1 id="article-title">{plainTitle(item)}</h1>
            <p className="article-deck">{simpleSummary(item)}</p>
            <div className="article-byline"><div className="author-mark">CC</div><span><strong>Cyber Chronicle Newsroom</strong><small>Published {formatDate(item.publishedAt, true)} IST · Updated from live sources</small></span></div>
            <StoryMeta item={item} />
          </header>

          <section className="article-block quick-summary"><span>QUICK SUMMARY</span><p>{simpleSummary(item)}</p></section>

          <section className="article-block simple-words">
            <span>IN SIMPLE WORDS</span>
            <h2>Here’s what this means</h2>
            <p>{simpleSummary(item)}</p>
          </section>

          <section className="article-block">
            <span>WHY IT MATTERS</span>
            <h2>Why this story is important</h2>
            <p>{whyItMatters(item)}</p>
          </section>

          <section className="article-block">
            <span>SHOULD YOU CARE?</span>
            <h2>A quick guide for different readers</h2>
            <div className="care-grid">
              {guidance.map(([audience, copy, level]) => <div key={audience} className={`care-card care-${level}`}><i /><strong>{audience}</strong><p>{copy}</p></div>)}
            </div>
          </section>

          <section className="article-block">
            <span>WHAT HAPPENED?</span>
            <h2>What we know so far</h2>
            <div className="fact-list">
              {item.knownFacts.map((fact) => <p key={fact}><Check size={16} />{fact}</p>)}
              <p><Clock3 size={16} />The story was last updated from source evidence on {formatDate(item.updatedAt, true)} IST.</p>
            </div>
            {item.unknowns.length > 0 && <div className="developing-note"><strong>Still developing</strong>{item.unknowns.map((unknown) => <p key={unknown}>{unknown}</p>)}</div>}
          </section>

          <section className="article-block">
            <span>WHAT YOU SHOULD DO</span>
            <h2>Practical next steps</h2>
            <ol className="action-list">{practicalActions(item).map((action, index) => <li key={action}><b>{index + 1}</b><span>{action}</span></li>)}</ol>
          </section>

          <section className="article-block sources-block">
            <span>SOURCES & TRANSPARENCY</span>
            <h2>Evidence used for this story</h2>
            <p>Cyber Chronicle uses source metadata and writes its own explanation. Open the original evidence for complete technical detail.</p>
            <div>
              {item.evidence.map((evidence) => <a href={evidence.url} target="_blank" rel="noreferrer" key={evidence.url}><span><strong>{evidence.publisher}</strong><small>{evidence.category.replaceAll("-", " ")} · Published {formatDate(evidence.publishedAt)}</small></span><ExternalLink size={17} /></a>)}
            </div>
          </section>

          <div className="article-end"><span>CC</span><p>Cyber Chronicle — Trusted Cybersecurity News. Simplified.</p></div>
        </div>
      </article>
    </div>
  );
}
