/**
 * Picks the art piece for a given day: the generator family comes from the
 * subject studied most that day (relevance), the exact variant + all params
 * come from the date seed (uniqueness). No study yet → a general warm field.
 */

import { format } from "date-fns";
import type { StudySession, Subject, ArtDescriptor } from "@/lib/types";
import type { GeneratorId } from "./generators";
import { hashString } from "./rng";
import { ART_AURORAS } from "@/lib/aura-palettes";

// Known TUM codes → their themed generator family. Unknown subjects fall back
// to a family chosen deterministically from their id, so they stay consistent.
const CODE_FAMILIES: Record<string, GeneratorId[]> = {
  FPV: ["mandelbrot", "julia"],
  GAD: ["fractalTree", "sierpinski"],
  LINALG: ["solid3d"],
  EIST: ["graph"],
  GRA: ["circuit"],
};
const FALLBACK_FAMILIES: GeneratorId[][] = [
  ["mandelbrot", "julia"],
  ["fractalTree", "sierpinski"],
  ["solid3d"],
  ["graph"],
  ["circuit"],
];

function familyFor(subject: Subject): GeneratorId[] {
  const known = CODE_FAMILIES[subject.code.toUpperCase()];
  if (known) return known;
  const idx = hashString(subject.id) % FALLBACK_FAMILIES.length;
  return FALLBACK_FAMILIES[idx] ?? FALLBACK_FAMILIES[0]!;
}

/** Subject with the most logged minutes on `dayKey` (YYYY-MM-DD), or null. */
export function dominantSubjectId(
  dayKey: string,
  sessions: StudySession[]
): string | null {
  const mins = new Map<string, number>();
  for (const s of sessions) {
    if (format(new Date(s.startedAt), "yyyy-MM-dd") !== dayKey) continue;
    mins.set(s.subjectId, (mins.get(s.subjectId) ?? 0) + s.durationMinutes);
  }
  let best: string | null = null;
  let bestMin = 0;
  for (const [id, m] of mins) if (m > bestMin) ((best = id), (bestMin = m));
  return best;
}

/**
 * Descriptor for a day. Deterministic in the date; the dominant subject only
 * chooses the family + aura. Store freezes this at unlock so later target or
 * study changes never rewrite an earned piece.
 */
export function artForDay(
  dayKey: string,
  sessions: StudySession[],
  subjects: Subject[]
): ArtDescriptor {
  const seed = hashString(dayKey);
  const domId = dominantSubjectId(dayKey, sessions);
  const subject = domId ? subjects.find((s) => s.id === domId) : undefined;

  // Colour is the day's own — any palette, picked by the date seed —
  // so the library spans the full spectrum instead of five fixed hues.
  const aurora =
    ART_AURORAS[hashString(`${dayKey}-hue`) % ART_AURORAS.length] ?? "warm";

  if (!subject) {
    return { generator: "field", seed: String(seed), aurora };
  }
  const fam = familyFor(subject);
  const generator = fam[seed % fam.length] ?? fam[0]!;
  return {
    generator,
    seed: String(seed),
    subjectId: subject.id,
    aurora,
  };
}
