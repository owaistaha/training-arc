"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArchetypeArt } from "@/components/ArchetypeArt";
import { CountUp } from "@/components/CountUp";
import { Alert, Bolt, Refresh, Spinner } from "@/components/icons";
import { BackButton, Button, Chip, Kicker, LoadingScreen, PinnedFooter, Screen } from "@/components/ui";
import { getArchetype } from "@/lib/archetypes";
import { bmiCategory, DIRECTION_DETAIL, DIRECTION_LABEL } from "@/lib/labels";
import { requestPlan } from "@/lib/planClient";
import { OnboardedProfileSchema, profileKey, StoredPlanSchema, type Profile } from "@/lib/planSchema";
import { computeStats } from "@/lib/stats";
import { KEYS } from "@/lib/storage";
import { useRedirect, useStored } from "@/lib/useStored";

export default function RevealPage() {
  const { ready, value } = useStored(KEYS.profile, OnboardedProfileSchema);
  useRedirect(ready && !value, "/onboarding");
  useRedirect(ready && !!value && !value.archetype, "/arc");
  if (!ready || !value?.archetype) return <LoadingScreen />;
  return <Reveal profile={value as Profile} />;
}

function Reveal({ profile }: { profile: Profile }) {
  const router = useRouter();
  const stats = computeStats(profile);
  const archetype = getArchetype(profile.archetype);
  const key = profileKey(profile);

  const { ready: planLoaded, value: plan } = useStored(KEYS.plan, StoredPlanSchema);
  const planReady = !!plan && plan.profileKey === key;
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);

  const generate = () => {
    if (inflight.current) return;
    inflight.current = true;
    requestPlan(profile)
      .catch((e: Error) => setError(e.message))
      .finally(() => {
        inflight.current = false;
      });
  };

  // Start building the plan in the background while the stats animate in.
  useEffect(() => {
    if (planLoaded && !planReady && !error) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planLoaded, planReady, error]);

  const diff = Math.round((profile.targetWeightKg - profile.weightKg) * 10) / 10;
  const building = !planReady && !error;

  return (
    <div className={`min-h-dvh ${error ? "pb-72" : "pb-48"} lg:min-h-0 lg:pb-16`}>
      <Screen wide className="flex h-14 items-center pt-[env(safe-area-inset-top)] lg:mt-4">
        <BackButton href="/arc" label="Back to archetypes" />
      </Screen>

      <Screen wide className="pt-2 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-14">
        {/* Desktop only: the chosen archetype beside the numbers. Hidden (and never loaded) on phones. */}
        <figure className="glow-selected relative hidden overflow-hidden rounded-card lg:block">
          <div className="relative aspect-[3/4] bg-[radial-gradient(circle_at_50%_38%,var(--color-raised),var(--color-bg)_72%)]">
            <ArchetypeArt
              archetype={archetype}
              className="absolute inset-0 h-full w-full object-cover"
              fallbackClassName="absolute inset-x-0 top-2 h-[82%] w-full"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg from-35% to-transparent px-5 pb-4 pt-16">
              <span className="block font-display text-3xl leading-none tracking-wide text-power">{archetype.name}</span>
              <span className="mt-1 block text-sm font-medium text-fg">{archetype.tagline}</span>
            </figcaption>
          </div>
        </figure>

        <div>
          <Kicker>Power reveal</Kicker>
          <h1 className="mt-2 font-display text-[2.75rem] leading-[0.95] tracking-wide lg:text-6xl">{archetype.name}</h1>
          <p className="mt-2 text-[15px] text-muted">Your starting numbers, calculated from your stats.</p>
          <p className="sr-only" aria-live="polite">{planReady ? "Your plan is ready." : error ? "" : "Building your plan."}</p>

          <section
            aria-label="Daily calorie target"
            className="relative mt-6 overflow-hidden rounded-card border border-accent/40 bg-surface p-5"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent)_30%,transparent),transparent_70%)]"
            />
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                <Bolt className="size-4" /> Daily target
              </span>
              <Chip tone="accent">{DIRECTION_LABEL[stats.direction]}</Chip>
            </div>
            <p className="mt-3 font-display text-[5.5rem] leading-[0.85] tracking-wide">
              <CountUp value={stats.calories} className="text-power" />
            </p>
            <p className="mt-1 text-sm text-muted">kcal per day · {DIRECTION_DETAIL[stats.direction]}</p>
          </section>

          <dl className="mt-3 grid grid-cols-2 gap-3">
            <Stat label="Protein" unit="g / day">
              <CountUp value={stats.proteinG} />
            </Stat>
            <Stat label="Maintenance" unit="kcal / day">
              <CountUp value={stats.tdee} />
            </Stat>
            <Stat label="BMI" unit={bmiCategory(stats.bmi)}>
              <CountUp value={stats.bmi} decimals={1} />
            </Stat>
            <Stat label="To target" unit={diff === 0 ? "You're there" : `to ${profile.targetWeightKg} kg`}>
              {diff > 0 ? "+" : ""}
              <CountUp value={diff} decimals={Number.isInteger(diff) ? 0 : 1} />
              <span className="ml-1 text-2xl text-muted">kg</span>
            </Stat>
          </dl>

          {stats.warnings.map((w) => (
            <p key={w} className="mt-3 flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2.5 text-sm text-fg">
              <Alert className="mt-0.5 size-4 shrink-0 text-warn" />
              {w} Consider talking to a professional before chasing it.
            </p>
          ))}

        <PinnedFooter desktop="inline" className="lg:mx-0 lg:mt-6 lg:max-w-none lg:px-0">
          {error && (
            <div role="alert" className="mb-3 flex items-center gap-3 rounded-card border border-warn/40 bg-surface p-3">
              <Alert className="size-5 shrink-0 text-warn" />
              <p className="flex-1 text-sm leading-snug text-fg">{error}</p>
              <Button variant="secondary" onClick={() => setError(null)} className="shrink-0">
                <Refresh className="size-4" /> Retry
              </Button>
            </div>
          )}
          <Button size="lg" disabled={!planReady} onClick={() => router.push("/plan")}>
            {building ? (
              <>
                <Spinner /> Building your plan…
              </>
            ) : (
              "See my training plan"
            )}
          </Button>
          <p className="mt-2 text-center text-[11px] leading-snug text-muted">
            Not medical advice. These are estimates. If you have health conditions, check with a professional first.
          </p>
        </PinnedFooter>
        </div>
      </Screen>
    </div>
  );
}

function Stat({ label, unit, children }: { label: string; unit: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className="mt-1.5 font-display text-[2.6rem] leading-none tracking-wide text-fg">{children}</dd>
      <dd className="mt-1 text-xs text-muted">{unit}</dd>
    </div>
  );
}
