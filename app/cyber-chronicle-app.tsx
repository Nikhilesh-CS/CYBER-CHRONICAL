"use client";

import {
  Activity,
  AlertTriangle,
  Bell,
  Bookmark,
  BookmarkCheck,
  Bot,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  Filter,
  Gauge,
  LayoutDashboard,
  Menu,
  Radar,
  Search,
  Settings,
  ShieldCheck,
  Siren,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Severity = "Critical" | "High" | "Medium" | "Low";
type Confidence = "Confirmed" | "High confidence" | "Moderate" | "Developing";
type View = "Newsroom" | "Live Feed" | "Critical Alerts" | "Vulnerabilities" | "Saved" | "Settings";

type Story = {
  id: string;
  kind: "Vulnerability" | "Ransomware" | "Breach" | "Malware" | "Advisory";
  headline: string;
  dek: string;
  severity: Severity;
  confidence: Confidence;
  sources: number;
  time: string;
  firstSeen: string;
  affected: string;
  status: "Verified" | "Developing" | "Corrected";
  cve?: string;
  tags: string[];
};

const stories: Story[] = [
  {
    id: "helios-edge",
    kind: "Vulnerability",
    headline: "Helios Edge gateway flaw added to active-exploitation watchlist",
    dek: "A pre-authentication path traversal issue is being investigated after two independent telemetry reports observed targeted scanning.",
    severity: "Critical",
    confidence: "High confidence",
    sources: 4,
    time: "8 min ago",
    firstSeen: "22 Jul · 09:42 IST",
    affected: "Helios Edge 4.1–4.3",
    status: "Developing",
    cve: "CVE-2026-41872",
    tags: ["Active exploitation", "Internet-facing", "Patch available"],
  },
  {
    id: "northstar-cloud",
    kind: "Breach",
    headline: "Northstar Cloud rotates support tokens after third-party exposure",
    dek: "The provider says a limited set of support-session tokens was exposed; customer production credentials were not present in the affected system.",
    severity: "High",
    confidence: "Confirmed",
    sources: 3,
    time: "21 min ago",
    firstSeen: "22 Jul · 09:29 IST",
    affected: "Northstar Cloud support users",
    status: "Verified",
    tags: ["SaaS", "Credential rotation", "Third party"],
  },
  {
    id: "emberlock",
    kind: "Ransomware",
    headline: "EmberLock campaign shifts initial access to exposed remote management tools",
    dek: "Incident responders link a new intrusion cluster to weakly protected remote administration endpoints across manufacturing networks.",
    severity: "High",
    confidence: "Moderate",
    sources: 2,
    time: "46 min ago",
    firstSeen: "22 Jul · 09:04 IST",
    affected: "Manufacturing and logistics",
    status: "Developing",
    tags: ["Ransomware", "Remote access", "Manufacturing"],
  },
  {
    id: "quartz-mail",
    kind: "Malware",
    headline: "QuartzMail loader returns with signed archive lure",
    dek: "Researchers documented a delivery chain using a signed archive utility before a memory-only payload is staged.",
    severity: "Medium",
    confidence: "High confidence",
    sources: 5,
    time: "1 hr ago",
    firstSeen: "22 Jul · 08:37 IST",
    affected: "Windows enterprise users",
    status: "Verified",
    tags: ["Phishing", "Loader", "Windows"],
  },
  {
    id: "orion-patch",
    kind: "Advisory",
    headline: "Orion Systems republishes July patch guidance with corrected versions",
    dek: "The vendor corrected its affected-version table. The remediation steps are unchanged, but administrators should re-check inventory results.",
    severity: "Medium",
    confidence: "Confirmed",
    sources: 2,
    time: "2 hrs ago",
    firstSeen: "22 Jul · 07:51 IST",
    affected: "Orion Control Suite",
    status: "Corrected",
    cve: "CVE-2026-39214",
    tags: ["Correction", "OT", "Patch guidance"],
  },
];

const vulnerabilities = [
  { cve: "CVE-2026-41872", product: "Helios Edge Gateway", cvss: "9.8", exploit: "Observed", severity: "Critical" as Severity, confidence: "High", updated: "8m" },
  { cve: "CVE-2026-41109", product: "Cirrus Identity Broker", cvss: "9.1", exploit: "PoC public", severity: "Critical" as Severity, confidence: "High", updated: "31m" },
  { cve: "CVE-2026-40531", product: "Apex Archive Server", cvss: "8.8", exploit: "No evidence", severity: "High" as Severity, confidence: "Confirmed", updated: "1h" },
  { cve: "CVE-2026-39970", product: "Vela Workspace Agent", cvss: "7.8", exploit: "Investigating", severity: "High" as Severity, confidence: "Moderate", updated: "3h" },
  { cve: "CVE-2026-39214", product: "Orion Control Suite", cvss: "6.5", exploit: "No evidence", severity: "Medium" as Severity, confidence: "Confirmed", updated: "5h" },
];

const navItems: { name: View; icon: typeof Radar }[] = [
  { name: "Newsroom", icon: LayoutDashboard },
  { name: "Live Feed", icon: Activity },
  { name: "Critical Alerts", icon: Siren },
  { name: "Vulnerabilities", icon: ShieldCheck },
  { name: "Saved", icon: Bookmark },
  { name: "Settings", icon: Settings },
];

function SeverityPill({ level }: { level: Severity }) {
  return <span className={`severity severity-${level.toLowerCase()}`}><span />{level}</span>;
}

function ConfidencePill({ value }: { value: Confidence }) {
  return <span className="confidence"><ShieldCheck size={13} />{value}</span>;
}

function StoryCard({ story, onOpen, saved, onSave }: { story: Story; onOpen: () => void; saved: boolean; onSave: () => void }) {
  return (
    <article className="story-card" onClick={onOpen} tabIndex={0} onKeyDown={(event) => event.key === "Enter" && onOpen()}>
      <div className="story-card-top">
        <span className="eyebrow">{story.kind}</span>
        <button className="icon-button save-button" aria-label={saved ? "Remove saved story" : "Save story"} onClick={(event) => { event.stopPropagation(); onSave(); }}>
          {saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
        </button>
      </div>
      <h3>{story.headline}</h3>
      <p>{story.dek}</p>
      <div className="story-meta"><SeverityPill level={story.severity} /><span>{story.sources} sources</span><span>{story.time}</span></div>
    </article>
  );
}

export function CyberChronicleApp() {
  const [view, setView] = useState<View>("Newsroom");
  const [navOpen, setNavOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<"All" | Severity>("All");
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("cyber-chronicle-saved");
    const timer = window.setTimeout(() => {
      if (stored) setSaved(JSON.parse(stored));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        document.getElementById("global-search")?.focus();
      }
      if (event.key === "Escape") setSelectedStory(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visibleStories = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return stories.filter((story) => {
      const matchesSeverity = severity === "All" || story.severity === severity;
      const matchesQuery = !needle || `${story.headline} ${story.dek} ${story.cve ?? ""} ${story.affected} ${story.tags.join(" ")}`.toLowerCase().includes(needle);
      return matchesSeverity && matchesQuery;
    });
  }, [query, severity]);

  const toggleSaved = (id: string) => {
    setSaved((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      window.localStorage.setItem("cyber-chronicle-saved", JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className={`app-shell ${navOpen ? "" : "nav-collapsed"}`}>
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Radar size={21} /></div><div className="brand-copy"><strong>Cyber Chronicle</strong><span>INTELLIGENCE DESK</span></div></div>
        <nav aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          {navItems.slice(0, 4).map(({ name, icon: Icon }) => (
            <button key={name} className={view === name ? "active" : ""} onClick={() => setView(name)} title={name}><Icon size={18} /><span>{name}</span>{name === "Critical Alerts" && <b>3</b>}</button>
          ))}
          <p className="nav-label">Personal</p>
          {navItems.slice(4).map(({ name, icon: Icon }) => (
            <button key={name} className={view === name ? "active" : ""} onClick={() => setView(name)} title={name}><Icon size={18} /><span>{name}</span></button>
          ))}
        </nav>
        <div className="source-health"><span className="health-dot" /><div><strong>Intelligence pipeline</strong><span>12 / 12 sources healthy</span></div></div>
        <button className="collapse-button" onClick={() => setNavOpen((current) => !current)}><Menu size={17} /><span>Collapse navigation</span></button>
      </aside>

      <main>
        <header className="command-bar">
          <div className="search-wrap"><Search size={17} /><input id="global-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search threats, CVEs, actors, products..." aria-label="Global search" /><kbd>/</kbd></div>
          <div className="freshness"><span className="live-dot" /> Updated 37 seconds ago</div>
          <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotificationsOpen((current) => !current)}><Bell size={19} /><span>3</span></button>
          <div className="avatar">NC</div>
          {notificationsOpen && <div className="notification-popover"><div><strong>Intelligence alerts</strong><button className="icon-button" onClick={() => setNotificationsOpen(false)}><X size={16} /></button></div><p><b>Critical</b> Helios Edge exploitation signal strengthened.</p><p><b>Correction</b> Orion affected versions were updated.</p><p><b>Watchlist</b> New activity matches “manufacturing”.</p></div>}
        </header>

        <div className="demo-banner"><Sparkles size={14} /><strong>Prototype intelligence:</strong> all incidents and indicators shown are simulated for product demonstration.</div>

        {view === "Newsroom" && <Newsroom stories={visibleStories} severity={severity} setSeverity={setSeverity} saved={saved} onSave={toggleSaved} onOpen={setSelectedStory} />}
        {view === "Live Feed" && <LiveFeed stories={visibleStories} onOpen={setSelectedStory} />}
        {view === "Critical Alerts" && <Alerts stories={visibleStories.filter((story) => story.severity === "Critical" || story.severity === "High")} onOpen={setSelectedStory} />}
        {view === "Vulnerabilities" && <VulnerabilityView />}
        {view === "Saved" && <SavedView stories={stories.filter((story) => saved.includes(story.id))} saved={saved} onSave={toggleSaved} onOpen={setSelectedStory} />}
        {view === "Settings" && <SettingsView />}
      </main>

      {selectedStory && <StoryDrawer story={selectedStory} saved={saved.includes(selectedStory.id)} onSave={() => toggleSaved(selectedStory.id)} onClose={() => setSelectedStory(null)} />}
    </div>
  );
}

function PageHeading({ title, eyebrow, children }: { title: string; eyebrow: string; children?: React.ReactNode }) {
  return <div className="page-heading"><div><span>{eyebrow}</span><h1>{title}</h1></div>{children}</div>;
}

function Newsroom({ stories: shown, severity, setSeverity, saved, onSave, onOpen }: { stories: Story[]; severity: "All" | Severity; setSeverity: (value: "All" | Severity) => void; saved: string[]; onSave: (id: string) => void; onOpen: (story: Story) => void }) {
  const lead = shown[0] ?? stories[0];
  return (
    <div className="page newsroom-page">
      <PageHeading eyebrow="Wednesday · 22 July" title="Intelligence newsroom"><button className="brief-button"><FileText size={16} />Read daily brief<span>6 min</span></button></PageHeading>
      <div className="newsroom-grid">
        <section className="lead-story" onClick={() => onOpen(lead)}>
          <div className="lead-pattern" /><div className="lead-content"><div className="breaking-line"><span>Breaking intelligence</span><span>{lead.status}</span></div><div className="lead-pills"><SeverityPill level={lead.severity} /><ConfidencePill value={lead.confidence} /></div><h2>{lead.headline}</h2><p>{lead.dek}</p><div className="lead-footer"><span><Clock3 size={14} />Updated {lead.time}</span><span>{lead.sources} independent evidence chains</span><button>Open analysis <ChevronRight size={16} /></button></div></div>
        </section>
        <aside className="alert-stack"><div className="section-title"><span>Critical watch</span><button onClick={() => document.querySelector<HTMLElement>("button[title='Critical Alerts']")?.click()}>View all</button></div>{stories.slice(0, 3).map((story, index) => <button className="mini-alert" key={story.id} onClick={() => onOpen(story)}><span className={`alert-index ${index === 0 ? "hot" : ""}`}>0{index + 1}</span><div><SeverityPill level={story.severity} /><strong>{story.headline}</strong><span>{story.affected} · {story.time}</span></div><ChevronRight size={16} /></button>)}</aside>
      </div>
      <section className="content-section"><div className="section-title"><div><span>Latest verified intelligence</span><small>{shown.length} stories match your desk</small></div><div className="filter-row"><Filter size={15} /><select value={severity} onChange={(event) => setSeverity(event.target.value as "All" | Severity)} aria-label="Filter by severity"><option>All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></div></div><div className="story-grid">{shown.length ? shown.slice(1).map((story) => <StoryCard key={story.id} story={story} saved={saved.includes(story.id)} onSave={() => onSave(story.id)} onOpen={() => onOpen(story)} />) : <EmptyState />}</div></section>
      <IntelligenceRail />
    </div>
  );
}

function IntelligenceRail() {
  return <aside className="intel-rail"><section><div className="section-title"><span>Threat pulse</span><TrendingUp size={16} /></div><div className="pulse-chart"><div style={{ height: "45%" }} /><div style={{ height: "68%" }} /><div style={{ height: "52%" }} /><div style={{ height: "82%" }} /><div style={{ height: "63%" }} /><div style={{ height: "92%" }} /><div style={{ height: "74%" }} /></div><div className="pulse-meta"><span>7-day signal volume</span><b>+18.4%</b></div></section><section><div className="section-title"><span>Trending now</span><span>24H</span></div>{["CVE-2026-41872", "Remote management", "EmberLock", "Identity brokers"].map((item, index) => <div className="trend-row" key={item}><b>0{index + 1}</b><span>{item}</span><em>+{42 - index * 7}%</em></div>)}</section><section className="brief-card"><span><Bot size={15} />AI DESK BRIEF</span><p>Exploitation signals are concentrated around internet-facing gateways. Prioritize exposed Helios Edge inventory and validate patch state.</p><button>Open full morning brief <ChevronRight size={14} /></button></section></aside>;
}

function LiveFeed({ stories: shown, onOpen }: { stories: Story[]; onOpen: (story: Story) => void }) {
  return <div className="page single-page"><PageHeading eyebrow="Continuously clustered" title="Live cyber feed"><span className="stream-status"><span className="live-dot" />Streaming</span></PageHeading><div className="feed-controls"><div className="feed-filters">{["All events", "Vulnerabilities", "Breaches", "Ransomware", "Malware"].map((item, index) => <button className={index === 0 ? "active" : ""} key={item}>{item}</button>)}</div><button className="outline-button"><Gauge size={16} />Feed health</button></div><section className="feed-list">{shown.map((story) => <button className="feed-event" key={story.id} onClick={() => onOpen(story)}><span className="feed-time">{story.time}<i /></span><div className="feed-body"><div><span className="eyebrow">{story.kind}</span><span className={`state state-${story.status.toLowerCase()}`}>{story.status}</span></div><h3>{story.headline}</h3><p>{story.dek}</p><div className="story-meta"><SeverityPill level={story.severity} /><span>{story.sources} evidence chains</span><span>{story.affected}</span></div></div><ChevronRight size={17} /></button>)}</section></div>;
}

function Alerts({ stories: shown, onOpen }: { stories: Story[]; onOpen: (story: Story) => void }) {
  return <div className="page single-page"><PageHeading eyebrow="Decision queue" title="Critical alerts"><button className="outline-button"><Filter size={16} />Saved view</button></PageHeading><div className="metric-row"><Metric label="Open alerts" value="03" change="1 new" icon={Siren} /><Metric label="Critical" value="01" change="Immediate" icon={CircleAlert} /><Metric label="Acknowledged" value="07" change="Today" icon={ShieldCheck} /><Metric label="Median age" value="18m" change="-6m" icon={Clock3} /></div><section className="table-card"><div className="table-head alert-table"><span>Severity</span><span>Incident</span><span>Affected surface</span><span>Confidence</span><span>Updated</span><span /></div>{shown.map((story) => <button className="table-row alert-table" key={story.id} onClick={() => onOpen(story)}><span><SeverityPill level={story.severity} /></span><strong>{story.headline}</strong><span>{story.affected}</span><span>{story.confidence}</span><span>{story.time}</span><ChevronRight size={16} /></button>)}</section></div>;
}

function Metric({ label, value, change, icon: Icon }: { label: string; value: string; change: string; icon: typeof Radar }) { return <div className="metric"><span><Icon size={17} />{label}</span><strong>{value}</strong><small>{change}</small></div>; }

function VulnerabilityView() {
  const [activeOnly, setActiveOnly] = useState(false);
  const rows = activeOnly ? vulnerabilities.filter((vulnerability) => vulnerability.exploit === "Observed") : vulnerabilities;
  return <div className="page single-page"><PageHeading eyebrow="Exposure intelligence" title="Vulnerability dashboard"><button className={`toggle-button ${activeOnly ? "on" : ""}`} onClick={() => setActiveOnly((current) => !current)}><span />Actively exploited only</button></PageHeading><div className="metric-row"><Metric label="Critical CVEs" value="14" change="+3 this week" icon={AlertTriangle} /><Metric label="Active exploitation" value="06" change="2 confirmed" icon={Siren} /><Metric label="Patches available" value="11" change="79% coverage" icon={ShieldCheck} /><Metric label="Tracked vendors" value="28" change="All healthy" icon={Radar} /></div><section className="table-card"><div className="table-head cve-table"><span>CVE</span><span>Product</span><span>CVSS</span><span>Exploitation</span><span>Confidence</span><span>Updated</span></div>{rows.map((vulnerability) => <div className="table-row cve-table" key={vulnerability.cve}><strong className="mono">{vulnerability.cve}</strong><span>{vulnerability.product}</span><span><SeverityPill level={vulnerability.severity} /> <b>{vulnerability.cvss}</b></span><span className={vulnerability.exploit === "Observed" ? "exploit-observed" : ""}>{vulnerability.exploit}</span><span>{vulnerability.confidence}</span><span>{vulnerability.updated}</span></div>)}</section><div className="evidence-note"><ShieldCheck size={18} /><div><strong>Evidence policy</strong><p>“Observed” requires an authoritative statement or multiple genuinely independent, credible evidence chains. Exploit availability alone does not mean active exploitation.</p></div></div></div>;
}

function SavedView({ stories: shown, saved, onSave, onOpen }: { stories: Story[]; saved: string[]; onSave: (id: string) => void; onOpen: (story: Story) => void }) { return <div className="page single-page"><PageHeading eyebrow="Your intelligence desk" title="Saved & following" /><div className="story-grid">{shown.length ? shown.map((story) => <StoryCard key={story.id} story={story} saved={saved.includes(story.id)} onSave={() => onSave(story.id)} onOpen={() => onOpen(story)} />) : <div className="full-empty"><Bookmark size={24} /><h3>No saved intelligence yet</h3><p>Save stories from the newsroom to build your local reading list.</p></div>}</div></div>; }

function SettingsView() { return <div className="page single-page"><PageHeading eyebrow="Workspace controls" title="Settings" /><div className="settings-grid"><section><h3>Intelligence preferences</h3><SettingRow title="Critical alert sounds" description="Play a sound for confirmed critical alerts." checked /><SettingRow title="Developing-story updates" description="Notify when confidence or severity materially changes." checked /><SettingRow title="Daily brief" description="Generate a concise briefing at 08:00 local time." checked /></section><section><h3>Editorial transparency</h3><SettingRow title="Show confidence factors" description="Explain why a confidence label was assigned." checked /><SettingRow title="Defang indicators" description="Display domains and URLs in a non-clickable defensive form." checked /><SettingRow title="Advanced exploit detail" description="Reveal operational exploit steps in articles." /></section></div></div>; }

function SettingRow({ title, description, checked = false }: { title: string; description: string; checked?: boolean }) { const [enabled, setEnabled] = useState(checked); return <button className="setting-row" onClick={() => setEnabled((current) => !current)}><div><strong>{title}</strong><span>{description}</span></div><span className={`switch ${enabled ? "on" : ""}`}><i /></span></button>; }

function StoryDrawer({ story, saved, onSave, onClose }: { story: Story; saved: boolean; onSave: () => void; onClose: () => void }) {
  return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="story-drawer" onMouseDown={(event) => event.stopPropagation()}><div className="drawer-top"><span className="eyebrow">{story.kind} · {story.status}</span><div><button className="icon-button" onClick={onSave}>{saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}</button><button className="icon-button" onClick={onClose}><X size={19} /></button></div></div><div className="drawer-scroll"><div className="lead-pills"><SeverityPill level={story.severity} /><ConfidencePill value={story.confidence} /></div><h2>{story.headline}</h2><p className="drawer-dek">{story.dek}</p><div className="fact-grid"><div><span>First seen</span><strong>{story.firstSeen}</strong></div><div><span>Last verified</span><strong>{story.time}</strong></div><div><span>Affected</span><strong>{story.affected}</strong></div><div><span>Evidence</span><strong>{story.sources} independent chains</strong></div></div><section className="action-panel"><span>What should I do now?</span><ol><li>Identify exposed instances and confirm the exact product version.</li><li>Apply authoritative vendor guidance and restrict management access.</li><li>Review relevant authentication and gateway logs for anomalous activity.</li></ol></section><DrawerSection title="Executive assessment"><p>This event has material defensive relevance because it affects an internet-facing control point. Confidence and severity are evaluated separately: available evidence supports the event, while impact depends on actual organizational exposure.</p></DrawerSection><DrawerSection title="Technical intelligence"><div className="detail-list"><div><span>Identifier</span><code>{story.cve ?? "No CVE assigned"}</code></div><div><span>Initial access</span><code>External remote service</code></div><div><span>ATT&CK</span><code>T1190 · Exploit Public-Facing App</code></div><div><span>Indicator</span><code>198[.]51[.]100[.]42 (simulated)</code></div></div></DrawerSection><DrawerSection title="Source evidence"><div className="source-row"><ShieldCheck size={17} /><div><strong>Vendor security advisory</strong><span>Primary authority · supports affected versions and mitigation</span></div></div><div className="source-row"><FileText size={17} /><div><strong>Independent response report</strong><span>Specialist research · supports observed scanning</span></div></div><p className="discrepancy"><AlertTriangle size={15} />Exploit scope remains developing; no claim of broad compromise has been confirmed.</p></DrawerSection><DrawerSection title="Update history"><div className="timeline"><div><i /><span><b>09:42</b> Story candidate created from vendor advisory.</span></div><div><i /><span><b>09:51</b> Independent telemetry added; confidence raised.</span></div><div><i /><span><b>10:04</b> Defensive guidance validated and article updated.</span></div></div></DrawerSection></div></aside></div>;
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="drawer-section"><h3>{title}</h3>{children}</section>; }
function EmptyState() { return <div className="full-empty"><Search size={23} /><h3>No matching intelligence</h3><p>Try a broader search or clear the severity filter.</p></div>; }
