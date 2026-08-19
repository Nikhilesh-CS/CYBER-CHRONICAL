import React from "react";
import { SettingsHeader } from "../SettingsHeader";
import { InfoBlock } from "../InfoBlock";

export function StandardsView({ onBack }: { onBack: () => void }) {
  return (
    <div className="settings-page">
      <SettingsHeader title="Editorial & Intelligence Standards" onBack={onBack} />
      <div className="settings-page-content">
        <InfoBlock>
          <p><strong>VERIFICATION</strong></p>
          <ul style={{ listStyle: "none", padding: 0, marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px", color: "var(--ink-soft)" }}>
            <li>
              <strong>OFFICIAL</strong><br/>
              Information originating from an authoritative first-party source.
            </li>
            <li>
              <strong>CORROBORATED</strong><br/>
              Supported by multiple independent sources.
            </li>
            <li>
              <strong>CONFIRMED</strong><br/>
              Evidence currently supports the central claim.
            </li>
            <li>
              <strong>DEVELOPING</strong><br/>
              Information is still evolving.
            </li>
          </ul>
        </InfoBlock>

        <InfoBlock>
          <p><strong>CONFIDENCE</strong></p>
          <ul style={{ listStyle: "none", padding: 0, marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px", color: "var(--ink-soft)" }}>
            <li>
              <strong>HIGH</strong><br/>
              Strong supporting evidence.
            </li>
            <li>
              <strong>MEDIUM</strong><br/>
              Reasonable evidence with remaining uncertainty.
            </li>
            <li>
              <strong>LOW</strong><br/>
              Limited or preliminary evidence.
            </li>
          </ul>
        </InfoBlock>

        <InfoBlock>
          <p><strong>INTELLIGENCE METADATA</strong></p>
          <ul style={{ listStyle: "none", padding: 0, marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px", color: "var(--ink-soft)" }}>
            <li><strong>Severity:</strong> Computed impact level of an incident or vulnerability.</li>
            <li><strong>Independent Sources:</strong> Number of distinct publishers reporting the same event.</li>
            <li><strong>Affected Products:</strong> Systems or software confirmed to be impacted.</li>
            <li><strong>Suggested Action:</strong> Remediations directly advised by the publisher.</li>
            <li><strong>Evidence:</strong> Raw links to original publisher reports.</li>
          </ul>
        </InfoBlock>
      </div>
    </div>
  );
}
