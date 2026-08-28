import React from "react";
import { SettingsHeader } from "../SettingsHeader";
import { InfoBlock } from "../InfoBlock";

export function PrivacyView({ onBack }: { onBack: () => void }) {
  return (
    <div className="settings-page">
      <SettingsHeader title="Privacy & Data" onBack={onBack} />
      <div className="settings-page-content">
        <InfoBlock>
          <p>
            Cyber Chronicle stores news and notification preferences on this device. It does not create an account, upload a notification token, or maintain a subscriber database.
          </p>
        </InfoBlock>

        <InfoBlock>
          <p><strong>Local-only settings</strong></p>
          <p style={{ color: "var(--ink-soft)" }}>Your enabled domains, severity choice, followed state, notification topics, and the identifiers of stories already checked are kept in browser storage on this device.</p>
        </InfoBlock>

        <InfoBlock>
          <p><strong>Location stays private</strong></p>
          <p style={{ color: "var(--ink-soft)" }}>Location is requested only after you tap the opt-in button. Coordinates are resolved locally and immediately discarded; only the resulting state name is saved.</p>
        </InfoBlock>

        <InfoBlock>
          <p><strong>No notification server</strong></p>
          <p style={{ color: "var(--ink-soft)" }}>The installed app checks the published static edition and asks your device to display matching alerts. Background checks are best effort and controlled by your browser.</p>
        </InfoBlock>

        <InfoBlock>
          <p><strong>Notification Preferences</strong></p>
          <p style={{ color: "var(--ink-soft)" }}>Used locally to determine which intelligence alerts this device should display.</p>
        </InfoBlock>
      </div>
    </div>
  );
}
