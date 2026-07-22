"use client";

import {
  Activity, AlertTriangle, Bell, Bookmark, BookmarkCheck, ChevronRight,
  CircleAlert, Clock3, ExternalLink, FileText, Filter, Gauge, LayoutDashboard,
  Menu, Radar, Search, Settings, ShieldCheck, Siren, TrendingUp, X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { RealIntelligenceItem, RealIntelligenceResponse } from "./api/intelligence/real-data";

type View = "Newsroom" | "Live Feed" | "Critical Alerts" | "Vulnerabilities" | "Saved" | "Settings";
type Severity = RealIntelligenceItem["severity"];

const CISA_CATALOG = "https://www.cisa.gov/known-exploited-vulnerabilities-catalog";
const EMPTY_RESPONSE: RealIntelligenceResponse = {
  state: "unavailable", generatedAt: new Date(0).toISOString(), lastSuccessfulAt: null,
  cacheAgeSeconds: null, notice: "Connecting to authoritative sources…", items: [], sources: [],
};

const navItems: { name: View; icon: typeof Radar }[] = [
  { name: "Newsroom", icon: LayoutDashboard }, { name: "Live Feed", icon: Activity },
  { name: "Critical Alerts", icon: Siren }, { name: "Vulnerabilities", icon: ShieldCheck },
  { name: "Saved", icon: Bookmark }, { name: "Settings", icon: Settings },
];

function dateLabel(value: string, withTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", ...(withTime ? { timeStyle: "short" } : {}) }).format(date);
}

function ageLabel(value: string) {
  const milliseconds = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(milliseconds)) return dateLabel(value);
  const minutes = Math.max(0, Math.floor(milliseconds / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function urgency(item: RealIntelligenceItem): Severity {
  return item.severity;
}

function evidenceLabel(item: RealIntelligenceItem) {
  return item.source === "CISA KEV" ? "Known exploited" : item.severity === "Unknown" ? "NVD record" : `${item.severity} CVSS`;
}

function SeverityPill({ item }: { item: RealIntelligenceItem }) {
  const level = urgency(item);
  return <span className={`severity severity-${level.toLowerCase()}`}><span />{evidenceLabel(item)}</span>;
}

function SourcePill({ item }: { item: RealIntelligenceItem }) {
  return <span className="confidence"><ShieldCheck size={13} />{item.source}</span>;
}

function StoryCard({ item, onOpen, saved, onSave }: { item: RealIntelligenceItem; onOpen: () => void; saved: boolean; onSave: () => void }) {
  return <article className="story-card" onClick={onOpen} tabIndex={0} onKeyDown={(event) => event.key === "Enter" && onOpen()}>
    <div className="story-card-top"><span className="eyebrow">{item.source} · {item.cve}</span><button className="icon-button save-button" aria-label={saved ? "Remove saved record" : "Save record"} onClick={(event) => { event.stopPropagation(); onSave(); }}>{saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}</button></div>
    <h3>{item.title}</h3><p>{item.summary}</p>
    <div className="story-meta"><SeverityPill item={item} /><span>{item.affected}</span><span>{ageLabel(item.updatedAt)}</span></div>
  </article>;
}

export function CyberChronicleApp({ initialData = EMPTY_RESPONSE }: { initialData?: RealIntelligenceResponse }) {
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<View>("Newsroom");
  const [navOpen, setNavOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<"All" | Severity>("All");
  const [selected, setSelected] = useState<RealIntelligenceItem | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("cyber-chronicle-saved");
    const restoreTimer = window.setTimeout(() => {
      if (stored) { try { setSaved(JSON.parse(stored)); } catch { setSaved([]); } }
    }, 0);
    const refresh = async () => {
      try {
        const response = await fetch("/api/intelligence", { headers: { accept: "application/json" } });
        const payload = await response.json() as RealIntelligenceResponse;
        if (payload && Array.isArray(payload.items)) setData(payload);
      } catch { /* The rendered source status remains visible. */ }
    };
    void refresh();
    const timer = window.setInterval(refresh, 5 * 60_000);
    return () => { window.clearTimeout(restoreTimer); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && !(event.target instanceof HTMLInputElement)) { event.preventDefault(); document.getElementById("global-search")?.focus(); }
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ordered = useMemo(() => [...data.items].sort((a, b) => {
    if (a.source !== b.source) return a.source === "CISA KEV" ? -1 : 1;
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  }), [data.items]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ordered.filter((item) => {
      const level = urgency(item);
      return (severity === "All" || level === severity) && (!needle || `${item.title} ${item.summary} ${item.cve} ${item.affected}`.toLowerCase().includes(needle));
    });
  }, [ordered, query, severity]);
  const alerts = ordered.filter((item) => item.source === "CISA KEV" || item.severity === "Critical").slice(0, 20);

  const toggleSaved = (id: string) => setSaved((current) => {
    const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
    window.localStorage.setItem("cyber-chronicle-saved", JSON.stringify(next)); return next;
  });
  const currentSources = data.sources.filter((source) => source.status === "current").length;

  return <div className={`app-shell ${navOpen ? "" : "nav-collapsed"}`}>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Radar size={21} /></div><div className="brand-copy"><strong>Cyber Chronicle</strong><span>REAL INTELLIGENCE DESK</span></div></div>
      <nav aria-label="Primary navigation"><p className="nav-label">Workspace</p>{navItems.slice(0, 4).map(({ name, icon: Icon }) => <button key={name} className={view === name ? "active" : ""} onClick={() => setView(name)} title={name}><Icon size={18} /><span>{name}</span>{name === "Critical Alerts" && <b>{alerts.length}</b>}</button>)}<p className="nav-label">Personal</p>{navItems.slice(4).map(({ name, icon: Icon }) => <button key={name} className={view === name ? "active" : ""} onClick={() => setView(name)} title={name}><Icon size={18} /><span>{name}</span></button>)}</nav>
      <div className="source-health"><span className={`health-dot ${data.state === "unavailable" ? "offline" : ""}`} /><div><strong>Authoritative sources</strong><span>{currentSources} / {data.sources.length || 2} currently reachable</span></div></div>
      <button className="collapse-button" onClick={() => setNavOpen((value) => !value)}><Menu size={17} /><span>Collapse navigation</span></button>
    </aside>

    <main><header className="command-bar"><div className="search-wrap"><Search size={17} /><input id="global-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search real CVEs, vendors, products…" aria-label="Search intelligence" /><kbd>/</kbd></div><div className="freshness"><span className="live-dot" />{data.lastSuccessfulAt ? `Retrieved ${ageLabel(data.lastSuccessfulAt)}` : "Awaiting sources"}</div><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotificationsOpen((value) => !value)}><Bell size={19} /><span>{Math.min(alerts.length, 99)}</span></button><div className="avatar">CC</div>{notificationsOpen && <div className="notification-popover"><div><strong>Latest authoritative records</strong><button className="icon-button" onClick={() => setNotificationsOpen(false)}><X size={16} /></button></div>{alerts.slice(0, 3).map((item) => <p key={item.id}><b>{item.source}</b>{item.cve} · {item.affected}</p>)}</div>}</header>
      <div className={`demo-banner source-state-${data.state}`}><ShieldCheck size={14} /><strong>Real-source mode:</strong>{data.notice} No AI-generated or simulated incidents are displayed.</div>
      {view === "Newsroom" && <Newsroom items={visible} severity={severity} setSeverity={setSeverity} saved={saved} onSave={toggleSaved} onOpen={setSelected} data={data} />}
      {view === "Live Feed" && <LiveFeed items={visible} onOpen={setSelected} />}
      {view === "Critical Alerts" && <Alerts items={alerts} asOf={data.generatedAt} onOpen={setSelected} />}
      {view === "Vulnerabilities" && <VulnerabilityView items={ordered} />}
      {view === "Saved" && <SavedView items={ordered.filter((item) => saved.includes(item.id))} saved={saved} onSave={toggleSaved} onOpen={setSelected} />}
      {view === "Settings" && <SettingsView data={data} />}
    </main>
    {selected && <StoryDrawer item={selected} saved={saved.includes(selected.id)} onSave={() => toggleSaved(selected.id)} onClose={() => setSelected(null)} />}
  </div>;
}

function PageHeading({ title, eyebrow, children }: { title: string; eyebrow: string; children?: React.ReactNode }) { return <div className="page-heading"><div><span>{eyebrow}</span><h1>{title}</h1></div>{children}</div>; }

function Newsroom({ items, severity, setSeverity, saved, onSave, onOpen, data }: { items: RealIntelligenceItem[]; severity: "All" | Severity; setSeverity: (value: "All" | Severity) => void; saved: string[]; onSave: (id: string) => void; onOpen: (item: RealIntelligenceItem) => void; data: RealIntelligenceResponse }) {
  const lead = items[0];
  if (!lead) return <div className="page single-page"><PageHeading eyebrow="Authoritative-source monitor" title="Intelligence newsroom" /><Unavailable notice={data.notice} /></div>;
  return <div className="page newsroom-page"><PageHeading eyebrow={data.generatedAt ? `Retrieved ${dateLabel(data.generatedAt, true)}` : "Authoritative-source monitor"} title="Intelligence newsroom"><a className="brief-button" href={CISA_CATALOG} target="_blank" rel="noreferrer"><FileText size={16} />Open CISA catalog<ExternalLink size={13} /></a></PageHeading>
    <div className="newsroom-grid"><section className="lead-story" onClick={() => onOpen(lead)}><div className="lead-pattern" /><div className="lead-content"><div className="breaking-line"><span>Latest authoritative intelligence</span><span>{lead.source}</span></div><div className="lead-pills"><SeverityPill item={lead} /><SourcePill item={lead} /></div><h2>{lead.title}</h2><p>{lead.summary}</p><div className="lead-footer"><span><Clock3 size={14} />Updated {dateLabel(lead.updatedAt)}</span><span>{lead.affected}</span><button>Open source record <ChevronRight size={16} /></button></div></div></section>
      <aside className="alert-stack"><div className="section-title"><span>Recently exploited</span><a href={CISA_CATALOG} target="_blank" rel="noreferrer">Official catalog</a></div>{items.filter((item) => item.source === "CISA KEV").slice(0, 3).map((item, index) => <button className="mini-alert" key={item.id} onClick={() => onOpen(item)}><span className={`alert-index ${index === 0 ? "hot" : ""}`}>0{index + 1}</span><div><SeverityPill item={item} /><strong>{item.title}</strong><span>{item.affected} · Added {dateLabel(item.publishedAt)}</span></div><ChevronRight size={16} /></button>)}</aside></div>
    <section className="content-section"><div className="section-title"><div><span>Latest government-source records</span><small>{items.length} records match this view</small></div><div className="filter-row"><Filter size={15} /><select value={severity} onChange={(event) => setSeverity(event.target.value as "All" | Severity)} aria-label="Filter by severity"><option>All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option><option>Unknown</option></select></div></div><div className="story-grid">{items.slice(1, 13).map((item) => <StoryCard key={item.id} item={item} saved={saved.includes(item.id)} onSave={() => onSave(item.id)} onOpen={() => onOpen(item)} />)}</div></section>
    <IntelligenceRail items={items} data={data} />
  </div>;
}

function IntelligenceRail({ items, data }: { items: RealIntelligenceItem[]; data: RealIntelligenceResponse }) {
  const vendors = [...new Set(items.filter((item) => item.source === "CISA KEV").map((item) => item.affected.split(" ")[0]))].slice(0, 4);
  const ransomware = items.filter((item) => item.summary.toLowerCase().includes("ransomware")).length;
  return <aside className="intel-rail"><section><div className="section-title"><span>Source status</span><ShieldCheck size={16} /></div>{data.sources.map((source) => <div className="trend-row" key={source.id}><b>{source.status === "current" ? "OK" : "—"}</b><span>{source.name}</span><em>{source.itemCount}</em></div>)}</section><section><div className="section-title"><span>Recent vendors</span><TrendingUp size={16} /></div>{vendors.map((vendor, index) => <div className="trend-row" key={vendor}><b>0{index + 1}</b><span>{vendor}</span><em>KEV</em></div>)}</section><section className="brief-card"><span><ShieldCheck size={15} />CATALOG SUMMARY</span><p>{items.filter((item) => item.source === "CISA KEV").length} recent CISA KEV records and {items.filter((item) => item.source === "NVD").length} recently modified NVD records are loaded. {ransomware} visible descriptions mention ransomware.</p><a href={CISA_CATALOG} target="_blank" rel="noreferrer">Verify at CISA <ChevronRight size={14} /></a></section></aside>;
}

function LiveFeed({ items, onOpen }: { items: RealIntelligenceItem[]; onOpen: (item: RealIntelligenceItem) => void }) { return <div className="page single-page"><PageHeading eyebrow="Government-source records" title="Live vulnerability feed"><span className="stream-status"><span className="live-dot" />Auto-refreshing</span></PageHeading><div className="feed-controls"><div className="feed-filters"><button className="active">All records</button><button>CISA KEV</button><button>NVD</button></div><span className="outline-button"><Gauge size={16} />Source timestamps shown</span></div><section className="feed-list">{items.slice(0, 100).map((item) => <button className="feed-event" key={item.id} onClick={() => onOpen(item)}><span className="feed-time">{dateLabel(item.updatedAt)}<i /></span><div className="feed-body"><div><span className="eyebrow">{item.source}</span><span className="state state-verified">Authoritative record</span></div><h3>{item.title}</h3><p>{item.summary}</p><div className="story-meta"><SeverityPill item={item} /><span>{item.cve}</span><span>{item.affected}</span></div></div><ChevronRight size={17} /></button>)}</section></div>; }

function Alerts({ items, asOf, onOpen }: { items: RealIntelligenceItem[]; asOf: string; onOpen: (item: RealIntelligenceItem) => void }) {
  const referenceTime = Date.parse(asOf);
  const dueSoon = items.filter((item) => item.dueDate && Number.isFinite(referenceTime) && Date.parse(item.dueDate) <= referenceTime + 7 * 86_400_000).length;
  return <div className="page single-page"><PageHeading eyebrow="Evidence-backed queue" title="Exploitation priorities"><a className="outline-button" href={CISA_CATALOG} target="_blank" rel="noreferrer"><ExternalLink size={16} />Verify source</a></PageHeading><div className="metric-row"><Metric label="Visible priorities" value={String(items.length).padStart(2, "0")} change="Current view" icon={Siren} /><Metric label="CISA KEV" value={String(items.filter((item) => item.source === "CISA KEV").length).padStart(2, "0")} change="Known exploited" icon={CircleAlert} /><Metric label="Due within 7 days" value={String(dueSoon).padStart(2, "0")} change="CISA dates" icon={Clock3} /><Metric label="Source basis" value="US" change="CISA + NIST" icon={ShieldCheck} /></div><section className="table-card"><div className="table-head alert-table"><span>Evidence</span><span>Record</span><span>Affected product</span><span>Source</span><span>Updated</span><span /></div>{items.map((item) => <button className="table-row alert-table" key={item.id} onClick={() => onOpen(item)}><span><SeverityPill item={item} /></span><strong>{item.title}</strong><span>{item.affected}</span><span>{item.source}</span><span>{dateLabel(item.updatedAt)}</span><ChevronRight size={16} /></button>)}</section></div>;
}

function Metric({ label, value, change, icon: Icon }: { label: string; value: string; change: string; icon: typeof Radar }) { return <div className="metric"><span><Icon size={17} />{label}</span><strong>{value}</strong><small>{change}</small></div>; }

function VulnerabilityView({ items }: { items: RealIntelligenceItem[] }) {
  const [activeOnly, setActiveOnly] = useState(false);
  const rows = (activeOnly ? items.filter((item) => item.source === "CISA KEV") : items).slice(0, 100);
  return <div className="page single-page"><PageHeading eyebrow="CISA and NIST records" title="Vulnerability dashboard"><button className={`toggle-button ${activeOnly ? "on" : ""}`} onClick={() => setActiveOnly((value) => !value)}><span />CISA known-exploited only</button></PageHeading><section className="table-card"><div className="table-head cve-table"><span>CVE</span><span>Product</span><span>Evidence / CVSS</span><span>Source</span><span>Added</span><span>Due</span></div>{rows.map((item) => <div className="table-row cve-table" key={item.id}><strong className="mono">{item.cve}</strong><span>{item.affected}</span><span><SeverityPill item={item} /></span><span>{item.source}</span><span>{dateLabel(item.publishedAt)}</span><span>{item.dueDate ? dateLabel(item.dueDate) : "—"}</span></div>)}</section><div className="evidence-note"><ShieldCheck size={18} /><div><strong>Evidence policy</strong><p>“Known exploited” is shown only for entries in CISA’s KEV catalog. NVD severity is shown only when supplied by NVD CVSS data. Cyber Chronicle does not infer a CVSS score.</p></div></div></div>;
}

function SavedView({ items, saved, onSave, onOpen }: { items: RealIntelligenceItem[]; saved: string[]; onSave: (id: string) => void; onOpen: (item: RealIntelligenceItem) => void }) { return <div className="page single-page"><PageHeading eyebrow="Stored only on this device" title="Saved records" /><div className="story-grid">{items.length ? items.map((item) => <StoryCard key={item.id} item={item} saved={saved.includes(item.id)} onSave={() => onSave(item.id)} onOpen={() => onOpen(item)} />) : <Unavailable notice="No records are saved on this device." />}</div></div>; }

function SettingsView({ data }: { data: RealIntelligenceResponse }) { return <div className="page single-page"><PageHeading eyebrow="Transparency" title="Sources & methodology" /><div className="settings-grid"><section><h3>Current sources</h3>{data.sources.map((source) => <a className="setting-row" href={source.url} target="_blank" rel="noreferrer" key={source.id}><div><strong>{source.name}</strong><span>{source.authority} · {source.status} · {source.itemCount} records</span></div><ExternalLink size={16} /></a>)}</section><section><h3>What Cyber Chronicle does</h3><div className="setting-row"><div><strong>No invented news</strong><span>Unavailable sources produce an explicit unavailable state, never synthetic incidents.</span></div><ShieldCheck size={17} /></div><div className="setting-row"><div><strong>Source-preserving display</strong><span>Descriptions, dates, actions, and severity labels remain attributed to their government source.</span></div><ShieldCheck size={17} /></div><div className="setting-row"><div><strong>NVD attribution</strong><span>This product uses data from the NVD API but is not endorsed or certified by the NVD.</span></div><ShieldCheck size={17} /></div></section></div></div>; }

function StoryDrawer({ item, saved, onSave, onClose }: { item: RealIntelligenceItem; saved: boolean; onSave: () => void; onClose: () => void }) {
  return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="story-drawer" onMouseDown={(event) => event.stopPropagation()}><div className="drawer-top"><span className="eyebrow">{item.source} · authoritative record</span><div><button className="icon-button" onClick={onSave}>{saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}</button><button className="icon-button" onClick={onClose}><X size={19} /></button></div></div><div className="drawer-scroll"><div className="lead-pills"><SeverityPill item={item} /><SourcePill item={item} /></div><h2>{item.title}</h2><p className="drawer-dek">{item.summary}</p><div className="fact-grid"><div><span>Published / added</span><strong>{dateLabel(item.publishedAt)}</strong></div><div><span>Last source update</span><strong>{dateLabel(item.updatedAt)}</strong></div><div><span>Affected</span><strong>{item.affected}</strong></div><div><span>Identifier</span><strong>{item.cve}</strong></div></div>{item.action && <section className="action-panel"><span>Authoritative required action</span><p>{item.action}</p>{item.dueDate && <strong>Due date: {dateLabel(item.dueDate)}</strong>}</section>}<DrawerSection title="Source record"><p>This content is displayed from {item.source}. Cyber Chronicle has not added claims about exploitation scope, affected versions, severity, or attribution beyond the structured source record.</p>{item.references.map((reference) => <a className="source-row" href={reference} target="_blank" rel="noreferrer" key={reference}><ExternalLink size={17} /><div><strong>Open original reference</strong><span>{reference}</span></div></a>)}</DrawerSection><DrawerSection title="Defensive use"><p>Confirm that the product and version are present in your environment, then follow the linked vendor and government guidance. Do not treat a catalog entry alone as proof that a specific organization was compromised.</p></DrawerSection></div></aside></div>;
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="drawer-section"><h3>{title}</h3>{children}</section>; }
function Unavailable({ notice }: { notice: string }) { return <div className="full-empty"><AlertTriangle size={24} /><h3>No authoritative records to display</h3><p>{notice}</p></div>; }
