"use client";

import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { useAuraMood, resolveAurora, type AuraMood } from "@/lib/aura-mood";
import { AURORAS } from "@/lib/aura-palettes";
import { EtheralShadow } from "@/components/ui/etheral-shadow";

/**
 * The signature element: a concentric aura bloom like the reference — a hot
 * core, a wide mid bloom, a soft halo ring and a big outer wash — heavily
 * blurred, drifting very slowly, breathing faster during a focus session.
 *
 * Palette comes from the mood store: warm (reference) by default, a cool
 * per-subject aurora on subject pages, sage while on a break.
 *
 * Under prefers-reduced-motion the drift freezes but the color remains.
 */

// [core, mid, halo, wash] geometry — sizes in vmin-ish rem units.
const RINGS = [
  { size: "24rem", stop: 72, opacity: 1 },
  { size: "44rem", stop: 68, opacity: 0.95 },
  { size: "64rem", stop: 64, opacity: 0.85 },
  { size: "92rem", stop: 60, opacity: 0.7 },
] as const;

// Motion energy per mood: idle drifts glacially, focus breathes, break slows.
const ENERGY: Record<AuraMood, { pulse: number[]; pulseDur: number; driftDur: number; driftAmp: number }> = {
  idle: { pulse: [1], pulseDur: 1, driftDur: 30, driftAmp: 26 },
  focus: { pulse: [1, 1.05, 1], pulseDur: 4.4, driftDur: 14, driftAmp: 18 },
  break: { pulse: [1, 1.02, 1], pulseDur: 7, driftDur: 38, driftAmp: 20 },
};

export function AuraBloom() {
  const mood = useAuraMood((s) => s.mood);
  const scene = useAuraMood((s) => s.scene);
  const reduceMotion = useReducedMotion();

  const paletteName = resolveAurora(mood, scene);
  const colors = AURORAS[paletteName];
  const energy = ENERGY[mood];

  return (
    <div aria-hidden className="fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {/* undulating ethereal wash (21st.dev component, aura-toned) behind the bloom */}
      <div className="absolute inset-0" style={{ opacity: 0.28, filter: "blur(70px)" }}>
        <EtheralShadow
          color={colors[3]}
          animation={{ scale: 55, speed: 22 }}
          sizing="fill"
        />
      </div>
      <motion.div
        className="absolute inset-0"
        animate={reduceMotion ? { scale: 1 } : { scale: energy.pulse }}
        transition={{ duration: energy.pulseDur, repeat: Infinity, ease: "easeInOut" }}
        style={{ filter: "blur(44px) saturate(1.3)", opacity: "var(--aura-opacity)" }}
      >
        <AnimatePresence mode="sync">
          <motion.div
            key={paletteName}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
          >
            {RINGS.map((ring, i) => {
              // wash sits behind, core on top — render outermost first
              const idx = RINGS.length - 1 - i;
              const r = RINGS[idx]!;
              const color = colors[idx]!;
              const amp = energy.driftAmp * (1 + idx * 0.35);
              return (
                <motion.div
                  key={idx}
                  className="absolute rounded-full"
                  animate={
                    reduceMotion
                      ? undefined
                      : {
                          x: [0, amp, -amp * 0.6, 0],
                          y: [0, -amp * 0.7, amp * 0.5, 0],
                          scale: [1, 1.04, 0.97, 1],
                        }
                  }
                  transition={{
                    duration: energy.driftDur + idx * 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    left: "50%",
                    top: "44%",
                    width: r.size,
                    height: r.size,
                    marginLeft: `calc(${r.size} / -2)`,
                    marginTop: `calc(${r.size} / -2)`,
                    opacity: r.opacity,
                    background: `radial-gradient(circle, ${color} 0%, ${color} ${
                      r.stop - 30
                    }%, transparent ${r.stop}%)`,
                  }}
                />
              );
            })}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
