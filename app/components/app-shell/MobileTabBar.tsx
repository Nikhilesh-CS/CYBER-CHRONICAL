"use client";

import { Home, Bell, Activity, Bookmark, Settings, GraduationCap } from "lucide-react";
import { motion } from "motion/react";

export type MobileTab = "home" | "alerts" | "intelligence" | "saved" | "learn" | "settings";

export function MobileTabBar({
  active,
  onChange,
  alertCount = 0,
  savedCount = 0,
}: {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
  alertCount?: number;
  savedCount?: number;
}) {
  const tabs: { id: MobileTab; label: string; icon: typeof Home; badge?: number }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "alerts", label: "Alerts", icon: Bell, badge: alertCount },
    { id: "intelligence", label: "Intelligence", icon: Activity },
    { id: "saved", label: "Saved", icon: Bookmark, badge: savedCount },
    { id: "learn", label: "Learn", icon: GraduationCap },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="mobile-tab-bar" aria-label="App navigation">
      {tabs.map(({ id, label, icon: Icon, badge }) => (
        <button
          key={id}
          className={active === id ? "tab-active" : ""}
          onClick={() => onChange(id)}
          aria-label={label}
          aria-current={active === id ? "page" : undefined}
        >
          {active === id && <motion.i className="tab-motion-indicator" layoutId="mobile-tab-indicator" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
          <span className="tab-icon-wrap">
            <Icon size={20} strokeWidth={active === id ? 2.2 : 1.6} />
            {badge ? <b className="tab-badge">{badge > 99 ? "99+" : badge}</b> : null}
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
