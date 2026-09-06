"use client";

import {
  ArrowRight, Bookmark, BookmarkCheck, Check, Clock3,
  ExternalLink, Printer, Type, X, ZoomIn,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { RealIntelligenceItem } from "../../../lib/news";
import {
  formatDate, plainTitle, practicalActions,
  readerGuidance, simpleSummary, whyItMatters,
  computeIntelligenceType
} from "../../../lib/editorial";
import { beginnerExplanation } from "../../../lib/explanations";
import { jargonFor } from "../../../lib/jargon";
import { StoryMeta } from "../shared/StoryMeta";
import { ShareButton } from "../shared/ShareButton";
import { SourceComparison } from "./SourceComparison";
import { AffectedProducts } from "./AffectedProducts";
import { JargonHighlighter } from "./JargonHighlighter";

export function ArticleReader({ item, relatedItems, navigationItems, saved, onSave, onClose, onOpenRelated }: {
  item: RealIntelligenceItem;
  relatedItems: RealIntelligenceItem[];
  navigationItems: RealIntelligenceItem[];
  saved: boolean;
  onSave: () => void;
  onClose: () => void;
  onOpenRelated: (item: RealIntelligenceItem) => void;
}) {
  const [showComparison, setShowComparison] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showMiniHeader, setShowMiniHeader] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const swipeStart = useRef<number | null>(null);
  const readerRef = useRef<HTMLElement>(null);
  useEffect(() => { readerRef.current?.focus(); }, []);
  const guidance = readerGuidance(item);
  const jargon = jargonFor(item);
  const title = plainTitle(item);
  const explanation = beginnerExplanation(item);
  const cycleReadingSize = () => {
    const current = document.documentElement.dataset.fontSize || "medium";
    const next = current === "small" ? "medium" : current === "medium" ? "large" : "small";
    document.documentElement.dataset.fontSize = next;
    window.localStorage.setItem("cyber-chronicle-font-size", next);
  };
  const haptic = () => navigator.vibrate?.(12);
  const currentIndex = navigationItems.findIndex((candidate) => candidate.id === item.id);
  const navigateBy = (offset: number) => {
    const next = navigationItems[currentIndex + offset];
    if (next) onOpenRelated(next);
  };

  return (
    <motion.div className="article-overlay" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.article ref={readerRef} tabIndex={-1} className="article-reader" role="dialog" aria-modal="true" aria-labelledby="article-title" initial={{ x: 48 }} animate={{ x: 0 }} transition={{ type: "spring", stiffness: 340, damping: 34 }} onScroll={(event) => { const target = event.currentTarget; setProgress(target.scrollTop / Math.max(1, target.scrollHeight - target.clientHeight)); setShowMiniHeader(target.scrollTop > 360); }} onTouchStart={(event) => { swipeStart.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => { if (swipeStart.current === null) return; const distance = event.changedTouches[0].clientX - swipeStart.current; if (Math.abs(distance) > 85) navigateBy(distance < 0 ? 1 : -1); swipeStart.current = null; }}>
        <div className="article-toolbar">
          <button onClick={onClose}><X size={20} />Close</button>
          <span className={showMiniHeader ? "article-mini-title" : ""}>{showMiniHeader ? title : "CYBER CHRONICLE"}</span>
          {showMiniHeader && <button onClick={() => { haptic(); onSave(); }} aria-label={saved ? "Remove saved story" : "Save story"}>{saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}</button>}
        </div>
        <i className="reading-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
        <aside className="reader-action-rail" aria-label="Reader actions">
          <button onClick={() => { haptic(); onSave(); }} aria-label={saved ? "Remove saved story" : "Save story"}>{saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}<span>{saved ? "Saved" : "Save"}</span></button>
          <ShareButton title={title} text={explanation} variant="icon" />
          <button onClick={cycleReadingSize} aria-label="Change reading size"><Type size={18} /><span>Text</span></button>
          <button onClick={() => window.print()} aria-label="Print edition"><Printer size={18} /><span>Print</span></button>
        </aside>
        <div className="article-body">
          <header className="article-header">
            {item.imageUrl && (
              <motion.img
                src={item.imageUrl}
                alt={title}
                className="article-hero-image news-image article-image-openable"
                loading="eager"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
                onClick={() => setImageOpen(true)}
              />
            )}
            <span className="article-section">{computeIntelligenceType(item)}</span>
            <h1 id="article-title">{title}</h1>
            <p className="article-deck">{explanation}</p>
            <div className="article-byline"><div className="author-mark">CC</div><span><strong>Cyber Chronicle Newsroom</strong><small>Published {formatDate(item.publishedAt, true)} IST · Updated from live sources</small></span></div>
            <StoryMeta item={item} />
          </header>

          <section className="article-block quick-summary"><span>QUICK SUMMARY</span><p>{simpleSummary(item)}</p></section>

          <section className="article-block simple-words">
            <span>IN SIMPLE WORDS</span>
            <h2>Here&apos;s what this means</h2>
            <p><JargonHighlighter text={explanation} /></p>
            {jargon.length > 0 && (
              <div className="jargon-section">
                <div className="jargon-heading">
                  <strong>Jargon decoder</strong>
                  <small>Technical words from this headline, translated</small>
                </div>
                <div className="jargon-grid">
                  {jargon.map((entry) => (
                    <div className="jargon-card" key={entry.term}>
                      <h3>{entry.term}</h3>
                      <p>{entry.simple}</p>
                      <small><b>Example:</b> {entry.example}</small>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            <div className="intelligence-metadata-grid">
              <p><strong>Status:</strong> {item.storyState === "developing" ? "Developing" : "Confirmed"}</p>
              <p><strong>Confidence:</strong> {item.confidence || "Unknown"}</p>
              <p><strong>Independent sources:</strong> {item.independentSourceCount}</p>
              {item.metadata.type === "cyber" && item.metadata.severity && <p><strong>Severity:</strong> {item.metadata.severity}</p>}
              {item.metadata.type === "cyber" && item.metadata.identifier && <p><strong>Identifier:</strong> {item.metadata.identifier}</p>}
              {item.metadata.type === "cyber" && item.metadata.affected && <p><strong>Affected:</strong> {item.metadata.affected}</p>}
              {item.metadata.type === "cyber" && item.metadata.action && <p><strong>Recommended action:</strong> {item.metadata.action}</p>}
            </div>
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
            {item.evidence.length > 1 && <button className="primary-button" onClick={() => setShowComparison((value) => !value)}>{showComparison ? "Hide comparison" : "Compare sources"}</button>}
            {showComparison && <SourceComparison item={item} onClose={() => setShowComparison(false)} />}
          </section>

          {item.metadata.type === "cyber" && <AffectedProducts affected={item.metadata.affected} action={item.metadata.action} />}

          {relatedItems.length > 0 && (
            <section className="article-block related-coverage">
              <span>CONNECTED INTELLIGENCE</span>
              <h2>Related coverage</h2>
              <p>Semantically linked reports that add context, corroboration, or another angle.</p>
              <div className="related-story-graph">
                <div className="related-story-hub"><b>Current</b><small>{computeIntelligenceType(item)}</small></div>
                {relatedItems.map((related, index) => (
                  <motion.button
                    key={related.id}
                    className="related-story-node"
                    initial={{ opacity: 0, scale: 0.92 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onOpenRelated(related)}
                  >
                    <small>{computeIntelligenceType(related)}</small>
                    <strong>{plainTitle(related)}</strong>
                    <span>{related.primaryPublisher}<ArrowRight size={14} /></span>
                  </motion.button>
                ))}
              </div>
            </section>
          )}

          <div className="article-share-cta">
            <ShareButton title={title} text={explanation} variant="button" />
          </div>

          <div className="article-end"><span>CC</span><p>Cyber Chronicle — Trusted Cybersecurity News. Simplified.</p><a href={`https://github.com/Nikhilesh-CS/CYBER-CHRONICAL/issues/new?title=Outdated%20story%3A%20${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer">Report outdated story ↗</a></div>
        </div>
        {imageOpen && item.imageUrl && <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="Full-screen story image" onClick={() => setImageOpen(false)}><motion.img src={item.imageUrl} alt={title} /><button onClick={() => setImageOpen(false)} aria-label="Close image"><X size={22} /></button><span><ZoomIn size={15} />Tap anywhere to close</span></div>}
      </motion.article>
    </motion.div>
  );
}
