import { Clock3, TriangleAlert } from "lucide-react";
import type { RealIntelligenceResponse } from "../../../lib/models";
import { formatDate } from "../../../lib/editorial";

export function EditionStatus({ edition, now, onOpenSources }: {
  edition: RealIntelligenceResponse;
  now: number;
  onOpenSources: () => void;
}) {
  const timestamp = edition.lastSuccessfulAt;
  const elapsed = timestamp ? Math.max(0, Math.floor((now - Date.parse(timestamp)) / 60_000)) : Number.NaN;
  const failed = edition.sources.filter((source) => source.status !== "current").length;
  const units = elapsed >= 1_440 ? [Math.floor(elapsed / 1_440), "day"] as const
    : elapsed >= 60 ? [Math.floor(elapsed / 60), "hour"] as const : [elapsed, "minute"] as const;
  const age = units[0] === 0 ? "just now" : `${units[0]} ${units[1]}${units[0] === 1 ? "" : "s"} ago`;
  return <div className="edition-health">
    <span><Clock3 size={14} aria-hidden="true" />{timestamp && Number.isFinite(elapsed)
      ? <><span>Updated {age}</span><time dateTime={timestamp}>{formatDate(timestamp, true)} IST</time></>
      : "Update time unavailable"}</span>
    {(failed > 0 || elapsed >= 1_440) && <button onClick={onOpenSources}>
      <TriangleAlert size={14} aria-hidden="true" />
      {failed > 0 ? `${failed} source${failed === 1 ? "" : "s"} unavailable` : "Edition is over 24 hours old"}
    </button>}
  </div>;
}
