"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import type { RealIntelligenceItem } from "../../../lib/news";
import { plainTitle, categorySlug, computeDomain, computeIntelligenceType } from "../../../lib/editorial";
import { beginnerExplanation } from "../../../lib/explanations";
import { StoryMeta } from "../shared/StoryMeta";
import { StoryImage } from "../shared/StoryImage";

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
    <article className={`news-card news-card-${finalVariant}`}>
      <button className="card-hitbox" onClick={onOpen} aria-label={`Read ${plainTitle(item)}`} />
      
      {finalVariant !== "text-only" && finalVariant !== "alert" && (
        <StoryImage 
          src={item.imageUrl} 
          alt={plainTitle(item)} 
          variant={finalVariant as any} 
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
      </div>
    </article>
  );
}
