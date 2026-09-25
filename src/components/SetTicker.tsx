"use client";

import { Check } from "./icons";

interface SetTickerProps {
  exerciseName: string;
  sets: number;
  reps: string;
  done: boolean[];
  onToggle: (setIndex: number) => void;
}

/** One 48 px toggle per set. Checked sets use the electric-blue "selected" colour. */
export function SetTicker({ exerciseName, sets, reps, done, onToggle }: SetTickerProps) {
  const count = done.filter(Boolean).length;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">Sets</span>
        <span className="text-xs tabular-nums text-muted" aria-live="polite">
          {count}/{sets} done
        </span>
      </div>
      <div className="flex flex-wrap gap-2.5" role="group" aria-label={`${exerciseName} sets`}>
        {Array.from({ length: sets }, (_, i) => {
          const checked = !!done[i];
          return (
            <button
              key={i}
              type="button"
              aria-pressed={checked}
              aria-label={`Set ${i + 1} of ${sets}, ${reps}${checked ? ", done" : ""}`}
              onClick={() => onToggle(i)}
              className={`flex size-12 items-center justify-center rounded-full border-2 font-display text-xl transition-[background-color,border-color,transform] duration-150 active:scale-95 ${
                checked ? "border-electric bg-electric text-fg" : "border-line bg-raised text-fg hover:border-muted/60"
              }`}
            >
              {checked ? <Check className="size-5" /> : i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
