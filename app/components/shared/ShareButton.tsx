"use client";

import { Share2, Check, Link2 } from "lucide-react";
import { useState, useCallback } from "react";

export function ShareButton({
  title,
  text,
  url,
  variant = "icon",
}: {
  title: string;
  text: string;
  url?: string;
  variant?: "icon" | "button";
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const shareUrl = url ?? window.location.href;
    const shareData = { title: `Cyber Chronicle: ${title}`, text, url: shareUrl };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(`${title}\n${text}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  }, [title, text, url]);

  if (variant === "button") {
    return (
      <button className="share-button-full" onClick={handleShare}>
        {copied ? <Check size={16} /> : <Share2 size={16} />}
        {copied ? "Link copied" : "Share story"}
      </button>
    );
  }

  return (
    <button
      className="share-button-icon"
      onClick={handleShare}
      aria-label={copied ? "Link copied" : "Share this story"}
    >
      {copied ? <Check size={15} /> : <Link2 size={15} />}
    </button>
  );
}
