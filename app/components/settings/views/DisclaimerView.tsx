import React from "react";
import { SettingsHeader } from "../SettingsHeader";
import { InfoBlock } from "../InfoBlock";

export function DisclaimerView({ onBack }: { onBack: () => void }) {
  return (
    <div className="settings-page">
      <SettingsHeader title="Intelligence Disclaimer" onBack={onBack} />
      <div className="settings-page-content">
        <InfoBlock>
          <p>
            Cyber Chronicle provides cybersecurity and technology information for awareness, education and research. Intelligence assessments may change as new evidence becomes available.
          </p>
          <p>
            Severity, confidence and classification labels represent Cyber Chronicle&apos;s interpretation of available information and should not replace official guidance from vendors, CERTs, government authorities or qualified security professionals.
          </p>
        </InfoBlock>
        <InfoBlock>
          <p><strong>Publisher&apos;s reporting ≠ Cyber Chronicle assessment</strong></p>
          <p style={{ color: "var(--ink-soft)" }}>
            While we link directly to original publisher evidence, our confidence and severity scorings are computed independently by our intelligence engine based on corroboration and trust tiers.
          </p>
        </InfoBlock>
      </div>
    </div>
  );
}
