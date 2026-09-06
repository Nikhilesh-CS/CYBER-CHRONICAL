"use client";

import { LocateFixed, MapPin, RotateCcw } from "lucide-react";
import React, { useEffect, useState } from "react";
import { domains, type Domain } from "../../../../lib/editorial";
import { INDIA_STATE_NAMES } from "../../../../lib/geo/india-states";
import {
  type AppPreferences,
  type NotificationTypePreferences,
  type SeverityFloor,
} from "../../../../lib/preferences";
import { SettingsHeader } from "../SettingsHeader";

const notificationOptions: readonly [keyof NotificationTypePreferences, string][] = [
  ["criticalAlerts", "Critical alerts"],
  ["highSeverityAlerts", "High-severity alerts"],
  ["officialAdvisories", "Official advisories"],
  ["dataBreaches", "Data breaches"],
  ["threatIntelligence", "Threat intelligence"],
  ["aiTechUpdates", "AI and technology updates"],
  ["generalNews", "General news"],
];

export function PreferencesView({
  onBack,
  preferences,
  onChange,
  onRequestLocation,
  locating,
  locationMessage,
  followedStateStoryCount,
  hasInterestProfile,
  onResetInterest,
}: {
  onBack: () => void;
  preferences: AppPreferences;
  onChange: (preferences: AppPreferences) => void;
  onRequestLocation: () => void;
  locating: boolean;
  locationMessage: string | null;
  followedStateStoryCount: number;
  hasInterestProfile: boolean;
  onResetInterest: () => void;
}) {
  const [fontSize, setFontSize] = useState(() => typeof window === "undefined" ? "medium" : window.localStorage.getItem("cyber-chronicle-font-size") || "medium");
  useEffect(() => { document.documentElement.dataset.fontSize = fontSize; window.localStorage.setItem("cyber-chronicle-font-size", fontSize); }, [fontSize]);
  const toggleDomain = (domain: Domain) => {
    const enabled = preferences.enabledDomains.includes(domain);
    if (enabled && preferences.enabledDomains.length === 1) return;
    onChange({
      ...preferences,
      enabledDomains: enabled
        ? preferences.enabledDomains.filter((entry) => entry !== domain)
        : domains.filter((entry) => entry === domain || preferences.enabledDomains.includes(entry)),
    });
  };

  const setSeverityFloor = (severityFloor: SeverityFloor) => onChange({ ...preferences, severityFloor });
  const setFollowedState = (followedState: string | null) => onChange({ ...preferences, followedState });
  const setNotification = (key: keyof NotificationTypePreferences, value: boolean) => onChange({
    ...preferences,
    notifications: { ...preferences.notifications, [key]: value },
  });

  return (
    <div className="settings-page">
      <SettingsHeader title="News & Personalization" onBack={onBack} />
      <div className="settings-page-content preferences-page">
        <section className="preference-section">
          <div className="preference-heading"><MapPin size={18} /><div><strong>Your state</strong><small>Stored only as a state name on this device</small></div></div>
          <button className="location-button" onClick={onRequestLocation} disabled={locating}>
            <LocateFixed size={16} />{locating ? "Finding your state…" : "Use my current location"}
          </button>
          <label className="preference-field">
            <span>Followed state or union territory</span>
            <select value={preferences.followedState ?? ""} onChange={(event) => setFollowedState(event.target.value || null)}>
              <option value="">None</option>
              {INDIA_STATE_NAMES.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
          </label>
          {locationMessage && <p className="preference-message" role="status">{locationMessage}</p>}
          {preferences.followedState && (
            <div className={followedStateStoryCount > 0 ? "coverage-status coverage-live" : "coverage-status"}>
              <strong>{preferences.followedState}</strong>
              {followedStateStoryCount > 0
                ? <span>{followedStateStoryCount} regional {followedStateStoryCount === 1 ? "story" : "stories"} in this edition</span>
                : <span>Regional news coming soon. Your preference is saved and will activate automatically as coverage grows.</span>}
            </div>
          )}
        </section>

        <section className="preference-section"><div className="preference-heading"><div><strong>Reading size</strong><small>Adjust article text for comfortable reading</small></div></div><div className="segmented-preference" role="radiogroup" aria-label="Reading size">{["small", "medium", "large"].map((size) => <button key={size} role="radio" aria-checked={fontSize === size} className={fontSize === size ? "active" : ""} onClick={() => setFontSize(size)}>{size[0].toUpperCase() + size.slice(1)}</button>)}</div></section>
        <section className="preference-section"><label className="learning-toggle"><input type="checkbox" checked={preferences.learningMode} onChange={(event) => onChange({ ...preferences, learningMode: event.target.checked })} /><span><strong>Learning Mode</strong><small>Show plain-language definitions more prominently while reading</small></span></label></section>

        <section className="preference-section">
          <div className="preference-heading"><div><strong>Visible domains</strong><small>Choose what appears in navigation and your main feed</small></div></div>
          <div className="preference-grid">
            {domains.map((domain) => (
              <label key={domain}>
                <input type="checkbox" checked={preferences.enabledDomains.includes(domain)} onChange={() => toggleDomain(domain)} />
                <span>{domain}</span>
              </label>
            ))}
          </div>
          <small className="preference-help">At least one domain must remain enabled.</small>
        </section>

        <section className="preference-section">
          <div className="preference-heading"><div><strong>Severity floor</strong><small>Applied consistently to the main feed and local notifications</small></div></div>
          <div className="segmented-preference" role="radiogroup" aria-label="Minimum severity">
            {(["all", "high", "critical"] as SeverityFloor[]).map((floor) => (
              <button key={floor} role="radio" aria-checked={preferences.severityFloor === floor} className={preferences.severityFloor === floor ? "active" : ""} onClick={() => setSeverityFloor(floor)}>
                {floor === "all" ? "Everything" : floor === "high" ? "High + Critical" : "Critical only"}
              </button>
            ))}
          </div>
        </section>

        <section className="preference-section">
          <div className="preference-heading"><div><strong>Notification topics</strong><small>The same domain and severity choices above also apply to alerts</small></div></div>
          <div className="preference-grid">
            {notificationOptions.map(([key, label]) => (
              <label key={key}>
                <input type="checkbox" checked={preferences.notifications[key]} onChange={(event) => setNotification(key, event.target.checked)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="preference-section">
          <div className="preference-heading"><RotateCcw size={18} /><div><strong>Learned interests</strong><small>Reset the private on-device reading profile without deleting saved stories</small></div></div>
          <button className="reset-interest-button" onClick={onResetInterest} disabled={!hasInterestProfile}><RotateCcw size={15} />{hasInterestProfile ? "Reset learned interests" : "No learned interests yet"}</button>
        </section>
      </div>
    </div>
  );
}
