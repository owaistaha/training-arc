// Display strings shared across screens.
import type { Split } from "./archetypes";
import type { Direction } from "./planSchema";

export const SPLIT_LABEL: Record<Split, string> = {
  "push-pull-legs": "Push · Pull · Legs",
  "upper-lower": "Upper · Lower",
  "full-body": "Full body",
  "full-body-plus-conditioning": "Full body + conditioning",
};

export const DIRECTION_LABEL: Record<Direction, string> = {
  cut: "Cut",
  bulk: "Bulk",
  lean_bulk: "Lean bulk",
  recomp: "Recomp",
};

export const DIRECTION_DETAIL: Record<Direction, string> = {
  cut: "20% under maintenance",
  bulk: "10% over maintenance",
  lean_bulk: "5% over maintenance",
  recomp: "At maintenance",
};

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight range";
  if (bmi < 25) return "Healthy range";
  if (bmi < 30) return "Overweight range";
  return "Obese range";
}

export function formatRest(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}:${String(s).padStart(2, "0")}` : `${m} min`;
}

/** Rough session length: ~40 s per working set plus prescribed rest, rounded to 5 min. */
export function estimateMinutes(exercises: { sets: number; restSec: number }[]): number {
  const sec = exercises.reduce((t, e) => t + e.sets * (40 + e.restSec), 0);
  return Math.max(10, Math.round(sec / 60 / 5) * 5);
}
