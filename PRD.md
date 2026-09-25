# Training Arc — PRD (v1 / weekend MVP)

*(working title — rename freely)*

## One-liner
Tell the app your stats, pick the anime-style physique you want, and get a
personalised gym plan built from 1,300+ real exercises, each with a demo GIF.

## Problem
Most fitness apps open with a dull form and a stock photo of a fitness
model, and hand you a generic plan. The goal people actually picture when
they walk into a gym is often an anime hero's build: the V-taper
warrior, the shredded ninja, the huge titan. There's no app that starts
from that picture and works back to a real, sensible training plan.

## Target user
Anime fans aged 18–30, beginner to intermediate in the gym, who are
motivated by a clear "that's the body I want" image more than by
numbers.

## Core loop
1. **Onboarding (one question per screen, anime-styled):** sex, age,
   height, current weight, target weight, current body shape, body type,
   experience level, training days per week, equipment (gym or home)
2. **Pick your arc:** swipe through original anime-style physique
   archetypes (see below), then tap one: "This is my goal."
3. **Power reveal screen:** BMI, estimated maintenance calories, daily
   calorie and protein targets, and how far you are from your target
   weight. Computed in code, not by the LLM.
4. **AI plan:** Gemini builds a weekly split using only exercises from the
   dataset, filtered to fit the chosen archetype, equipment and level
5. **Train:** open today's workout, see each exercise's GIF and steps,
   tick off sets. Progress is saved in the browser.

### Physique archetypes (original characters, no licensed IP)
| id | Name | Look | Training bias |
|---|---|---|---|
| `warrior` | The Warrior | Lean V-taper, big shoulders and back | PPL, 6–12 reps, lean bulk / recomp |
| `rival` | The Rival Prince | Compact, dense, hard-looking | Strength-focused upper/lower, 4–8 reps |
| `ninja` | The Shadow Ninja | Shredded, agile, visible abs | Full body + conditioning, cut |
| `titan` | The Titan | Maximum size | Hypertrophy PPL, 8–15 reps, bulk |
| `swordsman` | The Swordsman | Athletic, strong core and back | Full body compounds + core |
| `monk` | The Monk | Lean calisthenics physique | Bodyweight-only, recomp |

They're styled after the *feel* of shōnen heroes, but they're our own
characters with our own names and art. We never use Goku, Vegeta or any
other licensed character's name, likeness or signature look.

## V1 scope — must ship
- [ ] 10-step onboarding with progress bar, back button and input
      validation (age 18+, realistic height and weight ranges)
- [ ] Archetype picker with 6 original characters (art: placeholder
      silhouettes first, final art added in step 9 of CLAUDE.md)
- [ ] Deterministic stats: BMI, Mifflin-St Jeor BMR, TDEE, calorie and
      protein target, with safe clamps (see TECH_SPEC.md)
- [ ] Gemini-generated weekly plan that uses **only real dataset
      exercise IDs**, with automatic fallback to a template plan if the
      AI call fails or returns invalid output
- [ ] Workout view: GIF, target muscle, equipment, numbered steps,
      set checkboxes
- [ ] Profile and plan saved in localStorage; a "Regenerate plan" and a
      "Restart onboarding" button
- [ ] "© Gym visual — https://gymvisual.com/" attribution shown wherever
      exercise media appears, plus a "not medical advice" line on the
      stats screen

## Explicitly out of scope for v1
- **Real anime characters (Goku, Vegeta, etc.):** copyright and trademark
  risk, even in a portfolio app; original archetypes give the same hook
- **Accounts, cloud sync, Supabase:** it's single-user and personal, so
  localStorage is enough
- **Meal plans and food logging:** v1 only gives calorie and protein
  targets
- **Progress photos and body-fat estimation from photos:** privacy
  problems and unreliable results
- **Mobile app (Flutter):** web first; the same JSON plan format can
  feed a Flutter client later
- **Multi-language instructions:** the dataset has 10 languages but v1
  ships English only to keep the payload small
- **Monetization and app-store release:** it's a portfolio project. The
  Gym visual media would also need its own commercial license first.

## Success metric for the weekend
A new visitor on the deployed Vercel URL completes onboarding on their
phone, picks an archetype, and gets a valid weekly plan in under 10
seconds where every exercise shows a working GIF. After closing and
reopening the browser, the plan and ticked sets are still there.
