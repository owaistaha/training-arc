"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArchetypeArt } from "@/components/ArchetypeArt";
import { Check, ChevronRight, Refresh, Spinner } from "@/components/icons";
import { SiteFooter } from "@/components/SiteFooter";
import { Button, Chip, Kicker, LoadingScreen, ProgressBar, Screen } from "@/components/ui";
import { getArchetype } from "@/lib/archetypes";
import { estimateMinutes } from "@/lib/labels";
import { requestPlan, todayKey } from "@/lib/planClient";
import { LogSchema, OnboardedProfileSchema, StoredPlanSchema, type Profile, type StoredPlan, type WorkoutLog } from "@/lib/planSchema";
import { KEYS, removeKeys } from "@/lib/storage";
import { useRedirect, useStored } from "@/lib/useStored";

export default function PlanPage() {
  const plan = useStored(KEYS.plan, StoredPlanSchema);
  const profile = useStored(KEYS.profile, OnboardedProfileSchema);
  const log = useStored(KEYS.log, LogSchema);
  const ready = plan.ready && profile.ready;
  const hasFullProfile = !!profile.value?.archetype;

  useRedirect(ready && !plan.value && hasFullProfile, "/reveal");
  useRedirect(ready && !plan.value && !hasFullProfile, "/onboarding");
  if (!ready || !plan.value) return <LoadingScreen />;

  return (
    <WeekView
      plan={plan.value}
      profile={hasFullProfile ? (profile.value as Profile) : null}
      log={log.value ?? {}}
    />
  );
}

function WeekView({ plan, profile, log }: { plan: StoredPlan; profile: Profile | null; log: WorkoutLog }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const today = log[todayKey()] ?? {};

  const regenerate = async () => {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      await requestPlan(profile);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    if (!confirmRestart) {
      setConfirmRestart(true);
      return;
    }
    removeKeys(KEYS.profile, KEYS.plan, KEYS.log);
    router.push("/onboarding");
  };

  const [titleMain, titleSub] = plan.plan.title.split(" — ");
  const archetype = profile ? getArchetype(profile.archetype) : null;

  return (
    <div className="min-h-dvh pb-16 pt-[max(1.5rem,env(safe-area-inset-top))] lg:min-h-0 lg:pt-10">
      {/*
        Phones: one column (header → days → actions → credits).
        Desktop: a header band (portrait, title, stats | actions) above a full-width week where every
        day lists its exercises.
      */}
      <Screen wide className="lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-10">
        {/* Desktop band: portrait + title on the left (spans 2 rows); stats, then actions, on the right. */}
        <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:flex lg:items-end lg:gap-6 lg:self-end">
          {archetype && (
            <div className="hidden h-36 w-27 shrink-0 overflow-hidden rounded-card border border-line bg-surface xl:block">
              <ArchetypeArt archetype={archetype} decorative className="h-full w-full object-cover" fallbackClassName="h-full w-full" />
            </div>
          )}
          <div className="lg:min-w-0">
            <div className="flex items-center justify-between lg:justify-start lg:gap-3">
              <Kicker>Your weekly plan</Kicker>
              {plan.source === "ai" ? <Chip tone="electric">AI coach plan</Chip> : <Chip>Classic split</Chip>}
            </div>
            <h1 className="mt-2 font-display text-[2.75rem] leading-[0.95] tracking-wide lg:text-6xl">
              {titleMain}
              {titleSub && (
                <>
                  <span className="sr-only"> — </span>
                  <span className="block text-2xl tracking-widest text-muted">{titleSub}</span>
                </>
              )}
            </h1>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-3 divide-x divide-line rounded-card border border-line bg-surface text-center lg:col-start-2 lg:row-start-1 lg:mt-0 lg:self-end">
          {[
            ["Calories", plan.stats.calories.toLocaleString("en-US"), "kcal"],
            ["Protein", String(plan.stats.proteinG), "g"],
            ["Training", String(plan.plan.days.length), "days"],
          ].map(([label, n, unit]) => (
            <div key={label} className="px-2 py-3 lg:px-6 lg:py-4">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</dt>
              <dd className="mt-0.5 font-display text-3xl leading-none tracking-wide lg:text-4xl">
                {n}
                <span className="ml-1 font-sans text-xs font-normal tracking-normal text-muted">{unit}</span>
              </dd>
            </div>
          ))}
        </dl>

        {plan.source === "template" && (
          <p className="mt-3 text-xs leading-relaxed text-muted lg:col-span-2 lg:row-start-3 lg:mt-4">
            Our AI coach was busy, so this is a hand-built split using the same exercise pool. You can regenerate it
            later.
          </p>
        )}

        <ol className={`mt-6 flex flex-col gap-3 lg:col-span-2 lg:row-start-4 lg:mt-8 lg:grid lg:gap-4 ${DAY_COLS[plan.plan.days.length] ?? "lg:grid-cols-3"}`}>
          {plan.plan.days.map((day, i) => {
            const sets = day.exercises.reduce((n, e) => n + e.sets, 0);
            const dayLog = today[String(i)] ?? {};
            const doneSets = day.exercises.reduce(
              (n, e) => n + Math.min(e.sets, (dayLog[e.exerciseId] ?? []).filter(Boolean).length),
              0,
            );
            const complete = doneSets >= sets;
            return (
              <li key={i}>
                {/* Phones: compact row. Desktop: a full day card with its exercise list. */}
                <Link
                  href={`/plan/${i + 1}`}
                  className={`group flex h-full items-center gap-4 rounded-card border bg-surface p-4 transition-colors hover:border-muted/40 lg:flex-col lg:items-stretch lg:gap-0 lg:p-5 ${
                    complete ? "border-electric/60" : "border-line"
                  }`}
                >
                  <span className="flex w-12 shrink-0 flex-col items-center lg:w-auto lg:flex-row lg:items-baseline lg:gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Day</span>
                    <span className="font-display text-4xl leading-none text-power">{i + 1}</span>
                  </span>
                  <span className="min-w-0 flex-1 lg:mt-2 lg:flex-none">
                    <span className="block font-display text-2xl leading-tight tracking-wide text-fg lg:text-3xl">{day.name}</span>
                    <span className="block truncate text-sm capitalize text-muted lg:whitespace-normal">{day.focus}</span>
                    <span className="mt-1 block text-xs text-muted">
                      {day.exercises.length} exercises · {sets} sets · ~{estimateMinutes(day.exercises)} min
                    </span>
                    {doneSets > 0 && !complete && (
                      <span className="mt-2 flex items-center gap-2">
                        <ProgressBar value={doneSets / sets} label={`Day ${i + 1} progress today`} className="flex-1" />
                        <span className="text-xs tabular-nums text-muted">
                          {doneSets}/{sets}
                        </span>
                      </span>
                    )}
                  </span>
                  <ul data-day-exercises className="mt-4 hidden space-y-2 border-t border-line pt-4 lg:block">
                    {day.exercises.map((e, j) => (
                      <li key={j} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 capitalize text-fg">{plan.exercises[e.exerciseId]?.name ?? "Exercise"}</span>
                        <span className="shrink-0 tabular-nums text-muted">
                          {e.sets} × {e.reps}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <span className="mt-auto hidden items-center justify-between border-t border-line pt-4 text-sm font-medium lg:mt-5 lg:flex">
                    {complete ? (
                      <span className="flex items-center gap-2 text-fg">
                        <Check className="size-4 text-electric" /> Done today
                      </span>
                    ) : (
                      <span className="text-gold">Open workout</span>
                    )}
                    <ChevronRight className="size-5 text-muted transition-transform group-hover:translate-x-0.5" />
                  </span>
                  {complete ? (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-electric text-fg lg:hidden" aria-label="Done today">
                      <Check className="size-4" />
                    </span>
                  ) : (
                    <ChevronRight className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 lg:hidden" />
                  )}
                </Link>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 flex flex-col gap-2 lg:col-start-2 lg:row-start-2 lg:mt-3 lg:flex-row-reverse lg:flex-wrap lg:items-center">
          {profile && (
            <Button variant="secondary" onClick={regenerate} disabled={busy} className="h-12 w-full lg:h-11 lg:flex-1">
              {busy ? <Spinner className="size-4" /> : <Refresh className="size-4" />}
              {busy ? "Regenerating…" : "Regenerate plan"}
            </Button>
          )}
          {error && (
            <p role="alert" className="text-center text-sm text-gold lg:order-first lg:basis-full lg:text-right">
              {error}
            </p>
          )}
          <Button
            variant="ghost"
            onClick={restart}
            className="h-12 w-full lg:h-11 lg:w-auto"
            onBlur={() => setConfirmRestart(false)}
          >
            {confirmRestart ? "Tap again to wipe everything and restart" : "Restart onboarding"}
          </Button>
        </div>
        <SiteFooter className="mt-8 lg:col-span-2 lg:row-start-5 lg:mt-12 lg:text-left" />
      </Screen>
    </div>
  );
}

/** Desktop week columns by number of training days (literal classes so Tailwind generates them). */
const DAY_COLS: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-2 xl:grid-cols-4",
  5: "lg:grid-cols-3",
  6: "lg:grid-cols-3",
};
