import React from "react";
import { SettingsHeader } from "../SettingsHeader";
import { InfoBlock } from "../InfoBlock";

export function AboutView({ onBack }: { onBack: () => void }) {
  return (
    <div className="settings-page">
      <SettingsHeader title="About Cyber Chronicle" onBack={onBack} />
      <div className="settings-page-content">
        <InfoBlock>
          <p>
            <strong>Cyber Chronicle</strong> is an independent cybersecurity intelligence and technology news platform designed to collect, organize and simplify information from trusted public sources.
          </p>
          <p>
            It combines official advisories, cybersecurity research, threat intelligence and technology reporting into a structured intelligence feed.
          </p>
        </InfoBlock>
        
        <InfoBlock>
          <p><strong>MULTI-SOURCE INTELLIGENCE</strong></p>
          <pre style={{ fontSize: "11px", fontFamily: "inherit", opacity: 0.8 }}>
Official Advisories
        +
Threat Research
        +
Independent Reporting
        ↓
Cyber Chronicle
        ↓
Classification
Corroboration
Confidence
Severity
        ↓
Readable Intelligence
          </pre>
        </InfoBlock>
      </div>
    </div>
  );
}
