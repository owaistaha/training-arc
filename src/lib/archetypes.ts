import archetypeArtJson from "@/data/archetype-art.json";
import archetypesJson from "@/data/archetypes.json";

export const ARCHETYPE_IDS = ["warrior", "vanguard", "ninja", "titan", "swordsman", "monk"] as const;
export type ArchetypeId = (typeof ARCHETYPE_IDS)[number];

export type Split = "push-pull-legs" | "upper-lower" | "full-body" | "full-body-plus-conditioning";
export type DefaultDirection = "cut" | "bulk" | "lean_bulk" | "recomp";

export interface Archetype {
  id: ArchetypeId;
  name: string;
  tagline: string;
  look: string;
  artBrief: string;
  /** Alt text for the archetype art (public/archetypes/<id>.webp). */
  artAlt: string;
  split: Split;
  repRange: string;
  defaultDirection: DefaultDirection;
  emphasis: string[];
  equipment: "any" | "gym" | "bodyweight";
}

export const ARCHETYPES = archetypesJson as Archetype[];

/** Converted art that exists in public/archetypes/ (written by `npm run art`). */
export interface ArchetypeArt {
  src: string;
  width: number;
  height: number;
}
export const ARCHETYPE_ART = archetypeArtJson as Partial<Record<ArchetypeId, ArchetypeArt>>;

export function getArchetype(id: ArchetypeId): Archetype {
  const a = ARCHETYPES.find((x) => x.id === id);
  if (!a) throw new Error(`Unknown archetype: ${id}`);
  return a;
}

export type BodyType = "ectomorph" | "mesomorph" | "endomorph";

export interface BodyTypeTweak {
  /** Rep range for main lifts after the body-type nudge, e.g. "6-10". */
  repRange: string;
  /** How much conditioning to add. Never touches calories. */
  cardio: "minimal" | "normal" | "extra";
}

/**
 * Body type is pop science, so it's only a light nudge to reps and cardio
 * volume. It NEVER changes calories (see lib/stats.ts).
 */
export function bodyTypeTweak(archetype: Archetype, bodyType: BodyType): BodyTypeTweak {
  const [lo, hi] = archetype.repRange.split("-").map(Number);
  const baseCardio = archetype.split === "full-body-plus-conditioning" ? "extra" : "normal";
  switch (bodyType) {
    case "ectomorph":
      // Slightly heavier/lower reps, less cardio.
      return { repRange: `${lo}-${Math.max(lo + 2, hi - 2)}`, cardio: "minimal" };
    case "endomorph":
      // Slightly higher reps (raise the floor, keep the ceiling), more conditioning.
      return { repRange: `${Math.min(lo + 2, hi - 2)}-${hi}`, cardio: "extra" };
    default:
      return { repRange: archetype.repRange, cardio: baseCardio };
  }
}

export function planTitle(archetype: Archetype): string {
  return `${archetype.name.replace(/^The /, "")} Arc — Week 1`;
}
