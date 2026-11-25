"use client";
import { X } from "lucide-react";
import type { EvidenceLink } from "../../../lib/models";
export function SourceComparison({ evidenceLinks, onClose }: { evidenceLinks: EvidenceLink[]; onClose: () => void }) {
  return <div className="comparison-panel">
    <div className="comparison-heading">
      <div><span>SOURCE COMPARISON</span><h3>How the coverage differs</h3></div>
      <button onClick={onClose} aria-label="Close comparison"><X size={18} /></button>
    </div>
    <div className="comparison-grid">{evidenceLinks.map((evidence) => <article key={evidence.url}>
      <strong>{evidence.publisher}</strong><small>{evidence.category.replaceAll("-", " ")}</small>
      <p>{evidence.publisher} reported this event in its source coverage. Open the original report for the publisher&apos;s complete wording and context.</p>
      <a href={evidence.url} target="_blank" rel="noopener noreferrer">Read source ↗</a>
    </article>)}</div>
  </div>;
}
