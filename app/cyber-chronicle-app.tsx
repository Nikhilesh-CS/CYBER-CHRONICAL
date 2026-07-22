"use client";

import {
  Activity, AlertTriangle, Bell, Bookmark, BookmarkCheck, ChevronRight,
  CircleAlert, Clock3, ExternalLink, FileText, Filter, Gauge, LayoutDashboard,
  Menu, Radar, Search, Settings, ShieldCheck, Siren, TrendingUp, X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { RealIntelligenceItem, RealIntelligenceResponse } from "./api/intelligence/real-data";

type View = "Newsroom" | "Live Feed" | "India Advisories" | "Security Records" | "Saved" | "Settings";
type SourceFilter = "All" | RealIntelligenceItem["source"];

const CERT_IN_ADVISORIES = "https://www.cert-in.org.in/s2cMainServlet?pageid=PUBADVLIST02";
const EMPTY_RESPONSE: RealIntelligenceResponse = {
  state: "unavailable", generatedAt: new Date(0).toISOString(), lastSuccessfulAt: null,
  cacheAgeSeconds: null, notice: "Connecting to authoritative sources…", items: [], sources: [],
};

const navItems: { name: View; icon: typeof Radar }[] = [
  { name: "Newsroom", icon: LayoutDashboard }, { name: "Live Feed", icon: Activity },
  { name: "India Advisories", icon: Siren }, { name: "Security Records", icon: ShieldCheck },
  { name: "Saved", icon: Bookmark }, { name: "Settings", icon: Settings },
];

function dateLabel(value: string, withTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata", ...(withTime ? { timeStyle: "short" } : {}) }).format(date);
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

function evidenceLabel(item: RealIntelligenceItem) {
  return item.source === "CERT-In Advisory" ? "Official advisory" : "Vulnerability note";
}

function SeverityPill({ item }: { item: RealIntelligenceItem }) {
  return <span className="severity severity-unknown"><span />{evidenceLabel(item)}</span>;
}

function SourcePill({ item }: { item: RealIntelligenceItem }) {
  return <span className="confidence"><ShieldCheck size={13} />{item.source}</span>;
}

function StoryCard({ item, onOpen, saved, onSave }: { item: RealIntelligenceItem; onOpen: () => void; saved: boolean; onSave: () => void }) {
  return <article className="story-card" onClick={onOpen} tabIndex={0} onKeyDown={(event) => event.key === "Enter" && onOpen()}>
    <div className="story-card-top"><span className="eyebrow">{item.source} · {item.identifier}</span><button className="icon-button save-button" aria-label={saved ? "Remove saved record" : "Save record"} onClick={(event) => { event.stopPropagation(); onSave(); }}>{saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}</button></div>
    <h3>{item.title}</h3><p>{item.summary}</p>
    <div className="story-meta"><SeverityPill item={item} /><span>{item.affected}</span><span>{ageLabel(item.updatedAt)}</span></div>
  </article>;
}

export function CyberChronicleApp({ initialData = EMPTY_RESPONSE }: { initialData?: RealIntelligenceResponse }) {
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<View>("Newsroom");
  const [navOpen, setNavOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("All");
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

  const ordered = useMemo(() => [...data.items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)), [data.items]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ordered.filter((item) => {
      return (sourceFilter === "All" || item.source === sourceFilter) && (!needle || `${item.title} ${item.summary} ${item.identifier} ${item.affected}`.toLowerCase().includes(needle));
    });
  }, [ordered, query, sourceFilter]);
  const alerts = ordered.filter((item) => item.source === "CERT-In Advisory").slice(0, 20);

  const toggleSaved = (id: string) => setSaved((current) => {
    const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
    window.localStorage.setItem("cyber-chronicle-saved", JSON.stringify(next)); return next;
  });
  const currentSources = data.sources.filter((source) => source.status === "current").length;

  return <div className={`app-shell ${navOpen ? "" : "nav-collapsed"}`}>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Radar size={21} /></div><div className="brand-copy"><strong>Cyber Chronicle</strong><span>INDIA INTELLIGENCE DESK</span></div></div>
      <nav aria-label="Primary navigation"><p className="nav-label">Workspace</p>{navItems.slice(0, 4).map(({ name, icon: Icon }) => <button key={name} className={view === name ? "active" : ""} onClick={() => setView(name)} title={name}><Icon size={18} /><span>{name}</span>{name === "India Advisories" && <b>{alerts.length}</b>}</button>)}<p className="nav-label">Personal</p>{navItems.slice(4).map(({ name, icon: Icon }) => <button key={name} className={view === name ? "active" : ""} onClick={() => setView(name)} title={name}><Icon size={18} /><span>{name}</span></button>)}</nav>
      <div className="source-health"><span className={`health-dot ${data.state === "unavailable" ? "offline" : ""}`} /><div><strong>Authoritative sources</strong><span>{currentSources} / {data.sources.length || 2} currently reachable</span></div></div>
      <button className="collapse-button" onClick={() => setNavOpen((value) => !value)}><Menu size={17} /><span>Collapse navigation</span></button>
    </aside>

    <main><header className="command-bar"><div className="search-wrap"><Search size={17} /><input id="global-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search CERT-In IDs, advisories and products…" aria-label="Search intelligence" /><kbd>/</kbd></div><div className="freshness"><span className="live-dot" />{data.lastSuccessfulAt ? `Retrieved ${ageLabel(data.lastSuccessfulAt)}` : "Awaiting CERT-In"}</div><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotificationsOpen((value) => !value)}><Bell size={19} /><span>{Math.min(alerts.length, 99)}</span></button><div className="avatar">IN</div>{notificationsOpen && <div className="notification-popover"><div><strong>Latest India advisories</strong><button className="icon-button" onClick={() => setNotificationsOpen(false)}><X size={16} /></button></div>{alerts.slice(0, 3).map((item) => <p key={item.id}><b>CERT-In</b>{item.identifier} · {item.title.replace(`${item.identifier}: `, "")}</p>)}</div>}</header>
      <div className={`demo-banner source-state-${data.state}`}><ShieldCheck size={14} /><strong>India-only mode:</strong>{data.notice} No non-Indian sources or simulated incidents are displayed.</div>
      {view === "Newsroom" && <Newsroom items={visible} sourceFilter={sourceFilter} setSourceFilter={setSourceFilter} saved={saved} onSave={toggleSaved} onOpen={setSelected} data={data} />}
      {view === "Live Feed" && <LiveFeed items={visible} onOpen={setSelected} />}
      {view === "India Advisories" && <Alerts items={alerts} onOpen={setSelected} />}
      {view === "Security Records" && <VulnerabilityView items={ordered} />}
      {view === "Saved" && <SavedView items={ordered.filter((item) => saved.includes(item.id))} saved={saved} onSave={toggleSaved} onOpen={setSelected} />}
      {view === "Settings" && <SettingsView data={data} />}
    </main>
    {selected && <StoryDrawer item={selected} saved={saved.includes(selected.id)} onSave={() => toggleSaved(selected.id)} onClose={() => setSelected(null)} />}
  </div>;
}

function PageHeading({ title, eyebrow, children }: { title: string; eyebrow: string; children?: React.ReactNode }) { return <div className="page-heading"><div><span>{eyebrow}</span><h1>{title}</h1></div>{children}</div>; }

function Newsroom({ items, sourceFilter, setSourceFilter, saved, onSave, onOpen, data }: { items: RealIntelligenceItem[]; sourceFilter: SourceFilter; setSourceFilter: (value: SourceFilter) => void; saved: string[]; onSave: (id: string) => void; onOpen: (item: RealIntelligenceItem) => void; data: RealIntelligenceResponse }) {
  const lead = items[0];
  if (!lead) return <div className="page single-page"><PageHeading eyebrow="India source monitor" title="India intelligence newsroom" /><Unavailable notice={data.notice} /></div>;
  return <div className="page newsroom-page"><PageHeading eyebrow={data.generatedAt ? `Retrieved ${dateLabel(data.generatedAt, true)} IST` : "India source monitor"} title="India intelligence newsroom"><a className="brief-button" href={CERT_IN_ADVISORIES} target="_blank" rel="noreferrer"><FileText size={16} />Open CERT-In<ExternalLink size={13} /></a></PageHeading>
    <div className="newsroom-grid"><section className="lead-story" onClick={() => onOpen(lead)}><div className="lead-pattern" /><div className="lead-content"><div className="breaking-line"><span>Latest official India record</span><span>{lead.source}</span></div><div className="lead-pills"><SeverityPill item={lead} /><SourcePill item={lead} /></div><h2>{lead.title}</h2><p>{lead.summary}</p><div className="lead-footer"><span><Clock3 size={14} />Published {dateLabel(lead.publishedAt)}</span><span>{lead.identifier}</span><button>Open record <ChevronRight size={16} /></button></div></div></section>
      <aside className="alert-stack"><div className="section-title"><span>Latest CERT-In advisories</span><a href={CERT_IN_ADVISORIES} target="_blank" rel="noreferrer">Official source</a></div>{items.filter((item) => item.source === "CERT-In Advisory").slice(0, 3).map((item, index) => <button className="mini-alert" key={item.id} onClick={() => onOpen(item)}><span className={`alert-index ${index === 0 ? "hot" : ""}`}>0{index + 1}</span><div><SeverityPill item={item} /><strong>{item.title}</strong><span>{item.identifier} · {dateLabel(item.publishedAt)}</span></div><ChevronRight size={16} /></button>)}</aside></div>
    <section className="content-section"><div className="section-title"><div><span>Latest CERT-In records</span><small>{items.length} records match this view</small></div><div className="filter-row"><Filter size={15} /><select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as SourceFilter)} aria-label="Filter by CERT-In record type"><option>All</option><option>CERT-In Advisory</option><option>CERT-In Vulnerability Note</option></select></div></div><div className="story-grid">{items.slice(1, 13).map((item) => <StoryCard key={item.id} item={item} saved={saved.includes(item.id)} onSave={() => onSave(item.id)} onOpen={() => onOpen(item)} />)}</div></section>
    <IntelligenceRail items={items} data={data} />
  </div>;
}

function IntelligenceRail({ items, data }: { items: RealIntelligenceItem[]; data: RealIntelligenceResponse }) {
  const advisoryCount = items.filter((item) => item.source === "CERT-In Advisory").length;
  const noteCount = items.filter((item) => item.source === "CERT-In Vulnerability Note").length;
  return <aside className="intel-rail"><section><div className="section-title"><span>India source status</span><ShieldCheck size={16} /></div>{data.sources.map((source) => <div className="trend-row" key={source.id}><b>{source.status === "current" ? "OK" : "—"}</b><span>{source.name}</span><em>{source.itemCount}</em></div>)}</section><section><div className="section-title"><span>Record coverage</span><TrendingUp size={16} /></div><div className="trend-row"><b>01</b><span>Advisories</span><em>{advisoryCount}</em></div><div className="trend-row"><b>02</b><span>Vulnerability notes</span><em>{noteCount}</em></div></section><section className="brief-card"><span><ShieldCheck size={15} />INDIA SOURCE SUMMARY</span><p>{items.length} recent metadata records are loaded directly from CERT-In. Open the official record for severity, affected systems and remediation.</p><a href={CERT_IN_ADVISORIES} target="_blank" rel="noreferrer">Verify at CERT-In <ChevronRight size={14} /></a></section></aside>;
}

function LiveFeed({ items, onOpen }: { items: RealIntelligenceItem[]; onOpen: (item: RealIntelligenceItem) => void }) { return <div className="page single-page"><PageHeading eyebrow="Official Indian cyber records" title="CERT-In live feed"><span className="stream-status"><span className="live-dot" />Auto-refreshing</span></PageHeading><div className="feed-controls"><div className="feed-filters"><button className="active">All CERT-In records</button></div><span className="outline-button"><Gauge size={16} />Publication dates shown</span></div><section className="feed-list">{items.slice(0, 100).map((item) => <button className="feed-event" key={item.id} onClick={() => onOpen(item)}><span className="feed-time">{dateLabel(item.updatedAt)}<i /></span><div className="feed-body"><div><span className="eyebrow">{item.source}</span><span className="state state-verified">Official India record</span></div><h3>{item.title}</h3><p>{item.summary}</p><div className="story-meta"><SeverityPill item={item} /><span>{item.identifier}</span><span>CERT-In</span></div></div><ChevronRight size={17} /></button>)}</section></div>; }

function Alerts({ items, onOpen }: { items: RealIntelligenceItem[]; onOpen: (item: RealIntelligenceItem) => void }) {
  const latestDate = items[0]?.publishedAt;
  const latestCount = latestDate ? items.filter((item) => item.publishedAt === latestDate).length : 0;
  return <div className="page single-page"><PageHeading eyebrow="Official India queue" title="CERT-In advisories"><a className="outline-button" href={CERT_IN_ADVISORIES} target="_blank" rel="noreferrer"><ExternalLink size={16} />Verify source</a></PageHeading><div className="metric-row"><Metric label="Visible advisories" value={String(items.length).padStart(2, "0")} change="Current page" icon={Siren} /><Metric label="Latest publication" value={String(latestCount).padStart(2, "0")} change={latestDate ? dateLabel(latestDate) : "None"} icon={CircleAlert} /><Metric label="Authority" value="IN" change="CERT-In" icon={ShieldCheck} /><Metric label="Content mode" value="META" change="Direct links" icon={FileText} /></div><section className="table-card"><div className="table-head alert-table"><span>Type</span><span>Record</span><span>Identifier</span><span>Source</span><span>Published</span><span /></div>{items.map((item) => <button className="table-row alert-table" key={item.id} onClick={() => onOpen(item)}><span><SeverityPill item={item} /></span><strong>{item.title}</strong><span>{item.identifier}</span><span>CERT-In</span><span>{dateLabel(item.updatedAt)}</span><ChevronRight size={16} /></button>)}</section></div>;
}

function Metric({ label, value, change, icon: Icon }: { label: string; value: string; change: string; icon: typeof Radar }) { return <div className="metric"><span><Icon size={17} />{label}</span><strong>{value}</strong><small>{change}</small></div>; }

function VulnerabilityView({ items }: { items: RealIntelligenceItem[] }) {
  const [notesOnly, setNotesOnly] = useState(false);
  const rows = (notesOnly ? items.filter((item) => item.source === "CERT-In Vulnerability Note") : items).slice(0, 100);
  return <div className="page single-page"><PageHeading eyebrow="CERT-In India records" title="Security record dashboard"><button className={`toggle-button ${notesOnly ? "on" : ""}`} onClick={() => setNotesOnly((value) => !value)}><span />Vulnerability notes only</button></PageHeading><section className="table-card"><div className="table-head cve-table"><span>Identifier</span><span>Official title</span><span>Record type</span><span>Authority</span><span>Published</span><span>Open</span></div>{rows.map((item) => <div className="table-row cve-table" key={item.id}><strong className="mono">{item.identifier}</strong><span>{item.title.replace(`${item.identifier}: `, "")}</span><span><SeverityPill item={item} /></span><span>CERT-In</span><span>{dateLabel(item.publishedAt)}</span><a href={item.references[0]} target="_blank" rel="noreferrer">Source</a></div>)}</section><div className="evidence-note"><ShieldCheck size={18} /><div><strong>Metadata-only policy</strong><p>Cyber Chronicle shows the official CERT-In identifier, title, date and link. Open the CERT-In page for severity, affected software, technical analysis and remediation. No exploitation status is inferred.</p></div></div></div>;
}

function SavedView({ items, saved, onSave, onOpen }: { items: RealIntelligenceItem[]; saved: string[]; onSave: (id: string) => void; onOpen: (item: RealIntelligenceItem) => void }) { return <div className="page single-page"><PageHeading eyebrow="Stored only on this device" title="Saved records" /><div className="story-grid">{items.length ? items.map((item) => <StoryCard key={item.id} item={item} saved={saved.includes(item.id)} onSave={() => onSave(item.id)} onOpen={() => onOpen(item)} />) : <Unavailable notice="No records are saved on this device." />}</div></div>; }

function SettingsView({ data }: { data: RealIntelligenceResponse }) { return <div className="page single-page"><PageHeading eyebrow="Transparency" title="India sources & methodology" /><div className="settings-grid"><section><h3>Current India sources</h3>{data.sources.map((source) => <a className="setting-row" href={source.url} target="_blank" rel="noreferrer" key={source.id}><div><strong>{source.name}</strong><span>{source.authority} · {source.status} · {source.itemCount} records</span></div><ExternalLink size={16} /></a>)}</section><section><h3>What Cyber Chronicle does</h3><div className="setting-row"><div><strong>India-only collection</strong><span>This release requests only official CERT-In India pages. No non-Indian feeds are requested.</span></div><ShieldCheck size={17} /></div><div className="setting-row"><div><strong>Metadata-only display</strong><span>Only identifiers, titles, dates and direct links are displayed until broader reproduction permission exists.</span></div><ShieldCheck size={17} /></div><div className="setting-row"><div><strong>No invented news</strong><span>Unavailable sources produce an explicit unavailable state, never synthetic incidents.</span></div><ShieldCheck size={17} /></div></section></div></div>; }

function StoryDrawer({ item, saved, onSave, onClose }: { item: RealIntelligenceItem; saved: boolean; onSave: () => void; onClose: () => void }) {
  return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="story-drawer" onMouseDown={(event) => event.stopPropagation()}><div className="drawer-top"><span className="eyebrow">{item.source} · official India record</span><div><button className="icon-button" onClick={onSave}>{saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}</button><button className="icon-button" onClick={onClose}><X size={19} /></button></div></div><div className="drawer-scroll"><div className="lead-pills"><SeverityPill item={item} /><SourcePill item={item} /></div><h2>{item.title}</h2><p className="drawer-dek">{item.summary}</p><div className="fact-grid"><div><span>Published</span><strong>{dateLabel(item.publishedAt)}</strong></div><div><span>Authority</span><strong>CERT-In, Government of India</strong></div><div><span>Record type</span><strong>{item.source}</strong></div><div><span>Identifier</span><strong>{item.identifier}</strong></div></div><DrawerSection title="Official source"><p>Cyber Chronicle displays metadata only. Severity, affected systems, CVEs, technical details and remediation must be read on the linked CERT-In page.</p>{item.references.map((reference) => <a className="source-row" href={reference} target="_blank" rel="noreferrer" key={reference}><ExternalLink size={17} /><div><strong>Open official CERT-In record</strong><span>{reference}</span></div></a>)}</DrawerSection><DrawerSection title="Defensive use"><p>Review the official record, determine whether the listed technology exists in your environment and follow CERT-In and vendor guidance. A published record is not proof that a specific Indian organization was compromised.</p></DrawerSection></div></aside></div>;
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="drawer-section"><h3>{title}</h3>{children}</section>; }
function Unavailable({ notice }: { notice: string }) { return <div className="full-empty"><AlertTriangle size={24} /><h3>No authoritative records to display</h3><p>{notice}</p></div>; }
