import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ChevronLeft } from "./icons";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT: Record<Variant, string> = {
  // Dark text on the orange→gold gradient (white on orange fails WCAG AA).
  primary:
    "bg-power text-bg font-semibold shadow-[0_8px_28px_-8px_color-mix(in_srgb,var(--color-accent)_60%,transparent)] disabled:bg-none disabled:bg-raised disabled:text-muted disabled:shadow-none",
  secondary: "bg-raised text-fg border border-line font-medium hover:border-muted/50",
  ghost: "text-muted font-medium hover:text-fg",
};

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-card px-5 text-base transition-[transform,opacity,background-color,border-color,color] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: "md" | "lg" }) {
  return (
    <button
      type="button"
      className={`${BASE} ${VARIANT[variant]} ${size === "lg" ? "h-14 w-full text-lg" : ""} ${className}`}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: "md" | "lg" }) {
  return (
    <Link
      className={`${BASE} ${VARIANT[variant]} ${size === "lg" ? "h-14 w-full text-lg" : ""} ${className}`}
      {...props}
    />
  );
}

/** Page container: mobile-first, 375 px base, centred on wider screens. */
export function Screen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-md px-5 ${className}`}>{children}</div>;
}

/** CTA pinned to the bottom of the viewport, above the safe area. */
export function PinnedFooter({ children }: { children: ReactNode }) {
  return (
    <div data-pinned-footer className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-bg from-60% to-transparent pt-8">
      <div className="pointer-events-auto mx-auto w-full max-w-md px-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}

export function Chip({
  children,
  tone = "default",
  small,
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "electric";
  small?: boolean;
}) {
  const tones = {
    default: "border-line bg-raised text-muted",
    accent: "border-accent/40 bg-accent/10 text-gold",
    electric: "border-electric/40 bg-electric/10 text-fg",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-medium ${
        small ? "px-2 py-0.5 text-[11px]" : "px-2 py-1 text-xs"
      } ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value, label, className = "" }: { value: number; label: string; className?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={`h-1.5 w-full overflow-hidden rounded-full bg-raised ${className}`}
    >
      <div className="bg-power h-full rounded-full transition-[width] duration-300 ease-snappy" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function BackButton({ onClick, href, label = "Back" }: { onClick?: () => void; href?: string; label?: string }) {
  const cls =
    "-ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-fg transition-colors hover:bg-raised disabled:opacity-0";
  if (href) {
    return (
      <Link href={href} aria-label={label} className={cls}>
        <ChevronLeft />
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className={cls} disabled={!onClick}>
      <ChevronLeft />
    </button>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="font-display text-sm tracking-[0.2em] text-gold">{children}</p>;
}

/** Full-screen placeholder while localStorage is read (avoids a flash of the wrong screen). */
export function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy="true" aria-label="Loading">
      <div className="bg-power h-1 w-16 animate-pulse rounded-full" />
    </div>
  );
}
