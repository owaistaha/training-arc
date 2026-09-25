"use client";

import { Silhouette } from "@/components/Silhouette";
import { ButtonLink, PinnedFooter, Screen } from "@/components/ui";
import { StoredPlanSchema } from "@/lib/planSchema";
import { KEYS } from "@/lib/storage";
import { useStored } from "@/lib/useStored";

export default function Home() {
  const { value: plan } = useStored(KEYS.plan, StoredPlanSchema);

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_50%_20%,color-mix(in_srgb,var(--color-accent)_22%,transparent),transparent_65%)]"
      />
      <Screen className="relative pb-44 pt-[max(2rem,env(safe-area-inset-top))]">
        <p className="font-display text-lg tracking-[0.3em] text-muted">Training Arc</p>

        <div className="relative mx-auto mt-6 flex h-64 items-end justify-center" aria-hidden>
          <Silhouette archetype="ninja" className="absolute -left-2 bottom-0 h-52 opacity-50" />
          <Silhouette archetype="titan" className="absolute -right-2 bottom-0 h-52 opacity-50" />
          <Silhouette archetype="warrior" className="relative h-64" />
        </div>

        <h1 className="mt-6 font-display text-[3.5rem] leading-[0.9] tracking-wide">
          Pick the physique.
          <br />
          <span className="text-power">Start your arc.</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Tell us your stats, choose an original anime-style archetype, and get a real weekly gym plan built from
          1,300+ exercises, each with a demo GIF.
        </p>

        <ul className="mt-6 grid grid-cols-3 gap-2 text-center">
          {[
            ["6", "archetypes"],
            ["1,324", "exercises"],
            ["0", "sign-ups"],
          ].map(([n, label]) => (
            <li key={label} className="rounded-card border border-line bg-surface px-2 py-3">
              <span className="block font-display text-3xl leading-none tracking-wide text-fg">{n}</span>
              <span className="mt-1 block text-xs text-muted">{label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-center text-xs text-muted">Free · no account · saved on this device only</p>
      </Screen>

      <PinnedFooter>
        {plan ? (
          <div className="flex flex-col gap-2">
            <ButtonLink href="/plan" size="lg">
              Continue your arc
            </ButtonLink>
            <ButtonLink href="/onboarding" variant="ghost">
              Start a new arc
            </ButtonLink>
          </div>
        ) : (
          <ButtonLink href="/onboarding" size="lg">
            Start your arc
          </ButtonLink>
        )}
      </PinnedFooter>
    </div>
  );
}
