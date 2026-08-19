import { ChevronRight } from "lucide-react";
import React from "react";

interface SettingsRowProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  onClick?: () => void;
  rightElement?: React.ReactNode;
  className?: string;
}

export function SettingsRow({
  icon,
  title,
  description,
  onClick,
  rightElement = <ChevronRight size={16} />,
  className = "",
}: SettingsRowProps) {
  const isButton = !!onClick;
  
  const content = (
    <>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        {description && <small>{description}</small>}
      </div>
      {rightElement}
    </>
  );

  if (isButton) {
    return (
      <button className={`settings-row ${className}`} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <div className={`settings-row settings-info ${className}`}>
      {content}
    </div>
  );
}
