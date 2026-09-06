"use client";
import { SettingsHeader } from "../SettingsHeader";
import { JARGON_DICTIONARY } from "../../../../lib/jargon";
export function GlossaryView({ onBack }: { onBack: () => void }) { return <div className="settings-page"><SettingsHeader title="Cyber Glossary" onBack={onBack} /><div className="settings-page-content glossary-grid">{JARGON_DICTIONARY.map((entry) => <article key={entry.term}><span>{entry.term}</span><p>{entry.simple}</p><small>Example: {entry.example}</small></article>)}</div></div> }
