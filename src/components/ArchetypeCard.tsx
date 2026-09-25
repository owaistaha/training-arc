"use client";

import type { Archetype } from "@/lib/archetypes";
import { DIRECTION_LABEL, SPLIT_LABEL } from "@/lib/labels";
import { Check } from "./icons";
import { Silhouette } from "./Silhouette";
import { Chip } from "./ui";

interface ArchetypeCardProps {
  archetype: Archetype;
  index: number;
  selected: boolean;
  onSelect: () => void;
  /** e.g. "Best with a gym — we'll adapt it for home". */
  note?: string;
}

export function ArchetypeCard({ archetype: a, index, selected, onSelect, note }: ArchetypeCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${a.name}: ${a.tagline}`}
      onClick={onSelect}
      data-archetype={a.id}
      className={`relative flex w-[80vw] max-w-[310px] shrink-0 snap-center flex-col overflow-hidden rounded-card border text-left transition-[border-color,box-shadow] duration-200 ${
        selected ? "glow-selected border-transparent" : "border-line"
      }`}
    >
      <div className="relative h-52 w-full bg-[radial-gradient(circle_at_50%_40%,var(--color-raised),var(--color-bg)_75%)]">
        <Silhouette archetype={a.id} className="absolute inset-0 h-full w-full" />
        <span className="absolute left-4 top-3 font-display text-xl tracking-widest text-muted">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          aria-hidden
          className={`absolute right-3 top-3 flex size-8 items-center justify-center rounded-full border-2 transition-colors ${
            selected ? "border-accent bg-accent text-bg" : "border-line bg-bg/60"
          }`}
        >
          {selected && <Check className="size-4" />}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 border-t border-line bg-surface p-4">
        <h2 className={`font-display text-[2rem] leading-none tracking-wide ${selected ? "text-power" : "text-fg"}`}>{a.name}</h2>
        <p className="text-sm font-medium text-fg">{a.tagline}</p>
        <p className="text-sm leading-snug text-muted">{a.look}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          <Chip>{SPLIT_LABEL[a.split]}</Chip>
          <Chip>{a.repRange} reps</Chip>
          <Chip>{DIRECTION_LABEL[a.defaultDirection]}</Chip>
        </div>
        {note && <p className="mt-1 text-xs leading-snug text-gold">{note}</p>}
      </div>
    </button>
  );
}
