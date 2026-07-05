/** Luminance ramp — the heart of pretty ASCII: brightness → glyph. */

// Dark → bright. A space at the low end lets forms breathe against the paper.
export const RAMP = " .·:-=+*oxOX%#@";

/** Map a brightness value in [0,1] to a ramp glyph. */
export function rampChar(b: number): string {
  const clamped = b <= 0 ? 0 : b >= 1 ? 1 : b;
  const idx = Math.min(RAMP.length - 1, Math.floor(clamped * (RAMP.length - 1)));
  return RAMP[idx] ?? " ";
}

/** Random glyph for the not-yet-revealed shimmer (skips the empty low end). */
export function shimmerChar(r: number): string {
  const glyphs = ".·:-=+*";
  return glyphs[Math.floor(r * glyphs.length) % glyphs.length] ?? "·";
}

/** Render a brightness field (rows of numbers in [0,1]) to ramp glyphs. */
export function renderField(field: number[][]): string[] {
  return field.map((row) => row.map(rampChar).join(""));
}
