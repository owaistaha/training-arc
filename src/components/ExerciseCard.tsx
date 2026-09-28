"use client";

import { formatRest } from "@/lib/labels";
import { GYM_VISUAL_URL, MEDIA_SIZE, mediaUrl } from "@/lib/media";
import type { ExerciseInfo, PlanExercise } from "@/lib/planSchema";
import { ChevronRight } from "./icons";
import { SetTicker } from "./SetTicker";
import { Chip } from "./ui";

interface ExerciseCardProps {
  index: number;
  info: ExerciseInfo | undefined;
  prescription: PlanExercise;
  done: boolean[];
  onToggle: (setIndex: number) => void;
  defaultOpen?: boolean;
}

export function ExerciseCard({ index, info, prescription: p, done, onToggle, defaultOpen }: ExerciseCardProps) {
  const name = info?.name ?? "Exercise";
  const complete = done.filter(Boolean).length >= p.sets;

  return (
    <article
      data-exercise-id={p.exerciseId}
      className={`rounded-card border bg-surface p-4 transition-colors ${complete ? "border-electric/50" : "border-line"}`}
    >
      <header className="flex items-start gap-3">
        <span className="font-display text-2xl leading-7 tracking-wider text-muted">{String(index + 1).padStart(2, "0")}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold capitalize leading-7 text-fg">{name}</h2>
          {info && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Chip tone="accent">
                <span className="capitalize">{info.target}</span>
              </Chip>
              <Chip>
                <span className="capitalize">{info.equipment}</span>
              </Chip>
            </div>
          )}
        </div>
      </header>

      {info && (
        // Desktop: GIF on the left, the steps beside it (always open). Phones: GIF centred, steps collapsible below.
        <div className="mt-4 lg:grid lg:grid-cols-[180px_minmax(0,1fr)] lg:items-start lg:gap-5">
          <figure className="mx-auto lg:mx-0" style={{ width: MEDIA_SIZE }}>
            <div className="overflow-hidden rounded-xl bg-white" style={{ width: MEDIA_SIZE, height: MEDIA_SIZE }}>
              {/* Plain <img> on purpose: next/image would resize Gym visual media (breaks the 180×180 terms). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(info.gif)}
                alt={`${name} demonstration`}
                width={MEDIA_SIZE}
                height={MEDIA_SIZE}
                loading={index < 2 ? "eager" : "lazy"}
                decoding="async"
                className="block"
              />
            </div>
            <figcaption className="mt-1.5 text-center text-[11px] leading-4 text-muted">
              © Gym visual —{" "}
              <a href={GYM_VISUAL_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-line underline-offset-2">
                https://gymvisual.com/
              </a>
            </figcaption>
          </figure>
          {info.steps.length > 0 && (
            <div className="hidden lg:block">
              <h3 className="text-sm font-medium text-fg">How to do it</h3>
              <Steps steps={info.steps} className="mt-2" />
            </div>
          )}
        </div>
      )}

      <dl className="mt-4 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-raised text-center">
        <div className="px-2 py-2.5">
          <dt className="text-[11px] uppercase tracking-wider text-muted">Sets</dt>
          <dd className="font-display text-2xl leading-7 tracking-wide">{p.sets}</dd>
        </div>
        <div className="px-2 py-2.5">
          <dt className="text-[11px] uppercase tracking-wider text-muted">Reps</dt>
          <dd className="font-display text-2xl leading-7 tracking-wide">{p.reps}</dd>
        </div>
        <div className="px-2 py-2.5">
          <dt className="text-[11px] uppercase tracking-wider text-muted">Rest</dt>
          <dd className="font-display text-2xl leading-7 tracking-wide">{formatRest(p.restSec)}</dd>
        </div>
      </dl>

      {p.note && <p className="mt-3 border-l-2 border-accent pl-3 text-sm leading-snug text-fg/90">{p.note}</p>}

      <div className="mt-4">
        <SetTicker exerciseName={name} sets={p.sets} reps={p.reps} done={done} onToggle={onToggle} />
      </div>

      {info && info.steps.length > 0 && (
        <details className="group mt-4 rounded-xl border border-line lg:hidden" open={defaultOpen}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden">
            How to do it
            <ChevronRight className="size-4 rotate-90 text-muted transition-transform group-open:-rotate-90" />
          </summary>
          <Steps steps={info.steps} className="px-3 pb-3" />
        </details>
      )}
    </article>
  );
}

function Steps({ steps, className = "" }: { steps: string[]; className?: string }) {
  return (
    <ol className={`space-y-2 text-sm leading-relaxed text-muted ${className}`}>
      {steps.map((step, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="font-display text-base leading-6 text-gold">{i + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}
