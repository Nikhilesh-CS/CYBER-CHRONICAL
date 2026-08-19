import React from "react";
import { SettingsHeader } from "../SettingsHeader";
import { InfoBlock } from "../InfoBlock";

export function CreatorView({ onBack }: { onBack: () => void }) {
  return (
    <div className="settings-page">
      <SettingsHeader title="Creator" onBack={onBack} />
      <div className="settings-page-content">
        <InfoBlock>
          <p><strong>Nikhilesh</strong></p>
          <p>Founder & Developer<br/>Cyber Chronicle</p>
        </InfoBlock>

        <InfoBlock>
          <p><strong>FOCUS</strong></p>
          <ul style={{ paddingLeft: "20px", marginTop: "8px", fontSize: "13px", color: "var(--ink-soft)" }}>
            <li>Cybersecurity</li>
            <li>Artificial Intelligence</li>
            <li>Threat Intelligence</li>
            <li>Software Development</li>
          </ul>
        </InfoBlock>

        <InfoBlock>
          <p>
            Cyber Chronicle was designed and developed by Nikhilesh as an independent technology project focused on making cybersecurity intelligence easier to access and understand.
          </p>
        </InfoBlock>
      </div>
    </div>
  );
}
