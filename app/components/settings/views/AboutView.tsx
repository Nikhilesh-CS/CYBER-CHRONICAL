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
          <div className="about-intelligence-flow" aria-label="How Cyber Chronicle turns sources into readable intelligence">
            <div className="about-flow-sources">
              <span>Official advisories</span>
              <span>Threat research</span>
              <span>Independent reporting</span>
            </div>
            <span className="about-flow-arrow" aria-hidden="true">↓</span>
            <strong>Cyber Chronicle</strong>
            <span className="about-flow-arrow" aria-hidden="true">↓</span>
            <div className="about-flow-process">
              <span>Classification</span>
              <span>Corroboration</span>
              <span>Confidence</span>
              <span>Severity</span>
            </div>
            <span className="about-flow-arrow" aria-hidden="true">↓</span>
            <strong className="about-flow-result">Readable intelligence</strong>
          </div>
        </InfoBlock>
      </div>
    </div>
  );
}
