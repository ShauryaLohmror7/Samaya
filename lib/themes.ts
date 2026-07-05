import type { Settings, ThemeName } from "./types";

/**
 * Theme registry. Each theme is a `[data-theme]` token block in globals.css
 * plus a full-screen animated atmosphere (see ThemeAtmosphere). Day and night
 * keep the signature circular aura bloom; every other theme paints the whole
 * background in its own weather.
 */

export type AtmosphereKind =
  | "bloom" // the original concentric aura (day, night)
  | "petals" // sakura — falling blossom
  | "leaves" // matcha — drifting leaves + soft waves
  | "grid" // blueprint — drafting grid, scanning lines
  | "candle" // manuscript — breathing candlelight + dust motes
  | "silk" // royal — navy with sweeping gold silk bands
  | "nebula" // ultraviolet — slow synthwave nebula
  | "matrix"; // terminal — full-screen glyph rain

export interface ThemeMeta {
  id: ThemeName;
  label: string;
  family: "light" | "dark";
  atmosphere: AtmosphereKind;
  /** Swatch used by the Settings picker. */
  swatch: { paper: string; ink: string; accents: [string, string, string] };
}

export const THEMES: ThemeMeta[] = [
  {
    id: "day",
    label: "Aura day",
    family: "light",
    atmosphere: "bloom",
    swatch: { paper: "#f2ede4", ink: "#1a1712", accents: ["#e9a0c4", "#f19e8e", "#f4a94c"] },
  },
  {
    id: "night",
    label: "Aura night",
    family: "dark",
    atmosphere: "bloom",
    swatch: { paper: "#191410", ink: "#f0e8da", accents: ["#ef8fbe", "#f68f7b", "#ffb254"] },
  },
  {
    id: "sakura",
    label: "Sakura",
    family: "light",
    atmosphere: "petals",
    swatch: { paper: "#f9edf0", ink: "#3b1a26", accents: ["#e88fb0", "#f3b8cb", "#d64d7a"] },
  },
  {
    id: "matcha",
    label: "Matcha",
    family: "light",
    atmosphere: "leaves",
    swatch: { paper: "#edf0e2", ink: "#1f2a18", accents: ["#7ba05b", "#a8c686", "#d9b64a"] },
  },
  {
    id: "blueprint",
    label: "Blueprint",
    family: "light",
    atmosphere: "grid",
    swatch: { paper: "#e8edf3", ink: "#12233d", accents: ["#3e6fb0", "#7fa6d6", "#2b4a76"] },
  },
  {
    id: "manuscript",
    label: "Manuscript",
    family: "light",
    atmosphere: "candle",
    swatch: { paper: "#f2e6cd", ink: "#2e1f0e", accents: ["#c98a2d", "#e5b45c", "#8a5a22"] },
  },
  {
    id: "royal",
    label: "Royal SAMAYA",
    family: "dark",
    atmosphere: "silk",
    swatch: { paper: "#0d1226", ink: "#ece4d2", accents: ["#4a63d9", "#d9a428", "#f3cf6d"] },
  },
  {
    id: "ultraviolet",
    label: "Ultraviolet",
    family: "dark",
    atmosphere: "nebula",
    swatch: { paper: "#150e20", ink: "#eee6f8", accents: ["#9a4fe0", "#e05fa8", "#5d3fd3"] },
  },
  {
    id: "terminal",
    label: "Terminal",
    family: "dark",
    atmosphere: "matrix",
    swatch: { paper: "#0a0f0a", ink: "#c8f5c0", accents: ["#39ff14", "#1fbf5e", "#0f7a3d"] },
  },
];

export const THEME_BY_ID: Record<string, ThemeMeta> = Object.fromEntries(
  THEMES.map((t) => [t.id, t])
);

export const DARK_THEMES = THEMES.filter((t) => t.family === "dark");

/** Evening = 20:00–06:59. */
export function isEvening(now = new Date()): boolean {
  const h = now.getHours();
  return h >= 20 || h < 7;
}

/** The theme that should actually be applied right now. */
export function effectiveTheme(
  settings: Pick<Settings, "theme" | "autoTheme" | "nightTheme">,
  now = new Date()
): ThemeName {
  if (settings.autoTheme && isEvening(now)) return settings.nightTheme;
  return settings.theme;
}

/**
 * `?theme=X` view-only override (testing / sharing a look). Never persisted.
 */
export function themeOverride(): ThemeName | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search).get("theme");
  return q && THEME_BY_ID[q] ? (q as ThemeName) : null;
}
