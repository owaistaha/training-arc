"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { Alert } from "./icons";
import { BackButton, Button, Kicker, PinnedFooter, ProgressBar, Screen } from "./ui";

interface StepShellProps {
  step: number; // 0-based
  total: number;
  kicker: string;
  title: string;
  subtitle?: string;
  /** +1 going forward, -1 going back: picks the slide direction. */
  direction: 1 | -1;
  onBack?: () => void;
  cta: { label: string; onClick: () => void; disabled?: boolean };
  error?: string | null;
  children: ReactNode;
}

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 28 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -28 }),
};

/** One-question-per-screen frame: back button, progress bar, animated question, pinned CTA. */
export function StepShell({ step, total, kicker, title, subtitle, direction, onBack, cta, error, children }: StepShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <Screen className="flex h-14 items-center gap-3">
          <BackButton onClick={onBack} label="Previous question" />
          <ProgressBar value={(step + 1) / total} label={`Question ${step + 1} of ${total}`} className="flex-1" />
          <span className="w-12 text-right font-display text-lg tabular-nums tracking-wider text-muted">
            {String(step + 1).padStart(2, "0")}/{total}
          </span>
        </Screen>
      </header>

      {/* Desktop: the question sits a little down the page and the CTA follows right under the answers. */}
      <main className="flex-1 overflow-x-clip pb-36 lg:pb-16 lg:pt-[8vh]">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Screen className="pt-6">
              <Kicker>{kicker}</Kicker>
              <h1 className="mt-2 font-display text-[2.75rem] leading-[0.95] tracking-wide">{title}</h1>
              {subtitle && <p className="mt-3 text-[15px] leading-relaxed text-muted">{subtitle}</p>}
              <div className="mt-7">{children}</div>
            </Screen>
          </motion.div>
        </AnimatePresence>

        {/* Outside the animated (transformed) wrapper, so `fixed` still pins to the viewport on phones. */}
        <PinnedFooter desktop="inline" className="lg:mt-8">
          {error && (
            <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2.5 text-sm text-fg">
              <Alert className="mt-0.5 size-4 shrink-0 text-warn" />
              {error}
            </p>
          )}
          <Button size="lg" onClick={cta.onClick} disabled={cta.disabled}>
            {cta.label}
          </Button>
        </PinnedFooter>
      </main>
    </div>
  );
}
