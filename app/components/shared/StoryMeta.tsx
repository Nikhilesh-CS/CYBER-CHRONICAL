"use client";

import { ShieldCheck } from "lucide-react";
import type { RealIntelligenceItem } from "../../../lib/news";
import { relativeTime, readingTimeMinutes } from "../../../lib/editorial";

export function StoryMeta({ item }: { item: RealIntelligenceItem }) {
  const confidenceStr = item.confidence ? `${item.confidence.toUpperCase()} CONFIDENCE` : "UNKNOWN CONFIDENCE";
  const sourceStr = item.independentSourceCount > 1 ? `${item.independentSourceCount} SOURCES` : "1 SOURCE";

  return (
    <div className="story-meta">
      <span className={`verification verification-${item.verificationStatus}`}><ShieldCheck size={13} />{confidenceStr} · {sourceStr}</span>
      <span>{relativeTime(item.publishedAt)}</span>
      <span>{item.primaryPublisher}</span>
      <span>{readingTimeMinutes(item)} min read</span>
    </div>
  );
}
