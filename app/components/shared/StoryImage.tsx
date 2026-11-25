"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { categorySlug } from "../../../lib/editorial";
import { reviewedHttpsUrl } from "../../../lib/urls";

export type ImageVariant = "lead" | "feature" | "standard" | "compact" | "alert";

export function StoryImage({
  src,
  alt,
  variant = "standard",
  intelligenceType,
  domain,
}: {
  src?: string | null;
  alt: string;
  variant?: ImageVariant;
  intelligenceType: string;
  domain: string;
}) {
  const [error, setError] = useState(false);

  let aspectClass = "aspect-16-9";
  if (variant === "feature") aspectClass = "aspect-3-2";
  if (variant === "compact") aspectClass = "aspect-4-3";

  const imageUrl = reviewedHttpsUrl(src)?.href;
  if (!imageUrl || error) {
    return (
      <div className={`news-image-wrap ${aspectClass} story-art art-${categorySlug(domain)}`}>
        <span>{intelligenceType.toUpperCase()}</span>
        <b>CC</b>
      </div>
    );
  }

  const loadingStr = variant === "lead" ? "eager" : "lazy";

  return (
    <div className={`news-image-wrap ${aspectClass}`}>
      <motion.img
        src={imageUrl}
        alt={alt}
        loading={loadingStr}
        initial={{ opacity: 0, scale: 1.01 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        onError={() => setError(true)}
      />
    </div>
  );
}
