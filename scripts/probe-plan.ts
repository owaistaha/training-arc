/* Hard gate (CLAUDE.md bootstrap step 6): run the real plan pipeline against
 * 10 varied profiles and report validity, invalid IDs, latency and retries.
 * Pass bar: >= 9/10 valid on the 1st or 2nd try AND median latency < 8 s.
 *
 *   npm run probe            (uses GEMINI_API_KEY / GEMINI_MODEL from .env.local)
 *   PROBE_DELAY_MS=0 npm run probe
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getArchetype } from "@/lib/archetypes";
import { buildPlan } from "@/lib/buildPlan";
import { EXERCISES_BY_ID, selectCandidates } from "@/lib/candidates";
import { checkPlanRules, ProfileSchema, type Profile } from "@/lib/planSchema";
import { computeStats } from "@/lib/stats";
import { buildTemplatePlan } from "@/lib/templatePlan";

const PROFILES: Profile[] = [
  // 1. The TECH_SPEC example (also used to check the stats maths below)
  { sex: "male", age: 24, heightCm: 178, weightKg: 72, targetWeightKg: 78, bodyShape: "slim", bodyType: "ectomorph", experience: "beginner", daysPerWeek: 4, equipment: "gym", archetype: "warrior" },
  { sex: "male", age: 31, heightCm: 175, weightKg: 80, targetWeightKg: 80, bodyShape: "athletic", bodyType: "mesomorph", experience: "intermediate", daysPerWeek: 3, equipment: "gym", archetype: "rival" },
  { sex: "female", age: 29, heightCm: 165, weightKg: 70, targetWeightKg: 62, bodyShape: "average", bodyType: "endomorph", experience: "intermediate", daysPerWeek: 5, equipment: "home", archetype: "ninja" },
  { sex: "male", age: 22, heightCm: 183, weightKg: 68, targetWeightKg: 80, bodyShape: "slim", bodyType: "ectomorph", experience: "advanced", daysPerWeek: 6, equipment: "gym", archetype: "titan" },
  { sex: "female", age: 36, heightCm: 170, weightKg: 64, targetWeightKg: 65, bodyShape: "average", bodyType: "mesomorph", experience: "beginner", daysPerWeek: 2, equipment: "home", archetype: "swordsman" },
  { sex: "male", age: 27, heightCm: 172, weightKg: 78, targetWeightKg: 72, bodyShape: "heavy", bodyType: "endomorph", experience: "beginner", daysPerWeek: 4, equipment: "home", archetype: "monk" },
  { sex: "male", age: 40, heightCm: 180, weightKg: 90, targetWeightKg: 80, bodyShape: "heavy", bodyType: "mesomorph", experience: "advanced", daysPerWeek: 6, equipment: "home", archetype: "warrior" },
  { sex: "female", age: 21, heightCm: 160, weightKg: 60, targetWeightKg: 61, bodyShape: "slim", bodyType: "ectomorph", experience: "intermediate", daysPerWeek: 3, equipment: "gym", archetype: "ninja" },
  { sex: "male", age: 26, heightCm: 176, weightKg: 70, targetWeightKg: 76, bodyShape: "average", bodyType: "mesomorph", experience: "intermediate", daysPerWeek: 5, equipment: "home", archetype: "titan" },
  { sex: "male", age: 33, heightCm: 180, weightKg: 70, targetWeightKg: 76, bodyShape: "slim", bodyType: "ectomorph", experience: "advanced", daysPerWeek: 5, equipment: "home", archetype: "rival" },
];

const DELAY_MS = Number(process.env.PROBE_DELAY_MS ?? 4000);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN;
};
const secs = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

function checkStatsExample() {
  // TECH_SPEC response example: bmi 22.7, bmr 1718, tdee 2662, calories 2928, protein 140, bulk
  const s = computeStats(PROFILES[0]);
  const expected = { bmi: 22.7, bmr: 1718, tdee: 2662, calories: 2928, proteinG: 140, direction: "bulk" };
  const diffs = Object.entries(expected).filter(([k, v]) => (s as unknown as Record<string, unknown>)[k] !== v);
  console.log(diffs.length ? `STATS CHECK FAILED: ${JSON.stringify(diffs)} got ${JSON.stringify(s)}` : "Stats check vs TECH_SPEC example: OK");
  // Clamp sanity across all profiles
  for (const p of PROFILES) {
    const st = computeStats(p);
    const ok = st.calories >= st.bmr && st.calories >= Math.round(st.tdee * 0.8) - 1 && st.calories <= Math.round(st.tdee * 1.1) + 1;
    if (!ok) console.log(`CLAMP VIOLATION for ${p.archetype}: ${JSON.stringify(st)}`);
  }
}

async function main() {
  console.log(`Model: ${process.env.GEMINI_MODEL || "(default)"} | profiles: ${PROFILES.length} | delay between calls: ${DELAY_MS} ms\n`);
  checkStatsExample();

  // Every template must itself be valid — it's the safety net.
  let templateFailures = 0;
  for (const p of PROFILES) {
    ProfileSchema.parse(p);
    const cands = selectCandidates(p);
    const t = buildTemplatePlan(p, cands);
    const fullBody = getArchetype(p.archetype).split.startsWith("full-body");
    const { errors } = checkPlanRules(t, new Map(cands.map((c) => [c.id, c.category])), p.daysPerWeek, { fullBody });
    if (errors.length) {
      templateFailures++;
      console.log(`TEMPLATE INVALID for ${p.archetype}/${p.equipment}/${p.daysPerWeek}d: ${errors.join("; ")}`);
    }
  }
  console.log(`Template plans valid: ${PROFILES.length - templateFailures}/${PROFILES.length}\n`);

  const rows: Record<string, unknown>[] = [];
  const wallTimes: number[] = [];
  const full: unknown[] = [];

  for (const [i, p] of PROFILES.entries()) {
    if (i > 0 && DELAY_MS) await sleep(DELAY_MS);
    const label = `${p.archetype}/${p.equipment}/${p.daysPerWeek}d/${computeStats(p).direction}`;
    const t0 = Date.now();
    const { response, ai, candidateCount } = await buildPlan(p);
    const wall = Date.now() - t0;
    const attempts = ai?.attempts ?? [];
    const validOn = ai?.ok ? attempts.length : null;
    const invalidIds = attempts.reduce((n, a) => n + a.invalidIds.length, 0);

    wallTimes.push(wall);
    const row = {
      "#": i + 1,
      profile: label,
      cands: candidateCount,
      valid: validOn ? `yes (try ${validOn})` : "NO",
      retry: attempts.length > 1 ? "yes" : "no",
      invalidIds,
      latency: secs(wall),
      source: response.source,
      fallback: response.fallbackReason ?? "",
    };
    rows.push(row);
    console.log(`[${i + 1}/10] ${label}: ${row.valid}, ${row.latency}, source=${response.source}${row.fallback ? ` (${row.fallback})` : ""}`);
    for (const a of attempts) {
      if (!a.ok) console.log(`    attempt ${a.attempt} failed (${a.failure}, ${secs(a.latencyMs)}): ${a.errors.slice(0, 3).join(" | ")}`);
    }

    full.push({
      profile: p,
      source: response.source,
      fallbackReason: response.fallbackReason,
      attempts,
      stats: response.stats,
      plan: {
        title: response.plan.title,
        days: response.plan.days.map((d) => ({
          name: d.name,
          focus: d.focus,
          exercises: d.exercises.map((e) => ({ ...e, name: EXERCISES_BY_ID.get(e.exerciseId)?.name ?? "??? NOT IN DATASET" })),
        })),
      },
    });
  }

  console.log();
  console.table(rows);

  const aiRuns = full as { source: string; attempts: { ok: boolean; latencyMs: number }[] }[];
  const validCount = aiRuns.filter((r) => r.source === "ai").length;
  const firstTry = aiRuns.filter((r) => r.source === "ai" && r.attempts.length === 1).length;
  const totalInvalidIds = rows.reduce((n, r) => n + (r.invalidIds as number), 0);
  const plansWithInvalidIds = rows.filter((r) => (r.invalidIds as number) > 0).length;
  // User-facing latency: request start -> plan returned (AI or template), all 10 runs.
  const latencies = wallTimes;
  const med = median(latencies);
  const fallbacks = rows.filter((r) => r.source === "template").length;
  const pass = validCount >= 9 && med < 8000;

  console.log(`Valid AI plans:        ${validCount}/10  (first try: ${firstTry}, needed retry: ${validCount - firstTry})`);
  console.log(`Plans with invalid IDs: ${plansWithInvalidIds}  (total invalid IDs: ${totalInvalidIds})`);
  console.log(`Median latency:        ${secs(med)}  (min ${secs(Math.min(...latencies))}, max ${secs(Math.max(...latencies))})`);
  console.log(`Template fallbacks:    ${fallbacks}/10`);
  console.log(`\nPASS BAR (>=9/10 valid, median < 8 s): ${pass ? "PASS" : "FAIL"}`);

  const out = resolve(__dirname, "probe-results.json");
  writeFileSync(out, JSON.stringify({ ranAt: new Date().toISOString(), model: process.env.GEMINI_MODEL, summary: { validCount, firstTry, plansWithInvalidIds, totalInvalidIds, medianLatencyMs: med, fallbacks, pass }, runs: full }, null, 2));
  console.log(`Full plans written to ${out}`);
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
