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
import { readReaderBackup, STACK_PRODUCTS } from "../../../../lib/watchlist";
import { normalizeReadingSize, READING_SIZES } from "../../../../lib/storage";

const notificationOptions: readonly [keyof NotificationTypePreferences, string][] = [
  ["criticalAlerts", "Critical alerts"],
  ["highSeverityAlerts", "High-severity alerts"],
  ["officialAdvisories", "Official advisories"],
  ["dataBreaches", "Data breaches"],
  ["threatIntelligence", "Threat intelligence"],
  ["aiTechUpdates", "AI and technology updates"],
  ["generalNews", "General news"],
  ["watchlist", "My stack matches"],
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
  saved,
  onImportSaved,
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
  saved: string[];
  onImportSaved: (saved: string[]) => void;
}) {
  const [fontSize, setFontSize] = useState(() => normalizeReadingSize(typeof window === "undefined" ? undefined : window.localStorage.getItem("cyber-chronicle-font-size")));
  const [backupStatus, setBackupStatus] = useState("");
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

  const downloadBackup = () => {
    const content = JSON.stringify({ version: 1, saved, watchlist: preferences.watchlist }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "cyber-chronicle-backup.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 5_000);
  };

  async function importBackup(file: File) {
    try {
      if (file.size > 256_000) throw new Error("Choose a backup smaller than 256 KB.");
      const backup = readReaderBackup(JSON.parse(await file.text()));
      onImportSaved([...new Set([...saved, ...backup.saved])]);
      onChange({ ...preferences, watchlist: [...new Set([...preferences.watchlist, ...backup.watchlist])] });
      setBackupStatus("Saved stories and products added to this device.");
    } catch (error) {
      setBackupStatus(error instanceof SyntaxError ? "This file is not valid JSON." : error instanceof Error ? error.message : "Could not read this backup.");
    }
  }

  return (
    <div className="settings-page">
      <SettingsHeader title="News & Personalization" onBack={onBack} />
      <div className="settings-page-content preferences-page">
        <section className="preference-section">
          <h2>My stack</h2>
          <p>Choose products to highlight when an advisory lists them. Check your installed version before acting.</p>
          <div className="preference-grid">{STACK_PRODUCTS.map((product) => <label key={product}><input type="checkbox" checked={preferences.watchlist.includes(product)} onChange={(event) => onChange({
            ...preferences, watchlist: event.target.checked ? [...preferences.watchlist, product] : preferences.watchlist.filter((value) => value !== product),
          })} />{product}</label>)}</div>
        </section>
        <section className="preference-section">
          <h2>Display density</h2>
          <div className="edition-switch" role="group" aria-label="Display density">
            <button aria-pressed={preferences.density === "comfortable"} onClick={() => onChange({ ...preferences, density: "comfortable" })}>Comfortable</button>
            <button aria-pressed={preferences.density === "compact"} onClick={() => onChange({ ...preferences, density: "compact" })}>Compact</button>
          </div>
        </section>
        <section className="preference-section">
          <h2>Back up reading data</h2>
          <button className="text-button" onClick={downloadBackup}>Download backup</button>
          <label className="preference-field">Import saved stories and products<input type="file" accept=".json,application/json" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importBackup(file);
            event.target.value = "";
          }} /></label>
          {backupStatus && <p role="status">{backupStatus}</p>}
        </section>
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

        <section className="preference-section"><div className="preference-heading"><div><strong>Reading size</strong><small>Adjust article text for comfortable reading</small></div></div><div className="segmented-preference" role="radiogroup" aria-label="Reading size">{READING_SIZES.map((size) => <button key={size} role="radio" aria-checked={fontSize === size} className={fontSize === size ? "active" : ""} onClick={() => setFontSize(size)}>{size[0].toUpperCase() + size.slice(1)}</button>)}</div></section>
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
