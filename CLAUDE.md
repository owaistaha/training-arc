# CLAUDE.md — Training Arc

## What this app is
Next.js web app. The user goes through an anime-styled onboarding
(stats, body shape, body type, level, days, equipment), then picks one
of 6 **original** anime-style physique archetypes. The app computes
calorie and protein targets in code, and Gemini (free tier) builds a
weekly plan using only exercises from `hasaneyldrm/exercises-dataset`.
Each exercise has a demo GIF and steps. Everything is saved in
localStorage. That's the whole v1. Read docs/PRD.md and docs/TECH_SPEC.md first.

## Stack
Next.js 16 (App Router, TS, Tailwind) · `@google/genai` · `zod` ·
`framer-motion` · Vercel Hobby.

## Before you start
**Needs the human (can't be automated):**
1. Create a Gemini API key at aistudio.google.com → "Get API key"
   (Google account login). Paste it into `.env.local` as `GEMINI_API_KEY`.
2. Log in to Vercel (`vercel login` opens a browser OAuth) and later
   add `GEMINI_API_KEY` in the Vercel dashboard, or approve
   `vercel env add`.
3. Approve the final archetype art (a visual IP check, see Hard rules).

**Claude Code can do itself:**
`create-next-app`, npm installs, writing all code, running the
dataset slim script, running the probe script, `vercel deploy`
once logged in.

## Bootstrap sequence
1. `npx create-next-app@latest training-arc --ts --tailwind --app --src-dir --eslint --use-npm`
   then copy in these docs plus `.env.example` and `archetypes.json`
   (goes to `src/data/`)
2. `npm i @google/genai zod framer-motion`
3. Write `scripts/slim-dataset.mjs` (see docs/TECH_SPEC.md), wire it up as
   `prebuild` and `predev`, run it, and **check that the output is under
   3 MB and has 1,324 records**
4. **Check the model:** call `models.list` with the key and confirm
   `GEMINI_MODEL` (default `gemini-3.5-flash-lite`) exists and supports
   `generateContent`. If not, pick the current free Flash-Lite/Flash
   model and update `.env.example`.
5. Write `lib/stats.ts`, `lib/candidates.ts`, `lib/templatePlan.ts`,
   `lib/planSchema.ts`, `lib/gemini.ts`, and the route
   `app/api/plan/route.ts`
6. **Hard gate: test the riskiest assumption before any UI.** Write
   `scripts/probe-plan.ts` and run it against 10 varied profiles (every
   archetype, gym and home, 2–6 days, cut/bulk/recomp). For each one,
   log whether the output validated, how many IDs were invalid, the
   latency and whether a retry was needed. **Pass bar: at least 9/10
   are valid on the first or second try and the median latency is under
   8 s.** If it fails: shrink the candidate list, simplify the schema,
   or try the next model. If it still fails, ship template-first (see
   TECH_SPEC v1.1). Report the numbers to the human either way.
7. Build the UI: `/onboarding` (a step machine, one question per
   screen) → `/arc` (archetype picker) → `/reveal` (stats) →
   `/plan` (week) → `/plan/[day]` (workout + set ticks)
8. Test on a phone-width viewport (375 px) in Playwright: complete the
   onboarding flow, see the plan, check that every GIF loads (no 404s),
   reload and check that state persists
9. Swap in the final archetype art (after the human approves it) →
   `vercel deploy --prod`

## Design: modern dark theme (dark only in v1, no light mode)
- Background `#0A0A0F`, surfaces `#14141C`, raised `#1C1C27`, border
  `#2A2A38`, text `#F4F4F8`, muted text `#9A9AB0`
- Accent: energy orange `#FF6B1A` → gold `#FFB020` gradient for the
  CTAs, progress bar and "power level" highlights. Secondary: electric
  blue `#3B82F6`, used sparingly (selected states).
- Font: `Inter` for UI and `Bebas Neue` for big headings and stat
  numbers (both from `next/font/google`)
- Cards: 16 px radius, 1 px border, subtle inner glow on the selected
  card (`box-shadow: 0 0 0 1px accent, 0 0 24px accent/25%`)
- Motion: framer-motion slide/fade between onboarding steps (200–250 ms),
  count-up animation on the reveal stats. Respect
  `prefers-reduced-motion`.
- Mobile-first: 375 px base, 44 px minimum tap targets, CTA pinned at the
  bottom of onboarding screens, no horizontal scroll
- Define the colors as CSS variables / Tailwind theme tokens in one
  place, never as hex codes scattered through components
- Contrast: body text must meet WCAG AA against its background

## Hard rules
- **No licensed characters.** Never write "Goku", "Vegeta", "Saiyan",
  "Dragon Ball", "Naruto", "One Piece", or any other franchise or
  character name in code, copy, alt text, metadata or image prompts.
  Archetypes are our own characters (`src/data/archetypes.json`).
- **Never let the LLM invent an exercise.** Gemini gets a pre-filtered
  candidate list, and any `exerciseId` not in that list fails
  validation. Without this it will produce a plausible "Incline Hammer
  Grip Flye" with a made-up ID and a broken GIF.
- **The LLM never does the maths.** BMI, BMR, TDEE, calories and
  protein come from `lib/stats.ts`. Calories never go below BMR, a cut
  never goes below 80% of TDEE, and a bulk never goes above 110%.
- A 429 or a timeout from the Gemini free tier is expected. Return the
  template plan with `source: "template"`, never an error screen or an
  endless spinner.
- `GEMINI_API_KEY` is server-only: never `NEXT_PUBLIC_`, and never
  imported from a `"use client"` file.
- Send Gemini only the plan inputs (the free tier may use content for
  training). Don't send names, emails or free text.
- Media: load GIFs and images from the pinned raw GitHub URL using a
  plain `<img>` at up to 180×180. Don't copy media into `public/`,
  don't use `next/image`, and always show "© Gym visual —
  https://gymvisual.com/" next to media.
- Age input: min 18. Show a short "not medical advice, check with a
  professional if you have health conditions" line on `/reveal`.
- Body type is only a light tweak to reps and cardio, and never
  changes calories.
- Wrap every localStorage read and write in try/catch. If state is
  missing or corrupt, send the user to `/onboarding` without crashing.

## Folder structure
```
training-arc/
  scripts/
    slim-dataset.mjs
    probe-plan.ts
  src/
    app/
      page.tsx                 (landing → "Start your arc")
      onboarding/page.tsx
      arc/page.tsx
      reveal/page.tsx
      plan/page.tsx
      plan/[day]/page.tsx
      api/plan/route.ts
    components/                (StepShell, OptionCard, ArchetypeCard, ExerciseCard, SetTicker)
    data/
      archetypes.json
      exercises.slim.json      (generated, gitignored)
    lib/
      stats.ts  candidates.ts  templatePlan.ts
      planSchema.ts  gemini.ts  storage.ts  media.ts
  public/archetypes/           (original art, added in step 9)
```

## Definition of done for v1
A new visitor on the deployed Vercel URL completes onboarding on their
phone, picks an archetype, and gets a valid weekly plan in under 10
seconds where every exercise shows a working GIF. After closing and
reopening the browser, the plan and ticked sets are still there.
