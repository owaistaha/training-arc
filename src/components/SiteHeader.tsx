"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OnboardedProfileSchema, StoredPlanSchema } from "@/lib/planSchema";
import { KEYS } from "@/lib/storage";
import { useStored } from "@/lib/useStored";

/**
 * Desktop-only site header (≥ 1024 px): logo home + links to the plan and the archetypes once
 * they exist. Phones keep the app-style screens without it. Not sticky, so the workout and
 * onboarding progress bars can still stick to the top below it.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const plan = useStored(KEYS.plan, StoredPlanSchema);
  const profile = useStored(KEYS.profile, OnboardedProfileSchema);

  const links = [
    plan.value && { href: "/plan", label: "My plan", active: pathname.startsWith("/plan") },
    profile.value && { href: "/arc", label: "Archetypes", active: pathname === "/arc" },
  ].filter(Boolean) as { href: string; label: string; active: boolean }[];

  return (
    <header data-site-header className="hidden border-b border-line/60 lg:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-10">
        <Link href="/" className="-ml-2 inline-flex min-h-11 items-center px-2 font-display text-xl tracking-[0.3em] text-fg">
          Training&nbsp;<span className="text-power">Arc</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.active ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors ${
                l.active ? "bg-raised text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
