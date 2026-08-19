import React from "react";
import { SettingsHeader } from "../SettingsHeader";
import { InfoBlock } from "../InfoBlock";

export function OperatorView({ onBack }: { onBack: () => void }) {
  return (
    <div className="settings-page">
      <SettingsHeader title="Operator Information" onBack={onBack} />
      <div className="settings-page-content">
        <InfoBlock>
          <p><strong>Product</strong></p>
          <p>Cyber Chronicle</p>
        </InfoBlock>
        
        <InfoBlock>
          <p><strong>Type</strong></p>
          <p>Independent cybersecurity intelligence platform</p>
        </InfoBlock>

        <InfoBlock>
          <p><strong>Created & maintained by</strong></p>
          <p>Nikhilesh</p>
        </InfoBlock>

        <InfoBlock>
          <p><strong>Official distribution</strong></p>
          <p>Cyber Chronicle website/PWA</p>
        </InfoBlock>
      </div>
    </div>
  );
}
