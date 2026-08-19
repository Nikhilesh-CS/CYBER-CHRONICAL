import React from "react";

interface InfoBlockProps {
  children: React.ReactNode;
  className?: string;
}

export function InfoBlock({ children, className = "" }: InfoBlockProps) {
  return (
    <div className={`settings-info-block ${className}`}>
      {children}
    </div>
  );
}
