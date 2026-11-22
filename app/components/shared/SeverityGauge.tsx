"use client";

import { ShieldAlert } from "lucide-react";

export const SEVERITY_LEVELS = ["Critical", "High", "Medium", "Low", "Unknown"] as const;

export function SeverityGauge({ severity }: { severity?: string }) {
  const level = SEVERITY_LEVELS.find((value) => value === severity) ?? "Unknown";
  return <span className={`severity-gauge severity-${level.toLowerCase()}`}>
    <ShieldAlert size={13} aria-hidden="true" />{level === "Unknown" ? "Severity unknown" : `${level} severity`}
  </span>;
}
