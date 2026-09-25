// Deterministic stats. The LLM never does this maths.
import { getArchetype } from "./archetypes";
import type { Direction, Profile, Stats } from "./planSchema";

const round1 = (n: number) => Math.round(n * 10) / 10;

export function activityFactor(daysPerWeek: number): number {
  if (daysPerWeek <= 2) return 1.375;
  if (daysPerWeek <= 4) return 1.55;
  return 1.725;
}

export function weightDirection(weightKg: number, targetWeightKg: number): "cut" | "bulk" | "recomp" {
  if (targetWeightKg < weightKg - 2) return "cut";
  if (targetWeightKg > weightKg + 2) return "bulk";
  return "recomp";
}

const DIRECTION_FACTOR: Record<Direction, number> = {
  cut: 0.8,
  recomp: 1.0,
  lean_bulk: 1.05,
  bulk: 1.1,
};

export function computeStats(p: Profile): Stats {
  const m = p.heightCm / 100;
  const bmi = p.weightKg / (m * m);
  const targetBmi = p.targetWeightKg / (m * m);

  // Mifflin-St Jeor
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === "male" ? 5 : -161);
  const tdee = bmr * activityFactor(p.daysPerWeek);

  // Weight goal decides direction; the archetype default only applies when the goal is ~flat.
  const byWeight = weightDirection(p.weightKg, p.targetWeightKg);
  const direction: Direction =
    byWeight === "recomp" ? getArchetype(p.archetype).defaultDirection : byWeight;

  let calories = tdee * DIRECTION_FACTOR[direction];
  // Safety clamps: a cut never below 80% TDEE, a bulk never above 110%, never below BMR.
  calories = Math.min(Math.max(calories, tdee * 0.8), tdee * 1.1);
  calories = Math.max(calories, bmr);

  const warnings: string[] = [];
  if (targetBmi < 18.5) {
    warnings.push("Your target weight is in the underweight BMI range (below 18.5).");
  } else if (targetBmi > 30) {
    warnings.push("Your target weight is in the obese BMI range (above 30).");
  }

  return {
    bmi: round1(bmi),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories: Math.round(calories),
    proteinG: Math.round(1.8 * p.targetWeightKg),
    direction,
    targetBmi: round1(targetBmi),
    warnings,
  };
}
