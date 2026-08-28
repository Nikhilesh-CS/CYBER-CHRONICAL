import React, { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { SettingsHeader } from "../SettingsHeader";
import { computeSourceGroup, type SourceGroup } from "../../../../lib/editorial";
import type { SourceResult } from "../../../../lib/news";
import { getSourceDefinitions } from "../../../../lib/sources";

export function SourcesView({ onBack, sources }: { onBack: () => void; sources: SourceResult[] }) {
  const knownSiteUrls = useMemo(() => new Map(
    getSourceDefinitions(new Date().getUTCFullYear()).map((source) => [source.id, source.siteUrl]),
  ), []);
  const groupedSources = useMemo(() => {
    const groups: Record<SourceGroup, SourceResult[]> = {
      "OFFICIAL / GOVERNMENT": [],
      "THREAT INTELLIGENCE & SECURITY RESEARCH": [],
      "CYBERSECURITY NEWS": [],
      "TECHNOLOGY & AI": [],
      "SCIENCE & SPACE": [],
      "WORLD / GENERAL NEWS": [],
    };
    for (const source of sources) {
      groups[computeSourceGroup(source)].push(source);
    }
    // sort alphabetically within groups
    for (const group of Object.keys(groups) as SourceGroup[]) {
      groups[group].sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
  }, [sources]);

  return (
    <div className="settings-page">
      <SettingsHeader title="Intelligence Sources" onBack={onBack} />
      <div className="settings-page-content">
        {(Object.keys(groupedSources) as SourceGroup[]).map((group) => {
          const groupSources = groupedSources[group];
          if (groupSources.length === 0) return null;
          return (
            <div key={group} className="settings-source-group">
              <h3>{group}</h3>
              <div>
                {groupSources.map((source) => {
                  const websiteUrl = source.siteUrl || knownSiteUrls.get(source.id);
                  return <div key={source.id} className="settings-source-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>{source.name}</strong>
                      {websiteUrl && <a href={websiteUrl} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${source.name} website`} style={{ color: "var(--brand)" }}>
                        <ExternalLink size={14} />
                      </a>}
                    </div>
                    <span>{source.authority}</span>
                    <div className="settings-source-meta">
                      <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Tier {source.trustTier}</span>
                      <span className={`settings-source-live ${source.status !== "current" ? "offline" : ""}`}>
                        <i /> {source.status === "current" ? "Current" : source.status === "stale" ? "Stale" : "Offline"}
                      </span>
                    </div>
                  </div>;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
