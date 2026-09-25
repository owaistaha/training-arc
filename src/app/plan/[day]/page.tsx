"use client";

import { useParams } from "next/navigation";
import { ExerciseCard } from "@/components/ExerciseCard";
import { Check } from "@/components/icons";
import { BackButton, ButtonLink, Kicker, LoadingScreen, ProgressBar, Screen } from "@/components/ui";
import { estimateMinutes } from "@/lib/labels";
import { todayKey } from "@/lib/planClient";
import { LogSchema, StoredPlanSchema, type StoredPlan, type WorkoutLog } from "@/lib/planSchema";
import { KEYS, writeJSON } from "@/lib/storage";
import { useRedirect, useStored } from "@/lib/useStored";

export default function DayPage() {
  const params = useParams<{ day: string }>();
  const plan = useStored(KEYS.plan, StoredPlanSchema);
  const log = useStored(KEYS.log, LogSchema);
  const dayIndex = Number(params.day) - 1;
  const validDay = !!plan.value && Number.isInteger(dayIndex) && dayIndex >= 0 && dayIndex < plan.value.plan.days.length;

  useRedirect(plan.ready && !plan.value, "/onboarding");
  useRedirect(plan.ready && !!plan.value && !validDay, "/plan");
  if (!plan.ready || !log.ready || !plan.value || !validDay) return <LoadingScreen />;

  return <Workout plan={plan.value} dayIndex={dayIndex} log={log.value ?? {}} />;
}

function Workout({ plan, dayIndex, log }: { plan: StoredPlan; dayIndex: number; log: WorkoutLog }) {
  const day = plan.plan.days[dayIndex];
  const total = plan.plan.days.length;
  const date = todayKey();
  const dayLog = log[date]?.[String(dayIndex)] ?? {};

  const toggle = (exerciseId: string, sets: number, setIndex: number) => {
    const current = Array.from({ length: sets }, (_, i) => !!dayLog[exerciseId]?.[i]);
    current[setIndex] = !current[setIndex];
    const next: WorkoutLog = {
      ...log,
      [date]: { ...log[date], [String(dayIndex)]: { ...dayLog, [exerciseId]: current } },
    };
    writeJSON(KEYS.log, next);
  };

  const totalSets = day.exercises.reduce((n, e) => n + e.sets, 0);
  const doneSets = day.exercises.reduce((n, e) => n + Math.min(e.sets, (dayLog[e.exerciseId] ?? []).filter(Boolean).length), 0);
  const complete = doneSets >= totalSets;

  return (
    <div className="min-h-dvh pb-16">
      <header className="sticky top-0 z-10 border-b border-line/60 bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <Screen className="flex h-14 items-center gap-3">
          <BackButton href="/plan" label="Back to week" />
          <ProgressBar value={doneSets / totalSets} label="Sets completed today" className="flex-1" />
          <span className="text-sm tabular-nums text-muted" aria-hidden>
            {doneSets}/{totalSets}
          </span>
        </Screen>
      </header>

      <Screen className="pt-5">
        <Kicker>
          Day {dayIndex + 1} of {total}
        </Kicker>
        <h1 className="mt-1 font-display text-[2.75rem] leading-[0.95] tracking-wide">{day.name}</h1>
        <p className="mt-1 text-[15px] capitalize text-muted">{day.focus}</p>
        <p className="mt-1 text-xs text-muted">
          {day.exercises.length} exercises · {totalSets} sets · ~{estimateMinutes(day.exercises)} min
        </p>

        {complete && (
          <p className="mt-4 flex items-center gap-2 rounded-card border border-electric/50 bg-electric/10 px-4 py-3 text-sm font-medium text-fg" role="status">
            <Check className="size-5 text-electric" /> Day complete. Refuel and rest up.
          </p>
        )}

        <div className="mt-5 flex flex-col gap-4">
          {day.exercises.map((ex, i) => (
            <ExerciseCard
              key={`${ex.exerciseId}-${i}`}
              index={i}
              info={plan.exercises[ex.exerciseId]}
              prescription={ex}
              done={dayLog[ex.exerciseId] ?? []}
              onToggle={(s) => toggle(ex.exerciseId, ex.sets, s)}
              defaultOpen={i === 0}
            />
          ))}
        </div>

        <nav className="mt-8 grid grid-cols-2 gap-3" aria-label="Other days">
          {dayIndex > 0 ? (
            <ButtonLink href={`/plan/${dayIndex}`} variant="secondary" className="h-12">
              ← Day {dayIndex}
            </ButtonLink>
          ) : (
            <span />
          )}
          {dayIndex < total - 1 ? (
            <ButtonLink href={`/plan/${dayIndex + 2}`} variant="secondary" className="h-12">
              Day {dayIndex + 2} →
            </ButtonLink>
          ) : (
            <ButtonLink href="/plan" variant="secondary" className="h-12">
              Back to week
            </ButtonLink>
          )}
        </nav>
      </Screen>
    </div>
  );
}
