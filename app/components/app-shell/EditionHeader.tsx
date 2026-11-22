"use client";

import { Check, ChevronRight, Download, Menu, Moon, RefreshCw, Search, ShieldCheck, Sun, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { RealIntelligenceItem, RealIntelligenceResponse } from "../../../lib/models";
import { formatDate, plainTitle, relativeTime, type Domain } from "../../../lib/editorial";
import { EditionStatus } from "./EditionStatus";

type Props = {
  data: RealIntelligenceResponse;
  now: number;
  edition: "cyber" | "general";
  domain: Domain | "Latest";
  domains: Domain[];
  query: string;
  mobileMenu: boolean;
  isOnline: boolean;
  isRefreshing: boolean;
  canInstall: boolean;
  theme: "light" | "dark";
  breaking: RealIntelligenceItem | null;
  refreshMessage: string | null;
  notice: string | null;
  onEditionChange: (edition: "cyber" | "general") => void;
  onDomainChange: (domain: Domain | "Latest") => void;
  onQueryChange: (query: string) => void;
  onToggleMenu: () => void;
  onToggleTheme: () => void;
  onRefresh: () => void;
  onInstall: () => void;
  onOpenSources: () => void;
  onOpenStory: (item: RealIntelligenceItem) => void;
  onDismissRefresh: () => void;
  onDismissNotice: () => void;
};

export function EditionHeader(props: Props) {
  const currentSources = props.data.sources.filter((source) => source.status === "current").length;
  return <header className="site-header">
    <div className="utility-bar">
      <span>{formatDate(new Date(props.now).toISOString())}</span>
      <span className="edition-status"><i />{props.isOnline ? "Free edition" : "Offline"} · {currentSources}/{props.data.sources.length} sources reporting</span>
      <div>
        {props.canInstall && <button onClick={props.onInstall} aria-label="Install app"><Download size={14} />Install app</button>}
        <button onClick={props.onRefresh} disabled={props.isRefreshing || !props.isOnline} aria-label="Refresh edition"><RefreshCw className={props.isRefreshing ? "spin" : ""} size={14} />{props.isRefreshing ? "Updating" : "Refresh"}</button>
        <button onClick={props.onToggleTheme} aria-label={`Switch to ${props.theme === "light" ? "dark" : "light"} theme`}>{props.theme === "light" ? <Moon size={15} /> : <Sun size={15} />}</button>
      </div>
    </div>
    <div className="masthead">
      <button className="mobile-menu-button" onClick={props.onToggleMenu} aria-expanded={props.mobileMenu} aria-label="News sections"><Menu size={22} /></button>
      <div className="masthead-title"><span className="brand-shield"><ShieldCheck size={22} /></span><div><strong>Cyber Chronicle</strong><small>Trusted Cybersecurity News. Simplified.</small></div></div>
      <label className="header-search"><Search size={17} /><input value={props.query} onChange={(event) => props.onQueryChange(event.target.value)} placeholder={`Search ${props.edition === "cyber" ? "cybersecurity" : "general news"}`} aria-label="Search the news" />{props.query && <button onClick={() => props.onQueryChange("")} aria-label="Clear search"><X size={15} /></button>}</label>
    </div>
    <div className="edition-toolbar">
      <div className="edition-switch" role="group" aria-label="News edition">
        <button aria-pressed={props.edition === "cyber"} onClick={() => props.onEditionChange("cyber")}>Cyber</button>
        <button aria-pressed={props.edition === "general"} onClick={() => props.onEditionChange("general")}>General</button>
      </div>
      <EditionStatus edition={props.data} now={props.now} onOpenSources={props.onOpenSources} />
    </div>
    <nav className={props.mobileMenu ? "section-nav nav-open" : "section-nav"} aria-label="News sections">
      <button className={props.domain === "Latest" ? "active" : ""} onClick={() => props.onDomainChange("Latest")}>Latest</button>
      {props.domains.map((domain) => <button key={domain} className={props.domain === domain ? "active" : ""} onClick={() => props.onDomainChange(domain)}>{domain}</button>)}
    </nav>
    {props.breaking && <div className="breaking-strip breaking-active" aria-live="polite">
      <strong>BREAKING</strong>
      <button onClick={() => props.breaking && props.onOpenStory(props.breaking)}><span>{plainTitle(props.breaking)}</span><ChevronRight size={15} /></button>
      <small>{relativeTime(props.breaking.publishedAt)}</small>
    </div>}
    {props.refreshMessage && <div className="refresh-note"><Check size={15} />{props.refreshMessage}<button onClick={props.onDismissRefresh} aria-label="Dismiss update message"><X size={14} /></button></div>}
    <AnimatePresence>{props.notice && <motion.div className="refresh-note alert-banner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ShieldCheck size={15} /><span style={{ flex: 1 }}>{props.notice}</span><button onClick={props.onDismissNotice} aria-label="Dismiss notice"><X size={14} /></button></motion.div>}</AnimatePresence>
  </header>;
}
