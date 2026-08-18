"use client";

import { ArrowRight } from "lucide-react";

export function SectionHeading({ kicker, title, action, onAction }: {
  kicker?: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-heading">
      <div>{kicker && <span>{kicker}</span>}<h2>{title}</h2></div>
      {action && <button onClick={onAction}>{action}<ArrowRight size={15} /></button>}
    </div>
  );
}
