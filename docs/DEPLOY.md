# Deploying Training Arc to Vercel (Hobby)

Two parts: **what only you can do** (accounts and secrets), then **what
Claude Code runs** once those are done.

---

## Part 1: your steps

### 1. Confirm the Vercel account
The Vercel CLI on this Mac is **already logged in as `engr-owais`**
(`vercel whoami`).

- If that's the account you want: nothing to do.
- If not: run `vercel logout`, then `vercel login` and finish the browser sign-in.

Vercel Hobby is free but **non-commercial only**, which fits a portfolio
project. Monetising later means moving to Pro (and licensing the Gym visual
media).

### 2. Say "go" for the project link
Claude Code runs `vercel link` (Part 2, step 2). That creates the Vercel
project `training-arc` under your account, and the next step needs it.

### 3. Add `GEMINI_API_KEY` to the Vercel project
It's server-only: **never** name it `NEXT_PUBLIC_…`. Pick one option:

- **Dashboard:** vercel.com → project **training-arc** → Settings →
  Environment Variables → add:

  | Key | Value | Environments |
  |---|---|---|
  | `GEMINI_API_KEY` | your key from aistudio.google.com | Production, Preview |
  | `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Production, Preview (optional; the code uses this by default) |

- **CLI, run by Claude Code with your approval:** it reads the value from your
  local `.env.local` and pipes it straight into
  `vercel env add GEMINI_API_KEY production` (and `preview`). The key never
  goes into git, logs or chat.

**Recommended first:** rotate the key in AI Studio before going public. An
earlier copy sat in `.env.example` (never committed, but worth rotating if
that file was ever shared). Put the new key in both `.env.local` and Vercel.

### 4. After the production deploy: test on your phone
This is the definition of done from `CLAUDE.md`:

- [ ] Open the production URL on your phone.
- [ ] Complete onboarding, pick an archetype, and get a plan in **under 10 s**.
- [ ] Every exercise shows a working GIF.
- [ ] Tick a few sets, **close the browser completely**, reopen it: the plan
      and ticks are still there.

---

## Part 2: what Claude Code runs (after steps 1–3)

1. **Pre-flight (local):** `npm run lint`, `npx tsc --noEmit`,
   `npm run test:e2e`, and a check that the built client bundle doesn't
   contain the API key.
2. **Link:** `vercel link --yes --project training-arc`. This writes `.vercel/`,
   which is gitignored. `.vercelignore` keeps `.env*`, `art-raw/` and test
   output out of uploads.
3. **Check env:** `vercel env ls` shows `GEMINI_API_KEY` in Production and
   Preview. Names only; values are never printed.
4. **Preview deploy:** `vercel deploy` gives a preview URL. The build runs
   `prebuild`, which downloads and slims the exercise dataset from the pinned
   GitHub commit.
5. **Smoke test the deployed site:**
   - `PLAYWRIGHT_BASE_URL=<url> npm run test:e2e`: the full flow at 375 px
     with `/api/plan` mocked, plus every page, the art, the GIFs and
     persistence against the real deployment.
   - `PLAYWRIGHT_BASE_URL=<url> npm run test:live`: one real Gemini plan
     through the deployed `/api/plan` (`source: "ai"`, under 10 s, valid IDs,
     GIFs load).
   - `curl` checks on `/api/plan`: 400 for a bad profile, 413 for a body over
     4 KB, and no key in any response.
   - If preview deployments are behind Vercel Authentication, these tests
     can't reach them. In that case they run against production straight
     after step 6.
6. **Production:** `vercel deploy --prod`, then the same smoke tests against
   the production URL.
7. **Report back** with the production URL, test results and plan latency,
   and hand over to you for the phone check (step 4).

### If something goes wrong
- **Plans always show "Classic split"** (template, not AI): the key is missing
  or wrong in Vercel. Check `vercel env ls` and redeploy after fixing it.
  A 429 from the free tier also falls back to the template; that's expected,
  not an error.
- **Build fails in `prebuild`:** GitHub raw was unreachable during the build.
  Redeploy.
