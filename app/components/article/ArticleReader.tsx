"use client";

import {
  ArrowRight, Bookmark, BookmarkCheck, Check, Clock3,
  ExternalLink, X,
} from "lucide-react";
import type { RealIntelligenceItem } from "../../../lib/news";
import {
  formatDate, plainTitle, practicalActions,
  readerGuidance, simpleSummary, verificationLabel, whyItMatters,
  computeIntelligenceType
} from "../../../lib/editorial";
import { beginnerExplanation } from "../../../lib/explanations";
import { jargonFor } from "../../../lib/jargon";
import { StoryMeta } from "../shared/StoryMeta";
import { ShareButton } from "../shared/ShareButton";

export function ArticleReader({ item, saved, onSave, onClose }: {
  item: RealIntelligenceItem;
  saved: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const guidance = readerGuidance(item);
  const jargon = jargonFor(item);
  const title = plainTitle(item);
  const explanation = beginnerExplanation(item);

  return (
    <div className="article-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <article className="article-reader" role="dialog" aria-modal="true" aria-labelledby="article-title">
        <div className="article-toolbar">
          <button onClick={onClose}><X size={20} />Close</button>
          <span>CYBER CHRONICLE</span>
          <div className="toolbar-actions">
            <ShareButton title={title} text={explanation} variant="icon" />
            <button onClick={onSave}>{saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}{saved ? "Saved" : "Save"}</button>
          </div>
        </div>
        <div className="article-body">
          <header className="article-header">
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={title}
                className="article-hero-image news-image"
                loading="eager"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
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
            <p>{explanation}</p>
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
          </section>

          <div className="article-share-cta">
            <ShareButton title={title} text={explanation} variant="button" />
          </div>

          <div className="article-end"><span>CC</span><p>Cyber Chronicle — Trusted Cybersecurity News. Simplified.</p></div>
        </div>
      </article>
    </div>
  );
}
