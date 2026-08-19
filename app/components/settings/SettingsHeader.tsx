import { ArrowLeft } from "lucide-react";

interface SettingsHeaderProps {
  title: string;
  onBack: () => void;
}

export function SettingsHeader({ title, onBack }: SettingsHeaderProps) {
  return (
    <div className="settings-nav-header">
      <button onClick={onBack} aria-label="Go back">
        <ArrowLeft size={16} /> Back
      </button>
      <h1>{title}</h1>
    </div>
  );
}
