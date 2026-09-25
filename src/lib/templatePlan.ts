// Deterministic fallback plan: a fixed split per archetype, filled from the
// same candidate list Gemini sees. Used when the AI call fails, times out,
// returns invalid output, or hits a 429. The user always gets a plan.
import { bodyTypeTweak, getArchetype, planTitle, type Split } from "./archetypes";
import type { Candidate } from "./candidates";
import type { Plan, PlanDay, PlanExercise, Profile } from "./planSchema";

type Slot = { category: string; target?: string };

interface DayTemplate {
  name: string;
  focus: string;
  slots: Slot[];
}

const S = (category: string, target?: string): Slot => ({ category, target });

const PUSH: DayTemplate = {
  name: "Push",
  focus: "chest, shoulders, triceps",
  slots: [S("chest", "pectorals"), S("shoulders", "delts"), S("chest", "pectorals"), S("shoulders", "delts"), S("upper arms", "triceps")],
};
const PULL: DayTemplate = {
  name: "Pull",
  focus: "back, rear delts, biceps",
  slots: [S("back", "lats"), S("back", "upper back"), S("back", "lats"), S("upper arms", "biceps"), S("upper arms", "biceps"), S("waist", "abs")],
};
const LEGS: DayTemplate = {
  name: "Legs",
  focus: "quads, hamstrings, glutes, calves",
  slots: [S("upper legs", "quads"), S("upper legs", "hamstrings"), S("upper legs", "glutes"), S("upper legs"), S("lower legs", "calves"), S("waist", "abs")],
};
const UPPER: DayTemplate = {
  name: "Upper",
  focus: "chest, back, shoulders, arms",
  slots: [S("chest", "pectorals"), S("back", "lats"), S("shoulders", "delts"), S("back", "upper back"), S("upper arms", "biceps"), S("upper arms", "triceps")],
};
const LOWER: DayTemplate = {
  name: "Lower",
  focus: "legs and core",
  slots: [S("upper legs", "quads"), S("upper legs", "hamstrings"), S("upper legs", "glutes"), S("lower legs", "calves"), S("waist", "abs"), S("waist", "abs")],
};
const fullBody = (letter: string): DayTemplate => ({
  name: `Full Body ${letter}`,
  focus: "full body compounds + core",
  slots: [S("upper legs", "quads"), S("chest", "pectorals"), S("back", "lats"), S("shoulders", "delts"), S("upper legs", "hamstrings"), S("waist", "abs")],
});
const FULL_A = fullBody("A");
const FULL_B = fullBody("B");
const FULL_C = fullBody("C");

const SPLITS: Record<Split, Record<number, DayTemplate[]>> = {
  "push-pull-legs": {
    2: [FULL_A, FULL_B],
    3: [PUSH, PULL, LEGS],
    4: [PUSH, PULL, LEGS, UPPER],
    5: [PUSH, PULL, LEGS, UPPER, LOWER],
    6: [PUSH, PULL, LEGS, PUSH, PULL, LEGS],
  },
  "upper-lower": {
    2: [UPPER, LOWER],
    3: [UPPER, LOWER, FULL_A],
    4: [UPPER, LOWER, UPPER, LOWER],
    5: [UPPER, LOWER, UPPER, LOWER, FULL_A],
    6: [UPPER, LOWER, UPPER, LOWER, UPPER, LOWER],
  },
  "full-body": {
    2: [FULL_A, FULL_B],
    3: [FULL_A, FULL_B, FULL_C],
    4: [FULL_A, FULL_B, FULL_C, FULL_A],
    5: [FULL_A, FULL_B, FULL_C, FULL_A, FULL_B],
    6: [FULL_A, FULL_B, FULL_C, FULL_A, FULL_B, FULL_C],
  },
  "full-body-plus-conditioning": {
    2: [FULL_A, FULL_B],
    3: [FULL_A, FULL_B, FULL_C],
    4: [FULL_A, FULL_B, FULL_C, FULL_A],
    5: [FULL_A, FULL_B, FULL_C, FULL_A, FULL_B],
    6: [FULL_A, FULL_B, FULL_C, FULL_A, FULL_B, FULL_C],
  },
};

// If a category has no candidates (e.g. the dataset has no body-weight
// shoulder moves), use the nearest substitute instead.
const CATEGORY_FALLBACK: Record<string, string> = {
  shoulders: "chest",
  "lower legs": "upper legs",
  cardio: "waist",
};

const TIMED = /plank|hold|isometric|wall sit|run$|walk|bike|elliptical|stepmill|jump rope|bear crawl/i;

export function buildTemplatePlan(profile: Profile, candidates: Candidate[]): Plan {
  const arch = getArchetype(profile.archetype);
  const tweak = bodyTypeTweak(arch, profile.bodyType);
  const [lo, hi] = tweak.repRange.split("-").map(Number);
  const conditioning = arch.split === "full-body-plus-conditioning";
  const bodyweightOnly = arch.equipment === "bodyweight";

  const weekUse = new Map<string, number>();
  const templates = SPLITS[arch.split][profile.daysPerWeek];

  const days: PlanDay[] = templates.map((tpl, dayIdx) => {
    const slots = [...tpl.slots];
    if (tweak.cardio === "extra" || conditioning) slots.push(S("cardio"));
    else if (tweak.cardio === "normal" && dayIdx % 2 === 1) slots.push(S("cardio"));

    const used = new Set<string>();
    const exercises: PlanExercise[] = [];

    const pick = (slot: Slot): Candidate | undefined => {
      const fromCategory = (cat: string) => {
        const pool = candidates.filter((c) => c.category === cat && !used.has(c.id));
        const preferred = slot.target ? pool.filter((c) => c.target === slot.target) : [];
        const list = preferred.length ? preferred : pool;
        // Least-used this week first (variety across repeated days), then candidate order (best first).
        return [...list].sort((a, b) => (weekUse.get(a.id) ?? 0) - (weekUse.get(b.id) ?? 0))[0];
      };
      return fromCategory(slot.category) ?? (CATEGORY_FALLBACK[slot.category] && fromCategory(CATEGORY_FALLBACK[slot.category]));
    };

    const pushExercise = (c: Candidate, position: number) => {
      used.add(c.id);
      weekUse.set(c.id, (weekUse.get(c.id) ?? 0) + 1);
      exercises.push(prescribe(c, position));
    };

    const prescribe = (c: Candidate, position: number): PlanExercise => {
      const main = position < 2 && c.category !== "waist" && c.category !== "cardio";
      if (c.category === "cardio") {
        return { exerciseId: c.id, sets: 3, reps: tweak.cardio === "extra" ? "45-60 s" : "30-45 s", restSec: 30 };
      }
      if (c.category === "waist") {
        return { exerciseId: c.id, sets: 3, reps: TIMED.test(c.name) ? "30-45 s" : "12-20", restSec: 45 };
      }
      if (main) {
        return {
          exerciseId: c.id,
          sets: profile.experience === "beginner" ? 3 : 4,
          reps: tweak.repRange,
          restSec: conditioning ? 75 : lo <= 6 ? 150 : lo <= 8 ? 120 : 90,
          note: bodyweightOnly
            ? "Main movement: add reps, then move to a harder variation"
            : "Main lift: add weight when you hit the top of the range on all sets",
        };
      }
      return {
        exerciseId: c.id,
        sets: 3,
        reps: `${Math.min(lo + 2, 15)}-${Math.min(hi + 2, 20)}`,
        restSec: conditioning ? 45 : 75,
      };
    };

    slots.forEach((slot) => {
      if (exercises.length >= 7) return;
      const c = pick(slot);
      if (c) pushExercise(c, exercises.length);
    });

    // Guarantee at least 4 exercises even with a thin candidate list.
    for (const c of candidates) {
      if (exercises.length >= 4) break;
      if (!used.has(c.id)) pushExercise(c, exercises.length);
    }

    return { name: tpl.name, focus: tpl.focus, exercises };
  });

  return { title: planTitle(arch), days };
}
