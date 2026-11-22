"use client";

import { ShieldCheck } from "lucide-react";
import type { RealIntelligenceItem } from "../../../lib/news";
import { relativeTime, readingTimeMinutes, verificationLabel } from "../../../lib/editorial";

export function StoryMeta({ item }: { item: RealIntelligenceItem }) {
  return (
    <div className="story-meta">
      <span>{item.primaryPublisher}</span>
      <time dateTime={item.publishedAt} suppressHydrationWarning>{relativeTime(item.publishedAt)}</time>
      <span className={`verification verification-${item.verificationStatus}`}><ShieldCheck size={13} aria-hidden="true" />{verificationLabel(item)}</span>
      <span>{readingTimeMinutes(item)} min read</span>
    </div>
  );
}
