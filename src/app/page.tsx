"use client";

import { ArchetypeArt } from "@/components/ArchetypeArt";
import { SiteFooter } from "@/components/SiteFooter";
import { ButtonLink, PinnedFooter, Screen } from "@/components/ui";
import { getArchetype } from "@/lib/archetypes";
import { StoredPlanSchema } from "@/lib/planSchema";
import { KEYS } from "@/lib/storage";
import { useStored } from "@/lib/useStored";

// Soft radial mask so each image's background rectangle melts into the page.
const MASK = "[mask-image:radial-gradient(ellipse_52%_60%_at_50%_42%,black_55%,transparent_100%)]";

export default function Home() {
  const { value: plan } = useStored(KEYS.plan, StoredPlanSchema);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[460px] bg-[radial-gradient(ellipse_at_50%_75%,color-mix(in_srgb,var(--color-accent)_18%,transparent),transparent_65%)]"
      />

      <Screen className="relative pt-[max(2rem,env(safe-area-inset-top))]">
        <p className="font-display text-lg tracking-[0.3em] text-muted">Training Arc</p>
        <h1 className="mt-5 font-display text-[3.5rem] leading-[0.9] tracking-wide">
          Pick the physique.
          <br />
          <span className="text-power">Start your arc.</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Tell us your stats, choose an original anime-style archetype, and get a real weekly gym plan built from
          1,300+ exercises, each with a demo GIF.
        </p>

        <ul className="mt-5 grid grid-cols-3 gap-2 text-center">
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
        <p className="mt-3 text-center text-xs text-muted">Free · no account · saved on this device only</p>
      </Screen>

      {/* Character strip: sits at the bottom, behind the pinned CTA. Decorative. */}
      <div aria-hidden data-landing-art className="relative mx-auto mt-2 w-full max-w-md flex-1" style={{ minHeight: 300 }}>
        <div className="absolute inset-x-0 bottom-0 h-[320px]">
          <ArchetypeArt
            archetype={getArchetype("ninja")}
            decorative
            className={`absolute bottom-10 left-[-9%] h-[74%] w-auto opacity-70 ${MASK}`}
          />
          <ArchetypeArt
            archetype={getArchetype("titan")}
            decorative
            className={`absolute bottom-10 right-[-9%] h-[74%] w-auto opacity-70 ${MASK}`}
          />
          <ArchetypeArt
            archetype={getArchetype("warrior")}
            decorative
            eager
            className={`absolute bottom-0 left-1/2 h-full w-auto -translate-x-1/2 ${MASK}`}
          />
        </div>
      </div>

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
        <SiteFooter className="mt-3" />
      </PinnedFooter>
    </div>
  );
}
