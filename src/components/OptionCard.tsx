"use client";

import type { ReactNode } from "react";
import { Check } from "./icons";

interface OptionCardProps {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Centered, title-only variant for grids of short choices (e.g. days per week). */
  compact?: boolean;
}

/** A single choice in a role="radiogroup". Selected = accent ring + glow. */
export function OptionCard({ selected, onSelect, title, description, icon, compact }: OptionCardProps) {
  const state = selected ? "glow-selected border-transparent bg-raised" : "border-line bg-surface hover:border-muted/40";

  if (compact) {
    return (
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className={`flex min-h-16 flex-col items-center justify-center rounded-card border transition-[background-color,border-color,box-shadow] duration-150 ${state}`}
      >
        <span className={`font-display text-3xl tracking-wide ${selected ? "text-power" : "text-fg"}`}>{title}</span>
        {description && <span className="text-xs text-muted">{description}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex min-h-16 w-full items-center gap-4 rounded-card border px-4 py-3.5 text-left transition-[background-color,border-color,box-shadow] duration-150 ${state}`}
    >
      {icon && <span className="shrink-0 text-muted">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-fg">{title}</span>
        {description && <span className="mt-0.5 block text-sm leading-snug text-muted">{description}</span>}
      </span>
      <span
        aria-hidden
        className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          selected ? "border-accent bg-accent text-bg" : "border-line"
        }`}
      >
        {selected && <Check className="size-3.5" />}
      </span>
    </button>
  );
}

export function OptionGroup({ label, children, grid }: { label: string; children: ReactNode; grid?: boolean }) {
  return (
    <div role="radiogroup" aria-label={label} className={grid ? "grid grid-cols-3 gap-3" : "flex flex-col gap-3"}>
      {children}
    </div>
  );
}
