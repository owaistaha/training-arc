"use client";

import type { Archetype } from "@/lib/archetypes";
import { DIRECTION_LABEL, SPLIT_LABEL } from "@/lib/labels";
import { Check } from "./icons";
import { ArchetypeArt } from "./ArchetypeArt";
import { Chip } from "./ui";

interface ArchetypeCardProps {
  archetype: Archetype;
  index: number;
  selected: boolean;
  onSelect: () => void;
  /** e.g. "Built for the gym. At home we'll adapt it." */
  note?: string;
}

/**
 * 3:4 portrait art at full card width (~300×400 at 375 px) with the name and
 * tagline overlaid on a dark gradient.
 */
export function ArchetypeCard({ archetype: a, index, selected, onSelect, note }: ArchetypeCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${a.name}: ${a.tagline}`}
      onClick={onSelect}
      data-archetype={a.id}
      className={`relative flex w-[80vw] max-w-[300px] shrink-0 snap-center flex-col lg:w-full overflow-hidden rounded-card border text-left transition-[border-color,box-shadow] duration-200 ${
        selected ? "glow-selected border-transparent" : "border-line"
      }`}
    >
      <div className="relative aspect-[3/4] w-full bg-[radial-gradient(circle_at_50%_38%,var(--color-raised),var(--color-bg)_72%)]">
        <ArchetypeArt
          archetype={a}
          eager={index === 0}
          className="absolute inset-0 h-full w-full object-cover"
          fallbackClassName="absolute inset-x-0 top-2 h-[82%] w-full"
        />

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

        {/* Name + tagline overlaid on a dark gradient at the bottom of the art. */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg from-35% via-bg/85 to-transparent px-4 pb-3.5 pt-16">
          <h2 className={`font-display text-[2.25rem] leading-none tracking-wide ${selected ? "text-power" : "text-fg"}`}>
            {a.name}
          </h2>
          <p className="mt-1 text-sm font-medium text-fg">{a.tagline}</p>
          {note && <p className="mt-1 text-xs leading-snug text-gold">{note}</p>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 border-t border-line bg-surface px-4 py-3">
        <p className="min-h-10 text-sm leading-5 text-muted">{a.look}</p>
        <div className="flex flex-nowrap gap-1">
          <Chip small>{SPLIT_LABEL[a.split]}</Chip>
          <Chip small>{a.repRange} reps</Chip>
          <Chip small>{DIRECTION_LABEL[a.defaultDirection]}</Chip>
        </div>
      </div>
    </button>
  );
}
