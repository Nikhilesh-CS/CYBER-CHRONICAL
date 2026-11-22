"use client";
import { SettingsHeader } from "../SettingsHeader";
import { useEffect } from "react";
import { glossaryEntryId, JARGON_DICTIONARY, lessonForJargon } from "../../../../lib/jargon";
import { SITE_BASE_PATH } from "../../../../lib/story-links";

export function GlossaryView({ onBack }: { onBack: () => void }) {
  useEffect(() => {
    const entry = document.getElementById(window.location.hash.slice(1));
    entry?.scrollIntoView({ block: "center" });
  }, []);
  return <div className="settings-page">
    <SettingsHeader title="Cyber Glossary" onBack={onBack} />
    <div className="settings-page-content glossary-grid">
      {JARGON_DICTIONARY.map((entry) => <article key={entry.term} id={glossaryEntryId(entry.term)}>
        <span>{entry.term}</span><p>{entry.simple}</p><small>Example: {entry.example}</small>
        <a href={`${SITE_BASE_PATH}/?view=learn&lesson=${lessonForJargon(entry.term)}`}>Related Academy lesson</a>
      </article>)}
    </div>
  </div>;
}
