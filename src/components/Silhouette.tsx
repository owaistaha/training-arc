import type { ArchetypeId } from "@/lib/archetypes";

/*
 * Placeholder art: a parametric rim-lit silhouette per archetype. Proportions
 * only — generic props (headband, sheathed blade), no character likenesses.
 * Final original art replaces this in bootstrap step 9.
 */

interface Build {
  s: number; // shoulder half-width
  w: number; // waist half-width
  h: number; // hip half-width
  a: number; // arm thickness
  l: number; // leg thickness
  head: number;
  neck: number;
  hair: boolean;
  prop?: "headband" | "blade";
}

const BUILDS: Record<ArchetypeId, Build> = {
  warrior: { s: 46, w: 22, h: 26, a: 13, l: 17, head: 14, neck: 16, hair: true },
  rival: { s: 44, w: 28, h: 29, a: 16, l: 19, head: 14, neck: 20, hair: true },
  ninja: { s: 36, w: 21, h: 24, a: 10, l: 14, head: 13.5, neck: 12, hair: true, prop: "headband" },
  titan: { s: 56, w: 36, h: 37, a: 21, l: 25, head: 15, neck: 26, hair: true },
  swordsman: { s: 41, w: 24, h: 27, a: 12, l: 16, head: 14, neck: 14, hair: true, prop: "blade" },
  monk: { s: 37, w: 22, h: 24, a: 11, l: 14, head: 14, neck: 13, hair: false },
};

export function Silhouette({ archetype, className = "" }: { archetype: ArchetypeId; className?: string }) {
  const b = BUILDS[archetype];
  const cx = 100;
  const hy = 40; // head centre y
  const sy = 70; // shoulder line
  const L = (dx: number) => cx - dx;
  const R = (dx: number) => cx + dx;
  const id = `sil-${archetype}`;

  const torso = [
    `M ${L(b.s - 8)} ${sy - 5}`,
    `Q ${cx} ${sy - 11} ${R(b.s - 8)} ${sy - 5}`,
    `Q ${R(b.s + 3)} ${sy - 2} ${R(b.s)} ${sy + 12}`,
    `C ${R(b.s - 3)} ${sy + 36} ${R(b.w + 3)} ${sy + 52} ${R(b.w)} ${sy + 80}`,
    `L ${R(b.h)} ${sy + 98}`,
    `L ${L(b.h)} ${sy + 98}`,
    `L ${L(b.w)} ${sy + 80}`,
    `C ${L(b.w + 3)} ${sy + 52} ${L(b.s - 3)} ${sy + 36} ${L(b.s)} ${sy + 12}`,
    `Q ${L(b.s + 3)} ${sy - 2} ${L(b.s - 8)} ${sy - 5}`,
    "Z",
  ].join(" ");

  const arm = (side: 1 | -1) => {
    const x = (dx: number) => cx + side * dx;
    return `M ${x(b.s - 3)} ${sy + 8} L ${x(b.s + b.a * 0.35)} ${sy + 58} L ${x(b.s + b.a * 0.2 - 2)} ${sy + 104}`;
  };
  const leg = (side: 1 | -1) => {
    const x = (dx: number) => cx + side * dx;
    return `M ${x(b.h * 0.52)} ${sy + 92} L ${x(b.h * 0.58 + 3)} ${sy + 146} L ${x(b.h * 0.56 + 4)} ${sy + 196}`;
  };

  const hair = `M ${L(b.head + 1.5)} ${hy + 2} Q ${L(b.head)} ${hy - b.head - 7} ${cx} ${hy - b.head - 4} Q ${R(b.head)} ${hy - b.head - 7} ${R(b.head + 1.5)} ${hy + 2} Q ${cx} ${hy - b.head + 5} ${L(b.head + 1.5)} ${hy + 2} Z`;

  return (
    <svg viewBox="0 0 200 290" className={className} role="img" aria-label="Placeholder silhouette">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="290" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "var(--color-line)" }} />
          <stop offset="1" style={{ stopColor: "var(--color-raised)" }} />
        </linearGradient>
        <radialGradient id={`${id}-aura`} cx="100" cy="140" r="110" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "var(--color-accent)", stopOpacity: 0.28 }} />
          <stop offset="1" style={{ stopColor: "var(--color-accent)", stopOpacity: 0 }} />
        </radialGradient>
      </defs>

      {/* speed lines */}
      <g style={{ stroke: "var(--color-line)" }} strokeWidth="1.5" strokeLinecap="round" opacity="0.7">
        <path d="M14 70 L58 34 M8 150 L44 120 M156 250 L192 220 M150 96 L194 60 M20 236 L50 212" />
      </g>
      <circle cx="100" cy="140" r="110" fill={`url(#${id}-aura)`} />
      <ellipse cx="100" cy="270" rx={b.h + 38} ry="7" style={{ fill: "var(--color-accent)" }} opacity="0.18" />

      <g
        style={{
          filter:
            "drop-shadow(0 0 1px var(--color-accent)) drop-shadow(0 0 10px color-mix(in srgb, var(--color-accent) 40%, transparent))",
        }}
      >
        {b.prop === "blade" && (
          <g style={{ stroke: "var(--color-muted)" }} strokeLinecap="round">
            <path d={`M ${L(b.s + 10)} ${sy - 30} L ${R(b.s + 6)} ${sy + 120}`} strokeWidth="5" />
            <path d={`M ${L(b.s + 4)} ${sy - 14} L ${L(b.s - 10)} ${sy - 26}`} strokeWidth="4" style={{ stroke: "var(--color-gold)" }} />
          </g>
        )}

        <g fill="none" stroke={`url(#${id}-body)`} strokeLinecap="round" strokeLinejoin="round">
          <path d={leg(-1)} strokeWidth={b.l} />
          <path d={leg(1)} strokeWidth={b.l} />
          <path d={arm(-1)} strokeWidth={b.a} />
          <path d={arm(1)} strokeWidth={b.a} />
        </g>

        <rect x={cx - b.neck / 2} y={hy + 6} width={b.neck} height={sy - hy - 4} rx={b.neck / 3} fill={`url(#${id}-body)`} />
        <path d={torso} fill={`url(#${id}-body)`} />
        <circle cx={cx} cy={hy} r={b.head} fill={`url(#${id}-body)`} />
        {b.hair && <path d={hair} style={{ fill: "var(--color-bg)" }} />}

        {b.prop === "headband" && (
          <g fill="none" style={{ stroke: "var(--color-accent)" }} strokeLinecap="round">
            <path d={`M ${L(b.head)} ${hy - 4} Q ${cx} ${hy - 8} ${R(b.head)} ${hy - 4}`} strokeWidth="3.5" />
            <path d={`M ${R(b.head - 1)} ${hy - 4} Q ${R(b.head + 16)} ${hy - 12} ${R(b.head + 34)} ${hy - 6}`} strokeWidth="3" />
            <path d={`M ${R(b.head - 1)} ${hy - 3} Q ${R(b.head + 14)} ${hy + 2} ${R(b.head + 28)} ${hy + 10}`} strokeWidth="3" />
          </g>
        )}
      </g>

      {/* muscle definition hints */}
      <g fill="none" style={{ stroke: "var(--color-bg)" }} strokeWidth="1.6" strokeLinecap="round" opacity="0.55">
        <path d={`M ${L(b.s * 0.62)} ${sy + 26} Q ${cx} ${sy + 36} ${R(b.s * 0.62)} ${sy + 26}`} />
        {[48, 60, 72].map((y) => (
          <path key={y} d={`M ${L(b.w * 0.5)} ${sy + y} Q ${L(b.w * 0.25)} ${sy + y + 2} ${L(2.5)} ${sy + y} M ${R(2.5)} ${sy + y} Q ${R(b.w * 0.25)} ${sy + y + 2} ${R(b.w * 0.5)} ${sy + y}`} />
        ))}
      </g>
    </svg>
  );
}
