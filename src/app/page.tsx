"use client";

import { ArchetypeArt } from "@/components/ArchetypeArt";
import { SiteFooter } from "@/components/SiteFooter";
import { ButtonLink, PinnedFooter, Screen } from "@/components/ui";
import { ARCHETYPES, getArchetype } from "@/lib/archetypes";
import { StoredPlanSchema } from "@/lib/planSchema";
import { KEYS } from "@/lib/storage";
import { useStored } from "@/lib/useStored";

export default function Home() {
  const { value: plan } = useStored(KEYS.plan, StoredPlanSchema);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip lg:min-h-[calc(100dvh-4rem)]">
      {/* Phones: warm glow behind the character strip. Desktop: glow behind the roster. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[460px] bg-[radial-gradient(ellipse_at_50%_75%,color-mix(in_srgb,var(--color-accent)_18%,transparent),transparent_65%)] lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-3/5 lg:bg-[radial-gradient(ellipse_at_55%_50%,color-mix(in_srgb,var(--color-accent)_14%,transparent),transparent_65%)]"
      />

      <div className="relative flex flex-1 flex-col lg:mx-auto lg:grid lg:w-full lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16 lg:px-10 lg:py-10">
        <div>
          <Screen className="relative pt-[max(2rem,env(safe-area-inset-top))] lg:mx-0 lg:max-w-xl lg:px-0 lg:pt-0">
            <p className="font-display text-lg tracking-[0.3em] text-muted lg:hidden">Training Arc</p>
            <h1 className="mt-5 lg:mt-0 font-display text-[3.5rem] leading-[0.9] tracking-wide lg:text-[5.5rem]">
              Pick the physique.
              <br />
              <span className="text-power">Start your arc.</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted lg:mt-6 lg:max-w-lg lg:text-lg">
              Tell us your stats, choose an original anime-style archetype, and get a real weekly gym plan built from
              1,300+ exercises, each with a demo GIF.
            </p>

            <ul className="mt-5 grid grid-cols-3 gap-2 text-center lg:mt-8 lg:max-w-md lg:gap-3">
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
            <p className="mt-3 text-center text-xs text-muted lg:max-w-md">Free · no account · saved on this device only</p>
          </Screen>

          {/* Pinned over the character strip on phones; a normal block under the text on desktop. */}
          <PinnedFooter desktop="inline" className="lg:mx-0 lg:px-0">
            <div className="lg:mt-8 lg:max-w-md">
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
              <SiteFooter className="mt-3 lg:mt-5" />
            </div>
          </PinnedFooter>
        </div>

        {/* Phones and tablets: character strip at the bottom, behind the pinned CTA. Decorative. */}
        <div aria-hidden data-landing-art className="relative mx-auto mt-2 w-full max-w-md flex-1 lg:hidden" style={{ minHeight: 300 }}>
          <div className="absolute inset-x-0 bottom-0 h-[320px]">
            <ArchetypeArt
              archetype={getArchetype("ninja")}
              decorative
              className="art-fade absolute bottom-10 left-[-9%] h-[74%] w-auto opacity-70"
            />
            <ArchetypeArt
              archetype={getArchetype("titan")}
              decorative
              className="art-fade absolute bottom-10 right-[-9%] h-[74%] w-auto opacity-70"
            />
            <ArchetypeArt
              archetype={getArchetype("warrior")}
              decorative
              eager
              className="art-fade absolute bottom-0 left-1/2 h-full w-auto -translate-x-1/2"
            />
          </div>
        </div>

        {/*
          Desktop: all six archetypes as a staggered 3×2 roster. Decorative (the arc picker is where you choose).
          Hidden below lg, so its lazy images never load on phones; the one eager image is the Warrior, the
          same file the phone strip loads eagerly, so the browser fetches it once.
        */}
        <div aria-hidden data-landing-roster className="hidden lg:block">
          <ul className="grid grid-cols-3 gap-4 pb-8">
            {ARCHETYPES.map((a, i) => (
              <li key={a.id} className={i % 3 === 1 ? "translate-y-8" : ""}>
                <div className="relative aspect-[3/4] overflow-hidden rounded-card border border-line bg-surface">
                  <ArchetypeArt
                    archetype={a}
                    decorative
                    eager={i === 0}
                    className="absolute inset-0 h-full w-full object-cover"
                    fallbackClassName="absolute inset-x-0 top-2 h-[82%] w-full"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg from-30% to-transparent px-3 pb-2.5 pt-10">
                    <p className="font-display text-xl leading-none tracking-wide text-fg">{a.name}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
