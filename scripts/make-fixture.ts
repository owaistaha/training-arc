/* Regenerates tests/fixtures/plan-warrior-4d.json: a fixed, valid /api/plan
 * response for the TECH_SPEC example profile, built from real dataset IDs
 * (the deterministic template split, labelled source "ai" so the UI shows the
 * normal AI path). The e2e tests serve this instead of calling Gemini.
 *
 *   npx tsx scripts/make-fixture.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { EXERCISES_BY_ID, selectCandidates } from "@/lib/candidates";
import { checkPlanRules, PlanResponseSchema, type ExerciseInfo, type PlanResponse, type Profile } from "@/lib/planSchema";
import { computeStats } from "@/lib/stats";
import { buildTemplatePlan } from "@/lib/templatePlan";

export const FIXTURE_PROFILE: Profile = {
  sex: "male",
  age: 24,
  heightCm: 178,
  weightKg: 72,
  targetWeightKg: 78,
  bodyShape: "slim",
  bodyType: "ectomorph",
  experience: "beginner",
  daysPerWeek: 4,
  equipment: "gym",
  archetype: "warrior",
};

const candidates = selectCandidates(FIXTURE_PROFILE);
const plan = buildTemplatePlan(FIXTURE_PROFILE, candidates);
const { errors } = checkPlanRules(plan, new Map(candidates.map((c) => [c.id, c.category])), FIXTURE_PROFILE.daysPerWeek);
if (errors.length) throw new Error(`Fixture plan invalid: ${errors.join("; ")}`);

const exercises: Record<string, ExerciseInfo> = {};
for (const day of plan.days) {
  for (const { exerciseId } of day.exercises) {
    const e = EXERCISES_BY_ID.get(exerciseId)!;
    exercises[exerciseId] = { name: e.name, target: e.target, equipment: e.equipment, secondary: e.secondary_muscles, steps: e.steps, gif: e.gif };
  }
}

const response: PlanResponse = { source: "ai", stats: computeStats(FIXTURE_PROFILE), plan, exercises };
PlanResponseSchema.parse(response);

const out = resolve(__dirname, "../tests/fixtures/plan-warrior-4d.json");
mkdirSync(resolve(out, ".."), { recursive: true });
writeFileSync(out, JSON.stringify(response, null, 2) + "\n");
console.log(`Wrote ${out}: ${plan.days.length} days, ${Object.keys(exercises).length} exercises`);
