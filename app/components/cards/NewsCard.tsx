"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import type { RealIntelligenceItem } from "../../../lib/news";
import { plainTitle, editorialCategory, categorySlug } from "../../../lib/editorial";
import { beginnerExplanation } from "../../../lib/explanations";
import { StoryMeta } from "../shared/StoryMeta";

export function NewsCard({
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
      <div className={`story-art art-${categorySlug(editorialCategory(item))}`}>
        <span>{editorialCategory(item)}</span>
        <b>CC</b>
      </div>
      <div className="card-copy">
        <div className="card-kicker">
          <div className="category-chips">
            {(item.categories || []).slice(0, 3).map(cat => (
              <span key={cat} className="category-chip">[{cat.charAt(0).toUpperCase() + cat.slice(1)}]</span>
            ))}
          </div>
          <button className="save-story" onClick={onSave} aria-label={saved ? "Remove saved story" : "Save story"}>{saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}</button>
        </div>
        <h3>{plainTitle(item)}</h3>
        {variant !== "compact" && <p>{beginnerExplanation(item)}</p>}
        <StoryMeta item={item} />
      </div>
    </article>
  );
}
