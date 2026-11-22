"use client";

import { ArrowRight, Check, ExternalLink, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import type { RealIntelligenceItem, RealIntelligenceResponse } from "../../../lib/models";
import type { AppTab, SettingsPage } from "../../../lib/navigation";
import { computeDomain, formatDate, plainTitle, type Domain } from "../../../lib/editorial";
import { CREATOR_LINKS, PROJECT } from "../../../lib/project";
import { isSavedStory } from "../../../lib/reader";
import { NewsCard } from "../cards/NewsCard";
import { SectionHeading } from "../shared/SectionHeading";
import { EMPTY_FILTERS, StoryFilters, type FeedFilters } from "./StoryFilters";

type Item = RealIntelligenceItem;
type Props = {
  data: RealIntelligenceResponse;
  edition: "cyber" | "general";
  editionItems: Item[];
  activeDomain: Domain | "Latest";
  visibleDomains: Domain[];
  query: string;
  filters: FeedFilters;
  isScopedView: boolean;
  isRefreshing: boolean;
  filteredCount: number;
  stateOnly: boolean;
  followedState: string | null;
  followedStateStoryCount: number;
  stateFilterAvailable: boolean;
  personalized: boolean;
  currentLessonTitle?: string;
  saved: string[];
  visibleStoryCount: number;
  hero: Item | null;
  activeBreakingStory: Item | null;
  briefingStories: Item[];
  remainingFilteredStories: Item[];
  sections: { activeThreats: Item[]; threatIntel: Item[]; breaches: Item[]; aiTech: Item[]; globalIntel: Item[]; india: Item[]; enterprise: Item[]; latestFeed: Item[] };
  markAsRead: (item: Item) => void;
  toggleSaved: (id: string) => void;
  handleTabChange: (tab: AppTab) => void;
  handleDomainChange: (domain: Domain | "Latest") => void;
  handleSettingsPageChange: (page: SettingsPage) => void;
  domainCount: (domain: Domain) => number;
  setFilters: (value: FeedFilters) => void;
  onShowMore: () => void;
  setStateOnly: (value: boolean) => void;
  onClearQuery: () => void;
  onRefresh: () => void;
};

export function HomeScreen({
  data, edition, editionItems, activeDomain, visibleDomains, query, filters, isScopedView, isRefreshing, filteredCount,
  stateOnly, followedState, followedStateStoryCount, stateFilterAvailable, personalized, currentLessonTitle, saved,
  visibleStoryCount, hero, activeBreakingStory, briefingStories, remainingFilteredStories, sections, markAsRead, toggleSaved,
  handleTabChange, handleDomainChange, handleSettingsPageChange, domainCount, setFilters, onShowMore, setStateOnly, onClearQuery, onRefresh,
}: Props) {
  const { activeThreats, threatIntel, breaches, aiTech, globalIntel, india, enterprise, latestFeed } = sections;
  const hasFilters = Object.values(filters).some(Boolean);
  return (
    <main className="news-home">
      <h1 className="screen-reader-only">{edition === "cyber" ? "Cybersecurity news" : "General news"}</h1>
      <p className="edition-intro">Free, source-linked news. Saved stories and preferences stay on this device.</p>
      {currentLessonTitle && <aside className="academy-continue"><strong>Continue in Cyber Academy</strong><button onClick={() => handleTabChange("learn")}>{currentLessonTitle}</button></aside>}
      <StoryFilters value={filters} onChange={setFilters}
        sources={data.sources.filter((source) => editionItems.some((item) => item.sourceId === source.id || item.evidence.some((entry) => entry.sourceId === source.id)))}
        categories={[...new Set(editionItems.flatMap((item) => item.categories))].sort()} cyber={edition === "cyber"} />
      {personalized && (
        <motion.div className="interest-strip" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <span>FOR YOU</span>
          <p>Stories are now balanced using your reading and saved-story interests. Critical alerts always keep editorial priority.</p>
        </motion.div>
      )}
      {(query || hasFilters || activeDomain !== "Latest") && (
        <div className="results-banner">
          <div><span>Viewing</span><h1>{query ? `Search: "${query}"` : stateOnly && followedState ? followedState : activeDomain}</h1></div>
          <b>{filteredCount} stories</b>
        </div>
      )}

      {activeDomain === "India" && followedState && (
        stateFilterAvailable ? (
          <div className="state-filter-rail" role="toolbar" aria-label="India coverage">
            <button className={!stateOnly ? "active" : ""} aria-pressed={!stateOnly} onClick={() => setStateOnly(false)}>All India</button>
            <button className={stateOnly ? "active" : ""} aria-pressed={stateOnly} onClick={() => setStateOnly(true)}>{followedState} ({followedStateStoryCount})</button>
          </div>
        ) : (
          <div className="regional-coverage-notice" role="status">
            <strong>{followedState} coverage</strong>
            <span>Regional news coming soon. We’ll show the state filter automatically when enough verified stories are available.</span>
          </div>
        )
      )}

      {hero ? (
        <section className={`lead-grid ${activeBreakingStory ? "lead-grid-breaking" : ""}`} aria-label="Lead stories">
          {activeBreakingStory && <motion.div className="breaking-hero-label" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}><i />LIVE BREAKING INTELLIGENCE</motion.div>}
          <NewsCard
            item={hero}
            variant="lead"
            saved={isSavedStory(hero, saved)}
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
                  saved={isSavedStory(item, saved)}
                  onOpen={() => markAsRead(item)}
                  onSave={() => toggleSaved(item.id)}
                />
              ))}
            </div>
          </aside>
        </section>
      ) : data.items.length === 0 && isRefreshing ? (
        <section className="edition-skeleton" aria-busy="true" aria-label="Loading the news edition"><span /><span /><span /></section>
      ) : (
        <section className="search-empty-state" aria-live="polite">
          <Search size={28} />
          <h2>{data.items.length ? "No stories match this view" : "This edition is unavailable"}</h2>
          <p>{query
            ? "Try fewer words, check the spelling, or search all sections. Search matches headlines, summaries, categories, publishers, and advisory details."
            : data.items.length ? "Try widening your filters or news preferences." : data.notice}</p>
          <button onClick={() => !data.items.length ? onRefresh() : query ? onClearQuery() : hasFilters ? setFilters(EMPTY_FILTERS) : handleSettingsPageChange("preferences")}>{!data.items.length ? "Retry edition" : query ? "Clear search" : hasFilters ? "Reset filters" : "Review preferences"}</button>
        </section>
      )}

      {isScopedView && remainingFilteredStories.length > 0 && (
        <section className="news-section scoped-results" aria-label="More matching stories">
          <SectionHeading kicker="More results" title="All Matching Stories" />
          <div className="four-card-grid">
            {remainingFilteredStories.slice(0, visibleStoryCount).map((item) => <NewsCard key={item.id} item={item} variant="standard" saved={isSavedStory(item, saved)} onSave={() => toggleSaved(item.id)} onOpen={() => markAsRead(item)} />)}
          </div>
          {remainingFilteredStories.length > visibleStoryCount && <button className="primary-button" onClick={onShowMore}>Show more stories</button>}
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
              saved={isSavedStory(item, saved)}
              onOpen={() => markAsRead(item)}
              onSave={() => toggleSaved(item.id)}
            />
          ))}
        </div>
      </section>

      <section className="news-section">
        <SectionHeading kicker="Analysis & Campaigns" title="Threat Intelligence" action="Filter by type" onAction={() => handleTabChange("intelligence")} />
        <div className="four-card-grid">
          {threatIntel.map((item, index) => <NewsCard key={item.id} item={item} variant={index === 0 ? "feature" : "standard"} saved={isSavedStory(item, saved)} onSave={() => toggleSaved(item.id)} onOpen={() => markAsRead(item)} />)}
        </div>
      </section>

      <section className="split-news">
        <div className="news-section">
          <SectionHeading kicker="Your information" title="Breaches & Incidents" />
          <div className="stacked-news">
            {breaches.map((item) => <NewsCard key={item.id} item={item} variant="compact" saved={isSavedStory(item, saved)} onSave={() => toggleSaved(item.id)} onOpen={() => markAsRead(item)} />)}
          </div>
        </div>
        <div className="news-section">
          <SectionHeading kicker="The future" title="AI & Emerging Technology" />
          <div className="stacked-news">
            {aiTech.map((item) => <NewsCard key={item.id} item={item} variant="compact" saved={isSavedStory(item, saved)} onSave={() => toggleSaved(item.id)} onOpen={() => markAsRead(item)} />)}
          </div>
        </div>
      </section>

      <section className="news-section">
        <SectionHeading kicker="Across the internet" title="Global Intelligence" />
        <div className="four-card-grid">
          {globalIntel.map((item, index) => <NewsCard key={item.id} item={item} variant={index === 0 ? "feature" : "standard"} saved={isSavedStory(item, saved)} onSave={() => toggleSaved(item.id)} onOpen={() => markAsRead(item)} />)}
        </div>
      </section>

      <section className="split-news">
        <div className="news-section">
          <SectionHeading kicker="National" title="India Intelligence" />
          <div className="stacked-news">
            {india.map((item) => <NewsCard key={item.id} item={item} variant="compact" saved={isSavedStory(item, saved)} onSave={() => toggleSaved(item.id)} onOpen={() => markAsRead(item)} />)}
          </div>
        </div>
        <div className="news-section">
          <SectionHeading kicker="Business" title="Enterprise & Industry" />
          <div className="stacked-news">
            {enterprise.map((item) => <NewsCard key={item.id} item={item} variant="compact" saved={isSavedStory(item, saved)} onSave={() => toggleSaved(item.id)} onOpen={() => markAsRead(item)} />)}
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
          {visibleDomains.map((domain, index) => <button key={domain} onClick={() => handleDomainChange(domain)}><b>{String(index + 1).padStart(2, "0")}</b><span>{domain}</span><em>{domainCount(domain)} stories</em></button>)}
        </div>
      </section>
      </>}

      <section className="standards-section" id="standards">
        <div><span>OUR PROMISE</span><h2>Trust is the story.</h2></div>
        <p>Cyber Chronicle separates confirmed facts from developing reports, shows the evidence behind every article, and never assigns risk or severity without source support.</p>
        <div className="standards-list"><span><Check size={16} />Original explanations</span><span><Check size={16} />Transparent sources</span><span><Check size={16} />No invented facts</span><span><Check size={16} />Plain-language reporting</span></div>
        <div className="creator-signature">
          <span>BUILT BY</span>
          <div><strong>{PROJECT.creator.name}</strong><small>{PROJECT.creator.role} · {PROJECT.name}</small></div>
          <nav className="creator-links" aria-label="Creator profiles">
            {CREATOR_LINKS.map((link) => <a key={link.key} href={link.href} target="_blank" rel="noopener noreferrer">{link.label}<ExternalLink size={11} aria-hidden="true" /></a>)}
          </nav>
        </div>
      </section>
    </main>
  );
}
