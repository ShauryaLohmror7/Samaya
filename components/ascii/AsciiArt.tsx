"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { GENERATORS } from "@/lib/ascii/generators";
import { rampChar, shimmerChar } from "@/lib/ascii/ramp";
import { AURORAS } from "@/lib/aura-palettes";
import { mulberry32 } from "@/lib/ascii/rng";
import type { ArtDescriptor } from "@/lib/types";

/**
 * The reveal renderer. Two stacked monospace layers:
 *   • front — the true glyphs of already-revealed (brightest) cells, painted
 *     in the piece's aura gradient (background-clip:text) with a soft glow;
 *   • back  — faint shimmering static occupying the art's footprint, for the
 *     cells not yet revealed. The form resolves out of the static as progress
 *     (studyMinutes / target) climbs, brightest strokes first.
 *
 * prefers-reduced-motion freezes the static (deterministic, no interval).
 */

interface Props {
  descriptor: ArtDescriptor;
  progress: number; // 0..1
  cols: number;
  rows: number;
  fontSize?: number; // px
  defer?: boolean; // wait until scrolled into view before generating
  glow?: boolean;
  className?: string;
}

// Only cells brighter than this take part in the static footprint / ink.
const INK_FLOOR = 0.12;

function useInView<T extends Element>(enabled: boolean) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(!enabled);
  useEffect(() => {
    if (!enabled || inView) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setInView(true)),
      { rootMargin: "120px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [enabled, inView]);
  return { ref, inView };
}

export function AsciiArt({
  descriptor,
  progress,
  cols,
  rows,
  fontSize = 11,
  defer = false,
  glow = true,
  className,
}: Props) {
  const reduceMotion = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>(defer);

  // Brightness field — deterministic per generator+seed+size, computed lazily.
  const field = useMemo(() => {
    if (!inView) return null;
    const gen = GENERATORS[descriptor.generator] ?? GENERATORS.field;
    return gen(Number(descriptor.seed) >>> 0, cols, rows);
  }, [descriptor.generator, descriptor.seed, cols, rows, inView]);

  // Ascending brightness of *inked* cells only — ranking against empty
  // space would let sparse pieces reveal almost fully at low progress.
  const sortedAsc = useMemo(() => {
    if (!field) return null;
    const all: number[] = [];
    for (const row of field) for (const b of row) if (b >= INK_FLOOR) all.push(b);
    all.sort((a, b) => a - b);
    return all;
  }, [field]);

  const threshold = useMemo(() => {
    if (!sortedAsc) return Infinity;
    if (progress >= 1) return -Infinity;
    if (progress <= 0) return Infinity;
    const n = sortedAsc.length;
    const idx = Math.min(n - 1, Math.max(0, n - Math.floor(progress * n)));
    return sortedAsc[idx] ?? Infinity;
  }, [sortedAsc, progress]);

  // Front layer: revealed true glyphs.
  const frontText = useMemo(() => {
    if (!field) return "";
    return field
      .map((row) => row.map((b) => (b >= threshold ? rampChar(b) : " ")).join(""))
      .join("\n");
  }, [field, threshold]);

  // Back layer: shimmering static in the unrevealed footprint. Animated via a
  // tick that reshuffles glyphs; frozen + deterministic under reduced motion.
  const [tick, setTick] = useState(0);
  const animate = !reduceMotion && progress < 1 && field != null;
  useEffect(() => {
    if (!animate) return;
    const id = setInterval(() => setTick((t) => (t + 1) % 1024), 130);
    return () => clearInterval(id);
  }, [animate]);

  const backText = useMemo(() => {
    if (!field) return "";
    const rnd = mulberry32((Number(descriptor.seed) >>> 0) + tick * 2654435761);
    return field
      .map((row, y) =>
        row
          .map((b, x) => {
            if (b >= threshold || b < INK_FLOOR) return " ";
            const r = reduceMotion ? ((x * 73 + y * 131 + (b * 1000) | 0) % 97) / 97 : rnd();
            return shimmerChar(r);
          })
          .join("")
      )
      .join("\n");
  }, [field, threshold, tick, reduceMotion, descriptor.seed]);

  const [core, mid, halo] = AURORAS[descriptor.aurora];
  const preBase: React.CSSProperties = {
    fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
    fontSize,
    lineHeight: 1,
    letterSpacing: 0,
    whiteSpace: "pre",
    margin: 0,
    userSelect: "none",
  };

  return (
    <div
      ref={ref}
      aria-hidden
      className={className}
      style={{ position: "relative", display: "inline-block" }}
    >
      {/* back: static */}
      <pre
        style={{
          ...preBase,
          position: "absolute",
          inset: 0,
          color: core,
          opacity: 0.38,
        }}
      >
        {backText}
      </pre>
      {/* front: revealed glyphs in the aura gradient */}
      <pre
        style={{
          ...preBase,
          position: "relative",
          backgroundImage: `linear-gradient(135deg, ${core}, ${mid} 55%, ${halo})`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: glow ? `drop-shadow(0 0 6px color-mix(in srgb, ${core} 45%, transparent))` : undefined,
        }}
      >
        {frontText || " "}
      </pre>
    </div>
  );
}
