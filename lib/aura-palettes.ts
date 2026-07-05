/**
 * Aura palettes. The warm reference palette (pink→coral→orange→peach) belongs
 * to the timer and the home screen. Each subject page overrides the bloom
 * with its own cool aurora — bluish/greenish/turquoise families — so every
 * course has its own weather.
 *
 * Order matters: [core, mid, halo, wash] — core is the hot center of the
 * bloom, wash is the big soft outer field.
 */

export type AuroraName =
  | "warm"
  | "lagoon"
  | "polar"
  | "meadow"
  | "orchid"
  | "glacier"
  | "sage-break"
  // art-only palettes — the Atelier draws from the full spectrum
  | "sunset"
  | "ember"
  | "rose"
  | "royal"
  | "dawn"
  | "ultraviolet"
  | "citrine"
  | "oceanic";

export const AURORAS: Record<AuroraName, [string, string, string, string]> = {
  // the reference: orange core, pink mid, coral halo, peach wash
  warm: ["var(--aura-orange)", "var(--aura-pink)", "var(--aura-coral)", "var(--aura-peach)"],
  // turquoise / teal / seafoam
  lagoon: ["#4ecdc4", "#2ba8a0", "#7fe0d4", "#b8efe6"],
  // deep blue / periwinkle / ice
  polar: ["#6c8cff", "#4a63d9", "#93b4ff", "#c4d5ff"],
  // green / mint / spring
  meadow: ["#63c46f", "#3d9e56", "#96dfa0", "#c9f0cb"],
  // violet / lilac / blue
  orchid: ["#a678e8", "#7d54c9", "#c39cf2", "#dcc8f7"],
  // cyan / seafoam / pale sky
  glacier: ["#5bc8e8", "#3aa3cc", "#8eddf0", "#c6eef7"],
  // break state: sage cooling
  "sage-break": ["var(--sage)", "var(--sage-deep)", "var(--aura-peach)", "var(--sage)"],

  /* ——— art-only palettes ([core, mid, halo, wash] = bright→pale) ——— */
  sunset: ["#f0532d", "#e88b3a", "#f4b860", "#f6ddb5"],
  ember: ["#d7263d", "#ef6461", "#f79d84", "#f8d1c0"],
  rose: ["#d64d7a", "#e883a7", "#f2b5cb", "#f8dee8"],
  royal: ["#2a3fb8", "#5468d4", "#d9a428", "#e8d9a8"],
  dawn: ["#e86f9e", "#f0a86e", "#f5cf87", "#fbe8c8"],
  ultraviolet: ["#6320b8", "#9a4fe0", "#c78ff0", "#e5d0f8"],
  citrine: ["#c98a12", "#e5b53c", "#f1d474", "#f8ecc0"],
  oceanic: ["#0f6fa8", "#2f9ec7", "#72c6e0", "#c2e6f2"],
};

/**
 * Palettes the Atelier may paint a day's piece in — any colour, chosen by
 * the date seed. (Subjects still choose the *shape* family; colour is the
 * day's own.)
 */
export const ART_AURORAS: AuroraName[] = [
  "warm",
  "lagoon",
  "polar",
  "meadow",
  "orchid",
  "glacier",
  "sunset",
  "ember",
  "rose",
  "royal",
  "dawn",
  "ultraviolet",
  "citrine",
  "oceanic",
];

/** Cool palettes assigned to subjects (never "warm" — that's the timer's). */
export const SUBJECT_AURORAS: Exclude<AuroraName, "warm" | "sage-break">[] = [
  "lagoon",
  "polar",
  "meadow",
  "orchid",
  "glacier",
];
