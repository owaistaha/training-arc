"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArchetypeCard } from "@/components/ArchetypeCard";
import { SiteFooter } from "@/components/SiteFooter";
import { BackButton, Button, Kicker, LoadingScreen, PinnedFooter, Screen } from "@/components/ui";
import { ARCHETYPES, type Archetype, type ArchetypeId } from "@/lib/archetypes";
import { OnboardedProfileSchema, type OnboardedProfile } from "@/lib/planSchema";
import { KEYS, writeJSON } from "@/lib/storage";
import { useRedirect, useStored } from "@/lib/useStored";

export default function ArcPage() {
  const { ready, value } = useStored(KEYS.profile, OnboardedProfileSchema);
  useRedirect(ready && !value, "/onboarding");
  if (!ready || !value) return <LoadingScreen />;
  return <ArcPicker profile={value} />;
}

function noteFor(a: Archetype, profile: OnboardedProfile): string | undefined {
  if (a.equipment === "gym" && profile.equipment === "home") return "Built for the gym. We'll adapt it for home.";
  if (a.equipment === "bodyweight") return "Bodyweight only, wherever you train.";
  return undefined;
}

function ArcPicker({ profile }: { profile: OnboardedProfile }) {
  const router = useRouter();
  const [selected, setSelected] = useState<ArchetypeId | undefined>(profile.archetype);
  const [active, setActive] = useState(() => Math.max(0, ARCHETYPES.findIndex((a) => a.id === profile.archetype)));
  const scroller = useRef<HTMLDivElement>(null);

  // Returning users: bring their previous pick into view.
  useEffect(() => {
    if (!profile.archetype) return;
    const el = scroller.current?.querySelector<HTMLElement>(`[data-archetype="${profile.archetype}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [profile.archetype]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    cards.forEach((c, i) => {
      if (Math.abs(c.offsetLeft + c.offsetWidth / 2 - center) < Math.abs(cards[best].offsetLeft + cards[best].offsetWidth / 2 - center)) best = i;
    });
    if (best !== active) setActive(best);
  };

  const confirm = () => {
    if (!selected) return;
    writeJSON(KEYS.profile, { ...profile, archetype: selected });
    router.push("/reveal");
  };

  const chosen = ARCHETYPES.find((a) => a.id === selected);

  return (
    <div className="min-h-dvh pb-36">
      <Screen className="flex h-12 items-center pt-[env(safe-area-inset-top)] lg:mt-4 lg:max-w-5xl lg:px-10">
        <BackButton href="/onboarding" label="Back to questions" />
      </Screen>
      <Screen className="lg:max-w-5xl lg:px-10">
        <Kicker>Choose your arc</Kicker>
        <h1 className="mt-1 font-display text-[2.75rem] leading-[0.95] tracking-wide lg:text-6xl">Pick your arc</h1>
        <p className="mt-1.5 text-[15px] leading-snug text-muted">
          <span className="lg:hidden">Swipe the six archetypes. Tap your goal.</span>
          <span className="hidden lg:inline">Six original archetypes. Pick the physique you&apos;re training toward.</span>
        </p>
      </Screen>

      <div
        ref={scroller}
        onScroll={onScroll}
        role="radiogroup"
        aria-label="Physique archetypes"
        className="scrollbar-none mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-[max(1.25rem,calc((100vw-300px)/2))] pb-4 pt-2 md:px-[calc((100vw-300px)/2)] lg:mx-auto lg:mt-6 lg:grid lg:max-w-5xl lg:snap-none lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-10"
      >
        {ARCHETYPES.map((a, i) => (
          <ArchetypeCard
            key={a.id}
            archetype={a}
            index={i}
            selected={selected === a.id}
            onSelect={() => setSelected(a.id)}
            note={noteFor(a, profile)}
          />
        ))}
      </div>

      <div data-arc-dots className="flex justify-center gap-2 lg:hidden" aria-hidden>
        {ARCHETYPES.map((a, i) => (
          <span
            key={a.id}
            className={`h-1.5 rounded-full transition-all duration-200 ${i === active ? "bg-power w-6" : "w-1.5 bg-line"}`}
          />
        ))}
      </div>

      {/* Phones: pinned CTA. Desktop: a bottom bar with the credit on the left and the CTA on the right. */}
      <PinnedFooter desktop="bar" className="lg:flex lg:flex-row-reverse lg:items-center lg:justify-between lg:gap-6">
        <Button size="lg" onClick={confirm} disabled={!selected} className="lg:w-auto lg:min-w-80 lg:px-8">
          {chosen ? `This is my goal · ${chosen.name.replace(/^The /, "")}` : "Tap an archetype"}
        </Button>
        <SiteFooter artOnly className="mt-2 lg:mt-0 lg:text-left" />
      </PinnedFooter>
    </div>
  );
}
