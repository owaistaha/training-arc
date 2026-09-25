"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ChevronRight, Refresh, Spinner } from "@/components/icons";
import { Button, Chip, Kicker, LoadingScreen, ProgressBar, Screen } from "@/components/ui";
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

  return (
    <div className="min-h-dvh pb-16 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <Screen>
        <div className="flex items-center justify-between">
          <Kicker>Your weekly plan</Kicker>
          {plan.source === "ai" ? <Chip tone="electric">AI coach plan</Chip> : <Chip>Classic split</Chip>}
        </div>
        <h1 className="mt-2 font-display text-[2.75rem] leading-[0.95] tracking-wide">
          {plan.plan.title.split(" — ")[0]}
          {plan.plan.title.includes(" — ") && (
            <>
              <span className="sr-only"> — </span>
              <span className="block text-2xl tracking-widest text-muted">{plan.plan.title.split(" — ")[1]}</span>
            </>
          )}
        </h1>

        <dl className="mt-5 grid grid-cols-3 divide-x divide-line rounded-card border border-line bg-surface text-center">
          {[
            ["Calories", plan.stats.calories.toLocaleString("en-US"), "kcal"],
            ["Protein", String(plan.stats.proteinG), "g"],
            ["Training", String(plan.plan.days.length), "days"],
          ].map(([label, n, unit]) => (
            <div key={label} className="px-2 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</dt>
              <dd className="mt-0.5 font-display text-3xl leading-none tracking-wide">
                {n}
                <span className="ml-1 font-sans text-xs font-normal tracking-normal text-muted">{unit}</span>
              </dd>
            </div>
          ))}
        </dl>

        {plan.source === "template" && (
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Our AI coach was busy, so this is a hand-built split using the same exercise pool. You can regenerate it
            later.
          </p>
        )}

        <ol className="mt-6 flex flex-col gap-3">
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
                <Link
                  href={`/plan/${i + 1}`}
                  className={`group flex items-center gap-4 rounded-card border bg-surface p-4 transition-colors hover:border-muted/40 ${
                    complete ? "border-electric/60" : "border-line"
                  }`}
                >
                  <span className="flex w-12 shrink-0 flex-col items-center">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Day</span>
                    <span className="font-display text-4xl leading-none text-power">{i + 1}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-2xl leading-tight tracking-wide text-fg">{day.name}</span>
                    <span className="block truncate text-sm capitalize text-muted">{day.focus}</span>
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
                  {complete ? (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-electric text-fg" aria-label="Done today">
                      <Check className="size-4" />
                    </span>
                  ) : (
                    <ChevronRight className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
                  )}
                </Link>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 flex flex-col gap-2">
          {profile && (
            <Button variant="secondary" onClick={regenerate} disabled={busy} className="h-12 w-full">
              {busy ? <Spinner className="size-4" /> : <Refresh className="size-4" />}
              {busy ? "Regenerating…" : "Regenerate plan"}
            </Button>
          )}
          {error && (
            <p role="alert" className="text-center text-sm text-gold">
              {error}
            </p>
          )}
          <Button variant="ghost" onClick={restart} className="h-12 w-full" onBlur={() => setConfirmRestart(false)}>
            {confirmRestart ? "Tap again to wipe everything and restart" : "Restart onboarding"}
          </Button>
        </div>
      </Screen>
    </div>
  );
}
