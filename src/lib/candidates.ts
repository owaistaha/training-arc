// Pre-filters the 1,324-exercise dataset down to a 60-90 exercise shortlist
// for one profile. Gemini only ever sees (and may only ever pick from) this list.
import exercisesJson from "@/data/exercises.slim.json";
import { bodyTypeTweak, getArchetype } from "./archetypes";
import type { Profile } from "./planSchema";

export interface Exercise {
  id: string;
  name: string;
  category: string;
  equipment: string;
  target: string;
  secondary_muscles: string[];
  steps: string[];
  gif: string;
  image: string;
}

export interface Candidate {
  id: string;
  name: string;
  category: string;
  target: string;
  equipment: string;
}

export const EXERCISES = exercisesJson as Exercise[];
export const EXERCISES_BY_ID: ReadonlyMap<string, Exercise> = new Map(
  EXERCISES.map((e) => [e.id, e]),
);

const HOME_EQUIPMENT = new Set(["body weight", "band", "resistance band", "dumbbell", "kettlebell"]);
const BODYWEIGHT_ONLY = new Set(["body weight"]);
// Gym: everything except oddities that make poor programme staples.
const GYM_EXCLUDED = new Set(["roller", "wheel roller", "hammer", "tire", "bosu ball", "upper body ergometer"]);

// Not training movements (mobility/stretching/sport drills) — never candidates.
const EXCLUDE_NAME = /stretch|yoga|pose\b|boxing|massage|balance board|\bsphinx\b|upward facing dog/i;
// Skill moves that don't belong in a beginner/intermediate plan.
const ADVANCED_SKILL =
  /squat jerk|snatch|power clean|planche|front lever|back lever|muscle up|skin the cat|one arm chin|one arm pull|single arm push|archer|clap|superman push|handstand|human flag|dragon flag|pistol|korean dips|kipping/i;

// Well-known staples get a strong boost so plans look like real programmes.
const STAPLES: Record<string, RegExp> = {
  chest: /bench press|push-up$|^push-up|chest dip|dumbbell fly|chest press|incline (bench |dumbbell )?press|cable (middle |standing )?fly|decline push|incline push/i,
  back: /^pull-up|^chin-up|bent over row|seated row|pulldown|t bar row|inverted row|one arm row|deadlift|hyperextension|shrug|pullover/i,
  shoulders: /shoulder press|military press|arnold press|lateral raise|rear delt|reverse fly|front raise|upright row|push press|pike/i,
  "upper arms": /(barbell|dumbbell|hammer|preacher|cable|ez barbell) curl|biceps curl|triceps (extension|pushdown|dip)|pushdown|skull|close-grip bench|bench dip|kickback|diamond push/i,
  "upper legs": /full squat|goblet squat|front squat|^squat$|dumbbell squat|lunge|romanian|stiff leg|leg press|leg extension|leg curl|hip thrust|glute bridge|step-up|split squat|good morning|hack squat|jump squat|bodyweight squat/i,
  "lower legs": /calf raise/i,
  waist: /^plank|front plank|crunch|leg raise|sit-up|russian twist|hanging|ab wheel|rollout|dead bug|bicycle|side bridge|v-up|mountain climber/i,
  cardio: /burpee|jump rope|mountain climber|^run$|high knee|stationary bike|elliptical|star jump|jack jump|skater|bear crawl|stepmill/i,
};

// The backbone lifts of any sensible programme get an extra boost on top of STAPLES.
const PRIORITY =
  /^(barbell|dumbbell) bench press$|^push-up$|^pull-up$|^chin-up$|^inverted row$|cable pulldown|lat pulldown|bent over row|cable seated row|^barbell (full |front )?squat$|goblet squat|^barbell deadlift$|romanian deadlift|stiff leg deadlift|lever leg press|^(dumbbell|barbell) lunge$|walking lunge|hip thrust|glute bridge|split squat|leg extension|lying leg curl|shoulder press|military press|lateral raise|rear delt|^barbell curl$|biceps curl|hammer curl|pushdown|triceps extension|bench dip|chest dip|triceps dip|front plank|^plank|crunch floor|^crunch|hanging leg raise|dead bug|standing calf raise|^burpee$|^run$|jump rope|mountain climber|pike push/i;

// Minor targets get at most this many picks per category.
const MINOR_TARGETS = new Set(["traps", "adductors", "abductors", "serratus anterior", "levator scapulae", "spine", "forearms"]);
const MINOR_CAP = 1;
// Near-duplicate movement families (by last word of the name).
const BROAD_FAMILIES = new Set(["press", "raise", "row", "curl", "squat", "crunch", "fly"]);
const familyCap = (family: string) => (BROAD_FAMILIES.has(family) ? 4 : 2);
const familyOf = (name: string) =>
  name.toLowerCase().replace(/\(.*?\)|v\. ?\d+/g, "").trim().split(/\s+/).pop() ?? "";

function equipmentScore(equipment: string, setting: Profile["equipment"]): number {
  if (setting === "home") {
    return ({ dumbbell: 2, "body weight": 2, kettlebell: 1, band: 1 } as Record<string, number>)[equipment] ?? 0;
  }
  return (
    ({
      barbell: 3,
      dumbbell: 3,
      cable: 2,
      "leverage machine": 2,
      "body weight": 1,
      "smith machine": 1,
      "ez barbell": 1,
    } as Record<string, number>)[equipment] ?? 0
  );
}

function score(e: Exercise, profile: Profile): number {
  let s = 0;
  if (STAPLES[e.category]?.test(e.name)) s += 10;
  if (PRIORITY.test(e.name)) s += 6;
  if (/v\. ?\d/.test(e.name)) s -= 6; // "v. 2", "v. 3" variants
  if (/stability ball|\(wall\)|towel|suspended|assisted/i.test(e.name)) s -= 3;
  s += equipmentScore(e.equipment, profile.equipment);
  s -= e.name.length / 12; // shorter names are usually the canonical movement
  return s;
}

function allowedEquipment(profile: Profile): (eq: string) => boolean {
  const arch = getArchetype(profile.archetype);
  if (arch.equipment === "bodyweight") return (eq) => BODYWEIGHT_ONLY.has(eq);
  if (profile.equipment === "home") return (eq) => HOME_EQUIPMENT.has(eq);
  return (eq) => !GYM_EXCLUDED.has(eq);
}

/** How many candidates to take from each category for this profile. */
export function categoryQuotas(profile: Profile): Record<string, number> {
  const arch = getArchetype(profile.archetype);
  const tweak = bodyTypeTweak(arch, profile.bodyType);
  const quotas: Record<string, number> = {
    chest: 10,
    back: 10,
    shoulders: 10,
    "upper arms": 10,
    "upper legs": 10,
    waist: 10,
    "lower legs": 5,
    cardio: tweak.cardio === "minimal" ? 3 : tweak.cardio === "normal" ? 5 : 10,
  };
  for (const cat of arch.emphasis) quotas[cat] = 14;
  return quotas;
}

const MAX_CANDIDATES = 90;

/**
 * Deterministic: the same profile always yields the same candidate list.
 * Within a category: well-known staples first (spread across target
 * muscles), then the best of the rest, with caps on minor muscles and on
 * near-duplicate variations.
 */
export function selectCandidates(profile: Profile): Candidate[] {
  const allowEq = allowedEquipment(profile);
  const allowAdvanced = profile.experience === "advanced";
  const quotas = categoryQuotas(profile);
  const emphasis = getArchetype(profile.archetype).emphasis;

  // Category order: archetype emphasis first, then the rest.
  const categories = [
    ...emphasis.filter((c) => c in quotas),
    ...Object.keys(quotas).filter((c) => !emphasis.includes(c)),
  ];

  const out: Candidate[] = [];
  for (const category of categories) {
    const seenNames = new Set<string>();
    const pool = EXERCISES.filter(
      (e) =>
        e.category === category &&
        allowEq(e.equipment) &&
        !EXCLUDE_NAME.test(e.name) &&
        (allowAdvanced || !ADVANCED_SKILL.test(e.name)),
    )
      .map((e) => ({ e, s: score(e, profile) }))
      .sort((a, b) => b.s - a.s || a.e.id.localeCompare(b.e.id))
      .filter(({ e }) => {
        const key = e.name.toLowerCase().replace(/\s*v\. ?\d+$/, "").trim();
        if (seenNames.has(key)) return false; // dataset has duplicate names
        seenNames.add(key);
        return true;
      })
      .map(({ e }) => e);

    const quota = quotas[category];
    const picked: Exercise[] = [];
    const targetCount = new Map<string, number>();
    const familyCount = new Map<string, number>();
    const tryPick = (e: Exercise) => {
      if (picked.length >= quota || picked.includes(e)) return false;
      // Skip variants of something already picked ("chest dip on straight bar" after "chest dip").
      const lower = e.name.toLowerCase();
      if (picked.some((p) => lower.startsWith(p.name.toLowerCase() + " "))) return false;
      const fam = familyOf(e.name);
      if (MINOR_TARGETS.has(e.target) && (targetCount.get(e.target) ?? 0) >= MINOR_CAP) return false;
      if ((familyCount.get(fam) ?? 0) >= familyCap(fam)) return false;
      picked.push(e);
      targetCount.set(e.target, (targetCount.get(e.target) ?? 0) + 1);
      familyCount.set(fam, (familyCount.get(fam) ?? 0) + 1);
      return true;
    };

    // Phase A: staples, round-robin across target muscles (best-scored first),
    // so e.g. "upper legs" covers quads, glutes AND hamstrings.
    const staples = pool.filter((e) => STAPLES[category]?.test(e.name));
    const byTarget = new Map<string, Exercise[]>();
    for (const e of staples) {
      if (!byTarget.has(e.target)) byTarget.set(e.target, []);
      byTarget.get(e.target)!.push(e);
    }
    const queues = [...byTarget.values()];
    while (picked.length < quota && queues.some((q) => q.length)) {
      for (const q of queues) {
        while (q.length && !tryPick(q.shift()!)) {}
        if (picked.length >= quota) break;
      }
    }
    // Phase B: fill the rest by score.
    for (const e of pool) {
      if (picked.length >= quota) break;
      tryPick(e);
    }
    for (const e of picked) {
      out.push({ id: e.id, name: e.name, category: e.category, target: e.target, equipment: e.equipment });
    }
  }
  return out.slice(0, MAX_CANDIDATES);
}
