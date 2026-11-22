import type { RealIntelligenceItem, SourceResult } from "../../../lib/models";
import { SEVERITY_LEVELS } from "../shared/SeverityGauge";

export const EMPTY_FILTERS = { severity: "", source: "", category: "", age: "", india: false };
export type FeedFilters = typeof EMPTY_FILTERS;

export function filterStory(item: RealIntelligenceItem, filters: FeedFilters, now: number) {
  const severity = item.metadata.type === "cyber" ? item.metadata.severity ?? "Unknown" : "";
  return (!filters.severity || severity === filters.severity)
    && (!filters.source || item.sourceId === filters.source || item.evidence.some((entry) => entry.sourceId === filters.source))
    && (!filters.category || item.categories.some((value) => value === filters.category))
    && (!filters.age || Date.parse(item.publishedAt) >= now - Number(filters.age) * 86_400_000)
    && (!filters.india || item.region === "india" || item.categories.includes("india"));
}

export function StoryFilters({ value, onChange, sources, categories, cyber }: {
  value: FeedFilters;
  onChange: (filters: FeedFilters) => void;
  sources: SourceResult[];
  categories: string[];
  cyber: boolean;
}) {
  return <details className="feed-filters">
    <summary>Filter stories</summary>
    <div>
      {cyber && <label>Severity<select value={value.severity} onChange={(event) => onChange({ ...value, severity: event.target.value })}>
        <option value="">Any</option>{SEVERITY_LEVELS.map((level) => <option key={level}>{level}</option>)}
      </select></label>}
      <label>Source<select value={value.source} onChange={(event) => onChange({ ...value, source: event.target.value })}>
        <option value="">Any</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
      </select></label>
      <label>Category<select value={value.category} onChange={(event) => onChange({ ...value, category: event.target.value })}>
        <option value="">Any</option>{categories.map((category) => <option key={category} value={category}>{category[0].toUpperCase() + category.slice(1)}</option>)}
      </select></label>
      <label>Published<select value={value.age} onChange={(event) => onChange({ ...value, age: event.target.value })}>
        <option value="">Any time</option><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option>
      </select></label>
      <label className="india-focus"><input type="checkbox" checked={value.india} onChange={(event) => onChange({ ...value, india: event.target.checked })} /> India focus</label>
      <button className="text-button" onClick={() => onChange(EMPTY_FILTERS)}>Reset filters</button>
    </div>
  </details>;
}
