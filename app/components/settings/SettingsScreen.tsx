"use client";

import { Check, Download, ExternalLink, Moon, ShieldCheck, SlidersHorizontal, Sun, Wifi, WifiOff } from "lucide-react";
import type { RealIntelligenceResponse } from "../../../lib/models";
import type { SettingsPage } from "../../../lib/navigation";
import type { AppPreferences } from "../../../lib/preferences";
import { NotificationManager } from "../app-shell/NotificationManager";
import { SettingsRow } from "./SettingsRow";
import { AboutView } from "./views/AboutView";
import { CreatorView } from "./views/CreatorView";
import { OperatorView } from "./views/OperatorView";
import { StandardsView } from "./views/StandardsView";
import { SourcesView } from "./views/SourcesView";
import { PrivacyView } from "./views/PrivacyView";
import { DisclaimerView } from "./views/DisclaimerView";
import { CreditsView } from "./views/CreditsView";
import { PreferencesView } from "./views/PreferencesView";
import { GlossaryView } from "./views/GlossaryView";

type Props = {
  data: RealIntelligenceResponse;
  settingsPage: SettingsPage;
  preferences: AppPreferences;
  theme: "dark" | "light";
  toggleTheme: () => void;
  handleSettingsPageChange: (page: SettingsPage) => void;
  installPrompt: boolean;
  install: () => void;
  isOnline: boolean;
  updatePreferences: (preferences: AppPreferences) => void;
  requestLocation: () => void;
  locating: boolean;
  locationMessage: string | null;
  followedStateStoryCount: number;
  hasInterestProfile: boolean;
  resetInterestProfile: () => void;
  saved: string[];
  onImportSaved: (storyIds: string[]) => void;
};

export function SettingsScreen({
  data, settingsPage, preferences, theme, toggleTheme, handleSettingsPageChange,
  installPrompt, install, isOnline, updatePreferences, requestLocation,
  locating, locationMessage, followedStateStoryCount, hasInterestProfile, resetInterestProfile,
  saved, onImportSaved,
}: Props) {
  const currentSources = data.sources.filter((source) => source.status === "current").length;
  const settingsHub = (
    <div className="settings-view">
      <div className="settings-header">
        <h1>Settings</h1>
        <small>Customize your Cyber Chronicle experience</small>
      </div>

      <div className="settings-group">
        <strong>Appearance</strong>
        <SettingsRow
          icon={theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          title={theme === "light" ? "Dark mode" : "Light mode"}
          description={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          onClick={toggleTheme}
        />
      </div>

      <div className="settings-group">
        <strong>Notifications</strong>
        <NotificationManager preferences={preferences} />
      </div>

      <div className="settings-group">
        <strong>Intelligence & Data</strong>
        <SettingsRow icon={<SlidersHorizontal size={18} />} title="News & Personalization" description={preferences.followedState ? `${preferences.followedState} · ${preferences.enabledDomains.length} domains` : `${preferences.enabledDomains.length} domains · location off`} onClick={() => handleSettingsPageChange("preferences")} />
        <SettingsRow icon={<ShieldCheck size={18} />} title="Intelligence Sources" description={`${currentSources}/${data.sources.length} sources reporting`} onClick={() => handleSettingsPageChange("sources")} />
        <SettingsRow icon={<ShieldCheck size={18} />} title="Cyber Glossary" description="Plain-language security definitions" onClick={() => handleSettingsPageChange("glossary")} />
        <SettingsRow icon={<Check size={18} />} title="Editorial Standards" description="How we verify and classify" onClick={() => handleSettingsPageChange("standards")} />
        <SettingsRow icon={<ShieldCheck size={18} />} title="Privacy & Data" description="How notifications use your data" onClick={() => handleSettingsPageChange("privacy")} />
      </div>

      <div className="settings-group">
        <strong>About</strong>
        <SettingsRow icon={<ExternalLink size={18} />} title="About Cyber Chronicle" onClick={() => handleSettingsPageChange("about")} />
        <SettingsRow icon={<ExternalLink size={18} />} title="Creator" onClick={() => handleSettingsPageChange("creator")} />
        <SettingsRow icon={<ExternalLink size={18} />} title="Operator Information" onClick={() => handleSettingsPageChange("operator")} />
        <SettingsRow icon={<ExternalLink size={18} />} title="Disclaimer" onClick={() => handleSettingsPageChange("disclaimer")} />
        <SettingsRow icon={<ExternalLink size={18} />} title="Credits & Attribution" onClick={() => handleSettingsPageChange("credits")} />
      </div>

      <div className="settings-group">
        <strong>App</strong>
        {installPrompt && (
          <SettingsRow icon={<Download size={18} />} title="Install Cyber Chronicle" description="Add to your home screen for quick access" onClick={() => void install()} />
        )}
        <SettingsRow
          icon={isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
          title={isOnline ? "Online" : "Offline"}
          description={isOnline ? `${currentSources}/${data.sources.length} sources reporting` : "Reading cached edition"}
        />
      </div>
    </div>
  );

  return (() => {
    switch (settingsPage) {
      case "preferences": return <PreferencesView
        onBack={() => window.history.back()}
        preferences={preferences}
        onChange={updatePreferences}
        onRequestLocation={requestLocation}
        locating={locating}
        locationMessage={locationMessage}
        followedStateStoryCount={followedStateStoryCount}
        hasInterestProfile={hasInterestProfile}
        onResetInterest={resetInterestProfile}
        saved={saved}
        onImportSaved={onImportSaved}
      />;
      case "glossary": return <GlossaryView onBack={() => window.history.back()} />;
      case "about": return <AboutView onBack={() => window.history.back()} />;
      case "creator": return <CreatorView onBack={() => window.history.back()} />;
      case "operator": return <OperatorView onBack={() => window.history.back()} />;
      case "standards": return <StandardsView onBack={() => window.history.back()} />;
      case "sources": return <SourcesView onBack={() => window.history.back()} sources={data.sources} />;
      case "privacy": return <PrivacyView onBack={() => window.history.back()} />;
      case "disclaimer": return <DisclaimerView onBack={() => window.history.back()} />;
      case "credits": return <CreditsView onBack={() => window.history.back()} />;
      default: return settingsHub;
    }
  })();
}
