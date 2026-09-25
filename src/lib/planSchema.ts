import { z } from "zod";
import { ARCHETYPE_IDS } from "./archetypes";

// ---------- Request (profile) ----------

export const ProfileSchema = z
  .object({
    sex: z.enum(["male", "female"]),
    age: z.number().int().min(18).max(90),
    heightCm: z.number().min(130).max(230),
    weightKg: z.number().min(35).max(250),
    targetWeightKg: z.number().min(35).max(250),
    bodyShape: z.enum(["slim", "average", "athletic", "heavy"]),
    bodyType: z.enum(["ectomorph", "mesomorph", "endomorph"]),
    experience: z.enum(["beginner", "intermediate", "advanced"]),
    daysPerWeek: z.number().int().min(2).max(6),
    equipment: z.enum(["gym", "home"]),
    archetype: z.enum(ARCHETYPE_IDS),
  })
  // Reject unknown keys so nothing extra (names, emails, free text) can ride along.
  .strict();

export type Profile = z.infer<typeof ProfileSchema>;

// ---------- Plan ----------

export const PlanExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.number().int().min(1).max(6),
  reps: z.string().min(1).max(20),
  restSec: z.number().int().min(20).max(300),
  note: z.string().max(160).optional(),
});

export const PlanDaySchema = z.object({
  name: z.string().min(1).max(40),
  focus: z.string().min(1).max(80),
  exercises: z.array(PlanExerciseSchema).min(4).max(7),
});

/** What we ask the model for (the title is set in code). */
export const AiPlanSchema = z.object({
  days: z.array(PlanDaySchema).min(1).max(7),
});

export const PlanSchema = AiPlanSchema.extend({
  title: z.string(),
});

export type PlanExercise = z.infer<typeof PlanExerciseSchema>;
export type PlanDay = z.infer<typeof PlanDaySchema>;
export type Plan = z.infer<typeof PlanSchema>;

export type Direction = "cut" | "bulk" | "lean_bulk" | "recomp";

export interface Stats {
  bmi: number;
  bmr: number;
  tdee: number;
  calories: number;
  proteinG: number;
  /** Effective direction used for calories (includes the archetype default when weight goal is ~flat). */
  direction: Direction;
  targetBmi: number;
  warnings: string[];
}

/** Display data for one exercise, shipped with the plan so the client never loads the full dataset. */
export const ExerciseInfoSchema = z.object({
  name: z.string(),
  target: z.string(),
  equipment: z.string(),
  secondary: z.array(z.string()),
  steps: z.array(z.string()),
  gif: z.string(),
});
export type ExerciseInfo = z.infer<typeof ExerciseInfoSchema>;

export interface PlanResponse {
  source: "ai" | "template";
  stats: Stats;
  plan: Plan;
  /** exerciseId -> display info, for every exercise used in the plan. */
  exercises: Record<string, ExerciseInfo>;
  /** Only present when source === "template". */
  fallbackReason?: FallbackReason;
}

export const PlanResponseSchema = z.object({
  source: z.enum(["ai", "template"]),
  stats: z.looseObject({ calories: z.number(), proteinG: z.number() }),
  plan: PlanSchema,
  exercises: z.record(z.string(), ExerciseInfoSchema),
  fallbackReason: z.string().optional(),
});

/** What lives in localStorage under ta.plan.v1. */
export const StoredPlanSchema = PlanResponseSchema.extend({
  createdAt: z.string(),
  /** Which profile this plan was generated for; a mismatch means regenerate. */
  profileKey: z.string(),
});
export type StoredPlan = z.infer<typeof StoredPlanSchema>;

/** Mid-onboarding: any subset of answers. */
export const DraftProfileSchema = ProfileSchema.partial();
export type DraftProfile = z.infer<typeof DraftProfileSchema>;
/** Onboarding finished, archetype maybe not picked yet. */
export const OnboardedProfileSchema = ProfileSchema.partial({ archetype: true });
export type OnboardedProfile = z.infer<typeof OnboardedProfileSchema>;

/** ta.log.v1 — { [isoDate]: { [dayIndex]: { [exerciseId]: boolean[] } } } */
export const LogSchema = z.record(z.string(), z.record(z.string(), z.record(z.string(), z.array(z.boolean()))));
export type WorkoutLog = z.infer<typeof LogSchema>;

export function profileKey(p: Profile): string {
  return (Object.keys(ProfileSchema.shape) as (keyof Profile)[]).map((k) => String(p[k])).join("|");
}

export type FallbackReason =
  | "rate_limited_upstream" // Gemini 429
  | "rate_limited_local" // our own per-IP guard
  | "timeout"
  | "invalid_output"
  | "upstream_error"
  | "not_configured";

// ---------- Business-rule validation (beyond shape) ----------

export const WEEKLY_REQUIRED_CATEGORIES = ["chest", "back", "upper legs", "waist"] as const;
const UPPER_BODY = new Set(["chest", "back", "shoulders"]);

/**
 * Returns a list of human-readable problems. Empty list = valid.
 * Every exerciseId must come from the candidate set: the model is never
 * allowed to invent an exercise.
 */
export function checkPlanRules(
  plan: { days: PlanDay[] },
  /** candidate id -> dataset category */
  candidates: ReadonlyMap<string, string>,
  daysPerWeek: number,
  opts: { fullBody?: boolean } = {},
): { errors: string[]; invalidIds: string[] } {
  const errors: string[] = [];
  const invalidIds: string[] = [];

  if (plan.days.length !== daysPerWeek) {
    errors.push(`Expected exactly ${daysPerWeek} days, got ${plan.days.length}.`);
  }
  plan.days.forEach((day, i) => {
    const seen = new Set<string>();
    if (day.exercises.length < 4 || day.exercises.length > 7) {
      errors.push(`Day ${i + 1} has ${day.exercises.length} exercises (need 4-7).`);
    }
    for (const ex of day.exercises) {
      if (!candidates.has(ex.exerciseId)) {
        invalidIds.push(ex.exerciseId);
        errors.push(`Day ${i + 1}: exerciseId "${ex.exerciseId}" is not in the candidate list.`);
      }
      if (seen.has(ex.exerciseId)) {
        errors.push(`Day ${i + 1}: exerciseId "${ex.exerciseId}" is used more than once.`);
      }
      seen.add(ex.exerciseId);
    }
  });

  // Balance: emphasis means more volume, not skipping whole muscle groups.
  const available = new Set(candidates.values());
  const weekCats = new Set(plan.days.flatMap((d) => d.exercises.map((e) => candidates.get(e.exerciseId))));
  for (const cat of WEEKLY_REQUIRED_CATEGORIES) {
    if (available.has(cat) && !weekCats.has(cat)) {
      errors.push(`The week has no "${cat}" exercise. Include at least one.`);
    }
  }
  if (opts.fullBody) {
    plan.days.forEach((day, i) => {
      const cats = new Set(day.exercises.map((e) => candidates.get(e.exerciseId)));
      if (!cats.has("upper legs")) errors.push(`Day ${i + 1} is full-body but has no "upper legs" exercise.`);
      if (![...cats].some((c) => c && UPPER_BODY.has(c))) {
        errors.push(`Day ${i + 1} is full-body but has no chest, back or shoulders exercise.`);
      }
    });
  }
  return { errors, invalidIds };
}
