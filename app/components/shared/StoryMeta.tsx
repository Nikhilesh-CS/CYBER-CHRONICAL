"use client";

import { ShieldCheck } from "lucide-react";
import type { RealIntelligenceItem } from "../../../lib/news";
import { relativeTime, verificationLabel } from "../../../lib/editorial";

export function StoryMeta({ item }: { item: RealIntelligenceItem }) {
  return (
    <div className="story-meta">
      <span className={`verification verification-${item.verificationStatus}`}><ShieldCheck size={13} />{verificationLabel(item)}</span>
      <span>{relativeTime(item.publishedAt)}</span>
      <span>{item.primaryPublisher}</span>
    </div>
  );
}
