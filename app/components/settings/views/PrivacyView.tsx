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
            Cyber Chronicle prioritizes your privacy. Notification functionality requires storing minimal data to ensure alerts reach your device according to your preferences.
          </p>
        </InfoBlock>

        <InfoBlock>
          <p><strong>Anonymous Firebase Identity</strong></p>
          <p style={{ color: "var(--ink-soft)" }}>Provides a secure, anonymous identifier to manage your device's preferences without requiring a personal account or email address.</p>
        </InfoBlock>

        <InfoBlock>
          <p><strong>FCM Token</strong></p>
          <p style={{ color: "var(--ink-soft)" }}>Used strictly to deliver Cyber Chronicle push notifications to your subscribed device. This token is securely stored and inaccessible to other users.</p>
        </InfoBlock>

        <InfoBlock>
          <p><strong>Notification Preferences</strong></p>
          <p style={{ color: "var(--ink-soft)" }}>Used to determine which intelligence alerts your device should receive. This ensures you only get notified about topics you care about.</p>
        </InfoBlock>
      </div>
    </div>
  );
}
