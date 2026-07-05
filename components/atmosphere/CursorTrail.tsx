"use client";

import { useEffect, useRef } from "react";

/**
 * Matrix-style cursor trail: neon-green binary bits shed from the pointer,
 * drifting down and dissolving. Pure DOM (no React re-renders per move),
 * capped node count, disabled on touch devices and prefers-reduced-motion.
 */

const NEON = "#39ff14";
const MAX_BITS = 70;
const SPAWN_EVERY_MS = 28;

export function CursorTrail() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return; // touch — skip

    let last = 0;
    let live = 0;

    const spawn = (x: number, y: number) => {
      if (live >= MAX_BITS) return;
      live++;
      const bit = document.createElement("span");
      bit.textContent = Math.random() > 0.5 ? "1" : "0";
      const size = 9 + Math.random() * 6;
      const drift = (Math.random() - 0.5) * 36;
      const fall = 24 + Math.random() * 46;
      const life = 650 + Math.random() * 500;
      bit.style.cssText = [
        "position:fixed",
        `left:${x + (Math.random() - 0.5) * 14}px`,
        `top:${y + (Math.random() - 0.5) * 10}px`,
        `font-size:${size}px`,
        "font-family:var(--font-jetbrains),ui-monospace,monospace",
        `color:${NEON}`,
        `text-shadow:0 0 6px ${NEON},0 0 14px ${NEON}66`,
        "pointer-events:none",
        "user-select:none",
        "will-change:transform,opacity",
        `transition:transform ${life}ms cubic-bezier(0.25,0.46,0.45,0.94),opacity ${life}ms ease-out`,
      ].join(";");
      container.appendChild(bit);
      // next frame: launch the fall + fade
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          bit.style.transform = `translate(${drift}px, ${fall}px) rotate(${(Math.random() - 0.5) * 40}deg)`;
          bit.style.opacity = "0";
        })
      );
      window.setTimeout(() => {
        bit.remove();
        live--;
      }, life + 60);
    };

    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - last < SPAWN_EVERY_MS) return;
      last = now;
      spawn(e.clientX, e.clientY);
      if (Math.random() > 0.72) spawn(e.clientX, e.clientY); // occasional double bit
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      container.replaceChildren();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 55, overflow: "hidden" }}
    />
  );
}
