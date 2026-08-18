"use client";

import { useCallback, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 80;

export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const scrollContainer = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollContainer.current && scrollContainer.current.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling || refreshing) return;
    const diff = Math.max(0, e.touches[0].clientY - startY.current);
    setPullDistance(Math.min(diff * 0.5, 120));
  }, [pulling, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPulling(false);
    setPullDistance(0);
  }, [pulling, pullDistance, refreshing, onRefresh]);

  return (
    <div
      ref={scrollContainer}
      className="pull-to-refresh-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`pull-indicator ${pullDistance >= THRESHOLD ? "pull-ready" : ""} ${refreshing ? "pull-refreshing" : ""}`}
        style={{ height: pullDistance > 0 || refreshing ? `${Math.max(pullDistance, refreshing ? 50 : 0)}px` : "0" }}
      >
        <RefreshCw
          size={20}
          className={refreshing ? "spin" : ""}
          style={{ transform: `rotate(${pullDistance * 2}deg)`, opacity: Math.min(pullDistance / THRESHOLD, 1) }}
        />
        <span>{refreshing ? "Updating…" : pullDistance >= THRESHOLD ? "Release to refresh" : "Pull to refresh"}</span>
      </div>
      {children}
    </div>
  );
}
