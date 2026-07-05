/** Plain-text rendering of a piece at a given reveal progress (copy/download). */

import { GENERATORS } from "./generators";
import { rampChar } from "./ramp";
import type { ArtDescriptor } from "@/lib/types";

export function revealedText(
  descriptor: ArtDescriptor,
  cols: number,
  rows: number,
  progress: number
): string {
  const gen = GENERATORS[descriptor.generator] ?? GENERATORS.field;
  const field = gen(Number(descriptor.seed) >>> 0, cols, rows);
  // Rank inked cells only — matches AsciiArt's reveal pacing.
  const all: number[] = [];
  for (const row of field) for (const b of row) if (b >= 0.12) all.push(b);
  all.sort((a, b) => a - b);
  const n = all.length;
  const threshold =
    progress >= 1
      ? -Infinity
      : progress <= 0
        ? Infinity
        : (all[Math.min(n - 1, Math.max(0, n - Math.floor(progress * n)))] ?? Infinity);
  return field
    .map((row) => row.map((b) => (b >= threshold ? rampChar(b) : " ")).join("").replace(/\s+$/, ""))
    .join("\n");
}
