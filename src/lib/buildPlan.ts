import "server-only";
// Orchestrates the /api/plan pipeline. Shared by the route and scripts/probe-plan.ts
// so the probe exercises exactly the production code path.
import { EXERCISES_BY_ID, selectCandidates } from "./candidates";
import { generateAiPlan, type AiResult } from "./gemini";
import type { ExerciseInfo, FallbackReason, Plan, PlanResponse, Profile } from "./planSchema";
import { computeStats } from "./stats";
import { buildTemplatePlan } from "./templatePlan";

export interface BuildPlanResult {
  response: PlanResponse;
  ai: AiResult | null;
  candidateCount: number;
}

export async function buildPlan(
  profile: Profile,
  opts: { skipAiReason?: FallbackReason } = {},
): Promise<BuildPlanResult> {
  const stats = computeStats(profile);
  const candidates = selectCandidates(profile);

  let ai: AiResult | null = null;
  if (!opts.skipAiReason) {
    try {
      ai = await generateAiPlan(profile, stats, candidates);
    } catch {
      ai = null; // generateAiPlan shouldn't throw, but never let it break the response
    }
    if (ai?.ok) {
      return {
        response: { source: "ai", stats, plan: ai.plan, exercises: exerciseInfo(ai.plan) },
        ai,
        candidateCount: candidates.length,
      };
    }
  }

  const fallbackReason: FallbackReason = opts.skipAiReason ?? (ai && !ai.ok ? ai.reason : "upstream_error");
  const plan = buildTemplatePlan(profile, candidates);
  return {
    response: { source: "template", stats, plan, exercises: exerciseInfo(plan), fallbackReason },
    ai,
    candidateCount: candidates.length,
  };
}

function exerciseInfo(plan: Plan): Record<string, ExerciseInfo> {
  const out: Record<string, ExerciseInfo> = {};
  for (const day of plan.days) {
    for (const { exerciseId } of day.exercises) {
      const e = EXERCISES_BY_ID.get(exerciseId);
      if (e && !out[exerciseId]) {
        out[exerciseId] = {
          name: e.name,
          target: e.target,
          equipment: e.equipment,
          secondary: e.secondary_muscles,
          steps: e.steps,
          gif: e.gif,
        };
      }
    }
  }
  return out;
}
