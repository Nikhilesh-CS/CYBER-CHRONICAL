"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { motion } from "motion/react";
import type { CSSProperties } from "react";
import * as React from "react";
import type { RealIntelligenceItem } from "../../../lib/news";
import { plainTitle, computeDomain, computeIntelligenceType, DOMAIN_COLORS } from "../../../lib/editorial";
import { beginnerExplanation } from "../../../lib/explanations";
import { StoryMeta } from "../shared/StoryMeta";
import { StoryImage, type ImageVariant } from "../shared/StoryImage";
import { SeverityGauge } from "../shared/SeverityGauge";

export type CardVariant = "lead" | "feature" | "standard" | "compact" | "alert" | "text-only";

export function NewsCard({
  item,
  variant,
  saved,
  onOpen,
  onSave,
}: {
  item: RealIntelligenceItem;
  variant?: CardVariant;
  saved: boolean;
  onOpen: () => void;
  onSave: () => void;
}) {
  const touchStart = React.useRef<number | null>(null);
  const domain = computeDomain(item);
  const intelType = computeIntelligenceType(item);

  let finalVariant: CardVariant = variant ?? "standard";

  if (!variant) {
    const isHighSeverity =
      item.metadata?.type === "cyber" &&
      (item.metadata.severity === "Critical" || item.metadata.severity === "High");
    const isOfficial = intelType === "Official Advisory";

    if (isOfficial || isHighSeverity) {
      finalVariant = "alert";
    } else if (!item.imageUrl) {
      finalVariant = "text-only";
    }
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.24 }}
      className={`news-card news-card-${finalVariant}${saved ? " story-saved" : ""}`}
      style={{ "--domain-color": DOMAIN_COLORS[domain] } as CSSProperties}
      onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => { if (touchStart.current !== null && event.changedTouches[0].clientX - touchStart.current > 90) onSave(); touchStart.current = null; }}
    >
      <button className="card-hitbox" onClick={onOpen} aria-label={`Read ${plainTitle(item)}`} />
      
      {finalVariant !== "text-only" && finalVariant !== "alert" && (
        <StoryImage 
          src={item.imageUrl} 
          alt={plainTitle(item)} 
          variant={finalVariant as ImageVariant}
          intelligenceType={intelType} 
          domain={domain} 
        />
      )}
      
      <div className="card-copy">
        <div className="card-kicker">
          <div className="category-chips">
            <span className="category-chip">[{intelType.toUpperCase()}]</span>
          </div>
          <button className="save-story" onClick={onSave} aria-label={saved ? "Remove saved story" : "Save story"}>
            {saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
          </button>
        </div>
        <h3>{plainTitle(item)}</h3>
        {finalVariant !== "compact" && finalVariant !== "alert" && <p>{beginnerExplanation(item)}</p>}
        {finalVariant === "alert" && <p className="alert-desc">{beginnerExplanation(item)}</p>}
        <StoryMeta item={item} />
        {item.metadata?.type === "cyber" && <SeverityGauge severity={item.metadata.severity} />}
      </div>
    </motion.article>
  );
}
