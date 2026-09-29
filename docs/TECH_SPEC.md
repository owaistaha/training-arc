# Training Arc — Technical Spec (v1)

## Stack
- **Client and server:** Next.js 16 (App Router) + TypeScript +
  Tailwind. One codebase, and the API key stays server-side in a Route
  Handler.
- **Hosting:** Vercel Hobby, which is free with no card. Its terms allow
  only non-commercial, personal use, which fits a portfolio project.
  If this ever gets monetized, it has to move to Pro.
- **AI:** Google Gemini API, free tier, through the `@google/genai`
  SDK. Default model is `gemini-3.5-flash-lite`, set with the
  `GEMINI_MODEL` env var so it can change without a code change. Model
  names have changed more than once, so run `models.list` before
  trusting this one. Note: on the free tier, **Google may use request
  content to improve its products**, so never send a name, email or
  anything identifying. Send only the numbers and choices the plan
  needs.
- **Why not Grok:** as of Sept 2026, xAI offers only promotional
  credits (these expire, and some accounts need a card on file). It
  has no ongoing free tier, so Gemini is the only zero-cost option.
- **Persistence:** localStorage only (profile, plan, completed sets).
  Every read is wrapped in try/catch and falls back to onboarding.
- **Validation:** `zod` for onboarding input and for the LLM output.

## Security and architecture
- `GEMINI_API_KEY` lives only in `.env.local` locally and in Vercel
  project env vars. It is **never** given a `NEXT_PUBLIC_` prefix and
  never imported into a client component.
- The browser calls `POST /api/plan`, and only that route talks to
  Gemini.
- Basic abuse guard: reject bodies over 4 KB, and add a simple
  in-memory per-IP limit of 5 plans per 10 minutes. That's best-effort
  on serverless, but good enough for a portfolio app.

## Exercise data: the source and its licenses
Source: `hasaneyldrm/exercises-dataset`, pinned to commit
`7455efae41b330c265e7cd4b78dfa848e7ce5ebd`.
- 1,324 exercises. `data/exercises.json` is **17 MB** because it has
  instructions in 10 languages.
- **Licensing is split, and this matters:** the JSON data is MIT. The
  images and GIFs are **© Gym visual** and are *not* MIT. They must keep
  their 180×180 size and carry the attribution
  "© Gym visual — https://gymvisual.com/". Their own terms apply,
  and a commercial release would need a license from Gym visual.
- Useful fields: `id`, `name`, `category` (upper arms, upper legs, back,
  waist, chest, shoulders, lower legs, lower arms, cardio, neck),
  `equipment` (body weight 325, dumbbell 294, cable 157, barbell
  154, …), `target` (abs, pectorals, biceps, glutes, delts, triceps,
  lats, …), `secondary_muscles[]`, `instruction_steps.en[]`,
  `gif_url` (e.g. `videos/0001-2gPfomN.gif`), `image`.

### Build step: slim the dataset
`scripts/slim-dataset.mjs` runs as a `prebuild` step:
1. Download `exercises.json` from the pinned commit's raw URL
2. Keep only `id, name, category, equipment, target, secondary_muscles,
   steps (en only), gif, image`
3. Write `src/data/exercises.slim.json`. The goal is under about 1.5 MB;
   check the size and fail the build if it's over 3 MB.

**Media is not copied into the repo** (it's about 138 MB, and
redistributing it isn't ours to do). The URL is built at runtime:
`https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/7455efae41b330c265e7cd4b78dfa848e7ce5ebd/<gif_url>`
Use a plain `<img>`, not `next/image`. Next's image optimizer would
resize the media (which breaks the 180×180 term) and use up Vercel's
5,000 free image transformations.

## Deterministic stats (in `lib/stats.ts`, never computed by the LLM)
- BMI = kg / m²
- BMR (Mifflin-St Jeor): male `10w + 6.25h − 5a + 5`, female `… − 161`
- TDEE = BMR × activity factor from days/week (2 → 1.375, 3–4 → 1.55,
  5–6 → 1.725)
- Direction: target < current − 2 kg → **cut**, target > current + 2 kg
  → **bulk**, else **recomp**
- Calories: cut = TDEE × 0.80, bulk = TDEE × 1.10, recomp = TDEE.
  **Floor: never below BMR.** Archetype sets its default only when the
  weight direction is "recomp".
- Protein: 1.8 g/kg of target weight (rounded)
- Warn (don't block) if the target weight's BMI is < 18.5 or > 30
- Body type (ecto/meso/endo) is pop science. It only nudges rep ranges
  and cardio volume and **never** changes calories.

## Plan pipeline (`POST /api/plan`)
1. **Validate** the profile with zod
2. **Pre-filter candidates in code:** equipment filter (home →
   `body weight`, `band`, `dumbbell`, `kettlebell`; the monk archetype →
   `body weight` only), drop `neck`, then pick about 12 exercises per
   relevant category ordered by archetype emphasis. That comes to
   **60–90 candidates** in total, each sent as
   `{id, name, target, equipment}` (about 4k tokens).
3. **Call Gemini** with `responseMimeType: "application/json"` and a
   `responseSchema` that matches the plan shape below. The system
   prompt says: use only IDs from the candidate list, give
   `daysPerWeek` days, 4–7 exercises per day, and sets/reps from the
   archetype's rep range.
4. **Validate the output:** zod parse, then check that **every
   `exerciseId` is in the candidate set**, that the day count matches,
   and that there are no duplicates within a day. If anything fails,
   retry once with the error text appended.
5. **Fallback:** if it still fails, or on a timeout (15 s) or a 429,
   build the plan from `lib/templatePlan.ts` (fixed split per archetype
   using the same candidates) and return it with `source: "template"`.
   The user always gets a plan, and a 429 from the free tier is an
   expected outcome, not a bug.

### Request
```json
{
  "sex": "male", "age": 24, "heightCm": 178, "weightKg": 72,
  "targetWeightKg": 78, "bodyShape": "slim", "bodyType": "ectomorph",
  "experience": "beginner", "daysPerWeek": 4, "equipment": "gym",
  "archetype": "warrior"
}
```
### Response
```json
{
  "source": "ai",
  "stats": { "bmi": 22.7, "bmr": 1718, "tdee": 2662, "calories": 2928,
             "proteinG": 140, "direction": "bulk" },
  "plan": {
    "title": "Warrior Arc — Week 1",
    "days": [
      { "name": "Push", "focus": "chest, shoulders, triceps",
        "exercises": [
          { "exerciseId": "0025", "sets": 4, "reps": "6-10", "restSec": 120,
            "note": "Main lift — add weight when you hit 10 reps on all sets" }
        ] }
    ]
  },
  "exercises": {
    "0025": {
      "name": "barbell bench press", "target": "pectorals",
      "equipment": "barbell", "secondary": ["triceps", "shoulders"],
      "steps": ["Lie flat on a bench with your feet flat on the ground…", "…"],
      "gif": "videos/0025-EIeI8Vf.gif"
    }
  }
}
```
- `exercises` has one entry per `exerciseId` used anywhere in `plan`, with
  English steps and the relative GIF path (the client builds the pinned raw
  URL). This means the browser never loads the full dataset.
- `stats` also includes `targetBmi` and `warnings` (strings, for the BMI
  < 18.5 / > 30 warning).
- When `source` is `"template"`, a `fallbackReason` is added:
  `rate_limited_upstream`, `rate_limited_local`, `timeout`,
  `invalid_output`, `upstream_error` or `not_configured`.

## Data model (localStorage)
| key | shape |
|---|---|
| `ta.profile.v1` | request object above (partial while onboarding is in progress; `archetype` is added on `/arc`) |
| `ta.plan.v1` | response object above + `createdAt` + `profileKey` (a plan is regenerated when the profile changes) |
| `ta.log.v1` | `{ [isoDate]: { [dayIndex]: { [exerciseId]: boolean[] } } }` (ticked sets) |

## Archetype art
- v1 starts with CSS/SVG silhouette placeholders so the build isn't
  blocked on art.
- Final art: original anime-style illustrations, generated or drawn
  from **generic descriptions only** (e.g. "original anime-style
  martial artist, short dark hair, plain grey training wear, lean V-taper
  physique"). Prompts must never contain a franchise or character name.
  The output also must not recreate a known character's signature
  outfit, hair and color combination. The art gets checked by eye
  before it ships.

## Packages
`next`, `react`, `react-dom`, `typescript`, `tailwindcss`,
`@google/genai`, `zod`, `framer-motion` (onboarding transitions).

## v1.1 (deferred, don't build yet)
- If the Gemini free tier proves too rate-limited: switch to the template
  plan only and use AI just for a one-line "coach note" per day
- Supabase auth + sync across devices
- Flutter client that reads the same `/api/plan` contract
- Weekly progression (auto-bump reps/weight) and a "power level" streak
