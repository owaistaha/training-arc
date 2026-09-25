import "server-only";
// The ONLY module that talks to Gemini. Server-only: importing this from a
// client component fails the build, so GEMINI_API_KEY can't leak to the browser.
import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { bodyTypeTweak, getArchetype, planTitle } from "./archetypes";
import type { Candidate } from "./candidates";
import {
  AiPlanSchema,
  checkPlanRules,
  type FallbackReason,
  type Plan,
  type Profile,
  type Stats,
} from "./planSchema";

export const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const TOTAL_BUDGET_MS = 15_000; // spec: fall back to template after 15 s
const FIRST_ATTEMPT_MS = 9_000; // Gemini occasionally hangs; cut a stuck call early so a retry fits
const MIN_RETRY_BUDGET_MS = 3_000; // don't start a retry we can't finish

export interface AiAttempt {
  attempt: number;
  ok: boolean;
  latencyMs: number;
  failure?: "invalid_output" | "rate_limited_upstream" | "timeout" | "upstream_error";
  errors: string[];
  invalidIds: string[];
}

export type AiResult =
  | { ok: true; plan: Plan; attempts: AiAttempt[]; latencyMs: number; model: string }
  | { ok: false; reason: FallbackReason; attempts: AiAttempt[]; latencyMs: number; model: string };

let client: GoogleGenAI | null = null;
function getClient(apiKey: string) {
  // SDK default is 5 retries with backoff up to 60 s on 429 — that would blow the
  // 15 s budget. A 429 is an expected outcome: fail fast and use the template.
  client ??= new GoogleGenAI({ apiKey, httpOptions: { retryOptions: { attempts: 1 } } });
  return client;
}

function responseJsonSchema(candidateIds: string[], daysPerWeek: number) {
  return {
    type: "object",
    properties: {
      days: {
        type: "array",
        minItems: daysPerWeek,
        maxItems: daysPerWeek,
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Short day name, e.g. Push, Pull, Legs, Upper, Full Body A" },
            focus: { type: "string", description: "Muscles trained, comma-separated, max 6 words" },
            // No minItems/maxItems here: nesting item bounds inside the fixed-length
            // days array makes Gemini reject the schema (400 INVALID_ARGUMENT) at 5-6
            // days. The 4-7 rule is in the prompt and enforced by checkPlanRules + retry.
            exercises: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  // Constrained decoding: the model can only emit real candidate IDs.
                  exerciseId: { type: "string", enum: candidateIds },
                  sets: { type: "integer", minimum: 2, maximum: 5 },
                  reps: { type: "string", description: 'Rep range like "8-12", or time like "30-45 s"' },
                  restSec: { type: "integer", minimum: 30, maximum: 180 },
                  note: { type: "string", description: "Optional, max 12 words, main lifts only" },
                },
                required: ["exerciseId", "sets", "reps", "restSec"],
              },
            },
          },
          required: ["name", "focus", "exercises"],
        },
      },
    },
    required: ["days"],
  };
}

const SYSTEM_PROMPT = `You are an experienced strength coach. Build a one-week training plan.
Hard rules:
- Use ONLY exerciseId values from the CANDIDATES list. Never invent an exercise or an ID.
- Return exactly the requested number of days.
- Each day has 4 to 7 exercises. Never repeat an exercise within the same day.
- Follow the archetype's split. Emphasis means MORE volume for those areas, never skipping the rest.
- Across the week, include at least one exercise from each category: chest, back, upper legs, waist.
- If the split starts with "full-body", EVERY day includes at least one "upper legs" exercise AND at least one chest, back or shoulders exercise.
- Put the big compound lifts first in each day.
- Main lifts use the given rep range. Accessories may go up to ~4 reps higher. Core and cardio may use time, e.g. "30-45 s".
- Match exercise difficulty to the experience level.
- Keep day names short and notes to one short sentence (or omit them).
Respond with JSON only.`;

export function buildUserPrompt(profile: Profile, stats: Stats, candidates: Candidate[]): string {
  const arch = getArchetype(profile.archetype);
  const tweak = bodyTypeTweak(arch, profile.bodyType);
  // Only plan inputs are sent — no name, email, age, or body measurements.
  const input = {
    archetype: { name: arch.name, split: arch.split, emphasis: arch.emphasis, look: arch.look },
    daysPerWeek: profile.daysPerWeek,
    experience: profile.experience,
    equipment: arch.equipment === "bodyweight" ? "bodyweight only" : profile.equipment,
    goal: stats.direction,
    mainLiftRepRange: tweak.repRange,
    conditioning: tweak.cardio,
  };
  const list = candidates.map(({ id, name, category, target, equipment }) => ({ id, name, category, target, equipment }));
  return `PLAN INPUT:\n${JSON.stringify(input)}\n\nCANDIDATES:\n${JSON.stringify(list)}`;
}

/** The exact generateContent params (minus abort signal). Exported for diagnostics. */
export function buildRequest(
  profile: Profile,
  candidateIds: string[],
  userPrompt: string,
  feedback: string,
  model: string,
) {
  return {
    model,
    contents: feedback ? `${userPrompt}\n\n${feedback}` : userPrompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseJsonSchema: responseJsonSchema(candidateIds, profile.daysPerWeek),
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      maxOutputTokens: 4096,
    },
  };
}

function classifyError(err: unknown): AiAttempt["failure"] {
  if (err instanceof ApiError) {
    if (err.status === 429) return "rate_limited_upstream";
    if (err.status === 408 || err.status === 504) return "timeout";
    return "upstream_error";
  }
  const name = (err as { name?: string })?.name ?? "";
  const msg = String((err as { message?: string })?.message ?? err);
  if (name === "AbortError" || name === "TimeoutError" || /abort|timed? ?out/i.test(msg)) return "timeout";
  if (/\b429\b|RESOURCE_EXHAUSTED/.test(msg)) return "rate_limited_upstream";
  return "upstream_error";
}

export async function generateAiPlan(
  profile: Profile,
  stats: Stats,
  candidates: Candidate[],
  opts: { budgetMs?: number } = {},
): Promise<AiResult> {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const apiKey = process.env.GEMINI_API_KEY;
  const started = Date.now();
  const attempts: AiAttempt[] = [];
  if (!apiKey) return { ok: false, reason: "not_configured", attempts, latencyMs: 0, model };

  const budget = opts.budgetMs ?? TOTAL_BUDGET_MS;
  const deadline = started + budget;
  const candidateIds = candidates.map((c) => c.id);
  const candidateMap = new Map(candidates.map((c) => [c.id, c.category]));
  const fullBody = getArchetype(profile.archetype).split.startsWith("full-body");
  const userPrompt = buildUserPrompt(profile, stats, candidates);
  const ai = getClient(apiKey);
  let lastFailure: AiAttempt["failure"] = "invalid_output";
  let feedback = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    const remaining = deadline - Date.now();
    if (attempt > 1 && remaining < MIN_RETRY_BUDGET_MS) break;
    const t0 = Date.now();
    const record = (a: Omit<AiAttempt, "attempt" | "latencyMs">) =>
      attempts.push({ attempt, latencyMs: Date.now() - t0, ...a });

    try {
      const req = buildRequest(profile, candidateIds, userPrompt, feedback, model);
      const res = await ai.models.generateContent({
        ...req,
        config: {
          ...req.config,
          // Client-side deadline only. (httpOptions.timeout is forwarded to Gemini as a
          // server deadline and rejected below 10 s, which broke retries.)
          abortSignal: AbortSignal.timeout(attempt === 1 ? Math.min(remaining, FIRST_ATTEMPT_MS) : remaining),
        },
      });

      const text = res.text;
      let json: unknown;
      try {
        json = JSON.parse(text ?? "");
      } catch {
        const why = `Response was not valid JSON (finishReason: ${res.candidates?.[0]?.finishReason ?? "unknown"}).`;
        record({ ok: false, failure: "invalid_output", errors: [why], invalidIds: [] });
        lastFailure = "invalid_output";
        feedback = `Your previous answer was rejected: ${why} Return the complete plan as valid JSON.`;
        continue;
      }

      const parsed = AiPlanSchema.safeParse(json);
      if (!parsed.success) {
        const errors = parsed.error.issues.slice(0, 8).map((i) => `${i.path.join(".")}: ${i.message}`);
        // Still count invented IDs for reporting even when the shape is off.
        const invalidIds = extractIds(json).filter((id) => !candidateMap.has(id));
        record({ ok: false, failure: "invalid_output", errors, invalidIds });
        lastFailure = "invalid_output";
        feedback = `Your previous answer was rejected:\n- ${errors.join("\n- ")}\nFix these and return the complete plan again.`;
        continue;
      }

      const { errors, invalidIds } = checkPlanRules(parsed.data, candidateMap, profile.daysPerWeek, { fullBody });
      if (errors.length) {
        record({ ok: false, failure: "invalid_output", errors, invalidIds });
        lastFailure = "invalid_output";
        feedback = `Your previous answer was rejected:\n- ${errors.join("\n- ")}\nFix these and return the complete plan again, using only IDs from CANDIDATES.`;
        continue;
      }

      record({ ok: true, errors: [], invalidIds: [] });
      const plan: Plan = { title: planTitle(getArchetype(profile.archetype)), days: parsed.data.days };
      return { ok: true, plan, attempts, latencyMs: Date.now() - started, model };
    } catch (err) {
      const failure = classifyError(err);
      record({ ok: false, failure, errors: [String((err as Error)?.message ?? err).slice(0, 300)], invalidIds: [] });
      lastFailure = failure;
      // A 429 goes straight to the template. Timeouts (random hangs) and 5xx get the one
      // retry if budget remains. Other 4xx won't fix themselves on retry.
      if (failure === "rate_limited_upstream") break;
      if (err instanceof ApiError && err.status >= 400 && err.status < 500 && failure !== "timeout") break;
    }
  }

  return { ok: false, reason: lastFailure ?? "invalid_output", attempts, latencyMs: Date.now() - started, model };
}

function extractIds(json: unknown): string[] {
  const days = (json as { days?: { exercises?: { exerciseId?: unknown }[] }[] })?.days;
  if (!Array.isArray(days)) return [];
  return days.flatMap((d) =>
    Array.isArray(d?.exercises) ? d.exercises.map((e) => String(e?.exerciseId ?? "")) : [],
  );
}
