import React from "react";
import { SettingsHeader } from "../SettingsHeader";
import { InfoBlock } from "../InfoBlock";

export function CreditsView({ onBack }: { onBack: () => void }) {
  return (
    <div className="settings-page">
      <SettingsHeader title="Attribution & Copyright" onBack={onBack} />
      <div className="settings-page-content">
        <InfoBlock>
          <p>Original reporting belongs to its publishers.</p>
          <p>Publisher names, trademarks and logos belong to their respective owners.</p>
          <p>Cyber Chronicle provides attribution and links to original evidence and source material.</p>
          <p>Vulnerability records use CERT-In, NVD, the CVE Program, CISA KEV and FIRST EPSS. Their names and data are credited at the point of use.</p>
          <p>Cyber Chronicle code is available under the <a href="https://github.com/Nikhilesh-CS/CYBER-CHRONICAL/blob/main/LICENSE">MIT license</a>.</p>
        </InfoBlock>
      </div>
    </div>
  );
}
