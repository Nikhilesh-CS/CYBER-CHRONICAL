"use client";
import { useState } from "react";
import { glossaryEntryId, JARGON_DICTIONARY, lessonForJargon } from "../../../lib/jargon";
import { SITE_BASE_PATH } from "../../../lib/story-links";

export function JargonHighlighter({ text }: { text: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const terms = JARGON_DICTIONARY.filter((entry) => entry.matches.test(text));
  if (!terms.length) return <>{text}</>;
  const pattern = new RegExp(`(${terms.map((entry) => entry.matches.source).join("|")})`, "ig");
  return <>{text.split(pattern).map((part, index) => {
    const entry = terms.find((candidate) => candidate.matches.test(part));
    if (!entry) return <span key={index}>{part}</span>;
    const lesson = lessonForJargon(entry.term);
    return <span className="jargon-inline" key={index}>
      <button onClick={() => setOpen(open === index ? null : index)} aria-expanded={open === index} aria-label={`Explain ${entry.term}`}>{part}</button>
      {open === index && <span className="jargon-tooltip">
        <strong>{entry.term}</strong><span>{entry.simple}</span>
        <a href={`${SITE_BASE_PATH}/?view=settings&settings=glossary#${glossaryEntryId(entry.term)}`}>Glossary entry</a>
        {lesson && <a href={`${SITE_BASE_PATH}/?view=learn&lesson=${lesson}`}>Academy lesson</a>}
      </span>}
    </span>;
  })}</>;
}
