"use client";

import { useState } from "react";
import { ARCHETYPE_ART, type Archetype } from "@/lib/archetypes";
import { Silhouette } from "./Silhouette";

interface ArchetypeArtProps {
  archetype: Archetype;
  /** Classes for the <img> (and the silhouette fallback unless `fallbackClassName` is given). */
  className?: string;
  fallbackClassName?: string;
  /** Only the first visible image should be eager. */
  eager?: boolean;
  /** Decorative use (e.g. the landing strip): empty alt, hidden from assistive tech. */
  decorative?: boolean;
}

/**
 * Original archetype art (public/archetypes/<id>.webp, 768×1024) as a plain
 * <img> with width/height set (no layout shift). Only archetypes listed in
 * src/data/archetype-art.json request an image, so nothing 404s; if there's
 * no art or the image fails to load, the SVG silhouette shows instead.
 */
export function ArchetypeArt({ archetype: a, className = "", fallbackClassName, eager = false, decorative = false }: ArchetypeArtProps) {
  const art = ARCHETYPE_ART[a.id];
  const [failed, setFailed] = useState(false);

  if (!art || failed) {
    return <Silhouette archetype={a.id} className={fallbackClassName ?? className} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- plain <img> on purpose: pre-sized WebP, no optimizer
    <img
      src={art.src}
      alt={decorative ? "" : a.artAlt}
      aria-hidden={decorative || undefined}
      width={art.width}
      height={art.height}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
