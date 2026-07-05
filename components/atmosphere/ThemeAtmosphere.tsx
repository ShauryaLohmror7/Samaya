"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useAura } from "@/lib/store";
import { effectiveTheme, themeOverride, THEME_BY_ID, type AtmosphereKind } from "@/lib/themes";
import { AuraBloom } from "./AuraBloom";

/**
 * Full-screen animated background, one scene per theme. Day/night keep the
 * signature concentric aura bloom; every other theme paints the whole
 * viewport in its own weather — falling blossom, drifting leaves, drafting
 * grids, candlelight, gold silk, nebulae, glyph rain.
 *
 * All scenes: fixed, aria-hidden, behind content, strength scaled by the
 * user's aura-intensity setting (`--aura-user`), frozen (not removed) under
 * prefers-reduced-motion.
 */

export function ThemeAtmosphere() {
  const settings = useAura((s) => s.settings);
  const [, setTick] = useState(0);

  // Re-evaluate the effective theme every minute while auto mode is on.
  useEffect(() => {
    if (!settings.autoTheme) return;
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [settings.autoTheme]);

  const [override, setOverride] = useState<ReturnType<typeof themeOverride>>(null);
  useEffect(() => setOverride(themeOverride()), []);

  const theme = override ?? effectiveTheme(settings);
  const kind: AtmosphereKind = THEME_BY_ID[theme]?.atmosphere ?? "bloom";

  switch (kind) {
    case "petals":
      return <Scene key="petals"><Petals /></Scene>;
    case "leaves":
      return <Scene key="leaves"><Leaves /></Scene>;
    case "grid":
      return <Scene key="grid"><Grid /></Scene>;
    case "candle":
      return <Scene key="candle"><Candle /></Scene>;
    case "silk":
      return <Scene key="silk"><Silk /></Scene>;
    case "nebula":
      return <Scene key="nebula"><Nebula /></Scene>;
    case "matrix":
      return <Scene key="matrix"><MatrixRain /></Scene>;
    default:
      return <AuraBloom />;
  }
}

function Scene({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      aria-hidden
      className="fixed inset-0 overflow-hidden"
      style={{ zIndex: 0, opacity: "calc(var(--aura-user, 1))" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.4, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/** Deterministic-enough particle specs, generated client-side post-mount. */
function useParticles<T>(count: number, make: (i: number) => T): T[] {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    setItems(Array.from({ length: count }, (_, i) => make(i)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);
  return items;
}

/* ————————————————— SAKURA: falling blossom ————————————————— */

function Petals() {
  const reduce = useReducedMotion();
  const petals = useParticles(26, (i) => ({
    left: Math.random() * 100,
    size: 8 + Math.random() * 10,
    duration: 9 + Math.random() * 12,
    delay: -Math.random() * 20,
    sway: 30 + Math.random() * 70,
    spin: Math.random() > 0.5 ? 360 : -360,
    hue: i % 3,
  }));

  return (
    <>
      <style>{`
        @keyframes petal-fall {
          0% { transform: translateY(-6vh) translateX(0) rotate(0deg); }
          25% { transform: translateY(24vh) translateX(var(--sway)) rotate(calc(var(--spin) * 0.25)); }
          50% { transform: translateY(50vh) translateX(calc(var(--sway) * -0.6)) rotate(calc(var(--spin) * 0.5)); }
          75% { transform: translateY(76vh) translateX(calc(var(--sway) * 0.8)) rotate(calc(var(--spin) * 0.75)); }
          100% { transform: translateY(108vh) translateX(0) rotate(var(--spin)); }
        }
        @keyframes blush-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(4%, -3%) scale(1.08); }
        }
      `}</style>
      {/* soft blush washes */}
      <div
        className="absolute"
        style={{
          inset: "-20%",
          background:
            "radial-gradient(45% 40% at 18% 20%, #f3b8cb55 0%, transparent 70%), radial-gradient(50% 45% at 85% 30%, #e88fb04d 0%, transparent 70%), radial-gradient(60% 50% at 50% 95%, #f3c6d266 0%, transparent 70%)",
          animation: reduce ? undefined : "blush-drift 26s ease-in-out infinite",
        }}
      />
      {/* a distant blossom canopy, top corners */}
      <div
        className="absolute"
        style={{
          inset: "-10% -10% auto -10%",
          height: "45%",
          background:
            "radial-gradient(30% 55% at 8% 0%, #e88fb04a 0%, transparent 70%), radial-gradient(28% 50% at 94% 4%, #d64d7a30 0%, transparent 70%)",
          filter: "blur(6px)",
        }}
      />
      {petals.map((p, i) => (
        <span
          key={i}
          className="absolute"
          style={
            {
              left: `${p.left}%`,
              top: 0,
              width: p.size,
              height: p.size * 0.85,
              background:
                p.hue === 0
                  ? "linear-gradient(135deg, #f6cdd9, #e88fb0)"
                  : p.hue === 1
                    ? "linear-gradient(135deg, #f9dde6, #f3b8cb)"
                    : "linear-gradient(135deg, #efaec4, #d64d7a)",
              borderRadius: "150% 20% 150% 20%",
              opacity: 0.85,
              boxShadow: "0 1px 4px rgba(214, 77, 122, 0.18)",
              "--sway": `${p.sway}px`,
              "--spin": `${p.spin}deg`,
              animation: reduce
                ? undefined
                : `petal-fall ${p.duration}s linear ${p.delay}s infinite`,
              transform: reduce ? `translateY(${(i * 37) % 100}vh)` : undefined,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
}

/* ————————————————— MATCHA: drifting leaves + steam ————————————————— */

function Leaves() {
  const reduce = useReducedMotion();
  const leaves = useParticles(14, () => ({
    top: Math.random() * 100,
    size: 10 + Math.random() * 14,
    duration: 22 + Math.random() * 20,
    delay: -Math.random() * 40,
    rise: 20 + Math.random() * 40,
    tone: Math.random(),
  }));

  return (
    <>
      <style>{`
        @keyframes leaf-drift {
          0% { transform: translateX(-8vw) translateY(0) rotate(-20deg); opacity: 0; }
          8% { opacity: 0.8; }
          50% { transform: translateX(50vw) translateY(calc(var(--rise) * -1px)) rotate(15deg); }
          92% { opacity: 0.8; }
          100% { transform: translateX(110vw) translateY(8px) rotate(-10deg); opacity: 0; }
        }
        @keyframes wave-pan {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
        @keyframes steam-rise {
          0% { transform: translateY(30vh) scaleX(1); opacity: 0; }
          30% { opacity: 0.5; }
          100% { transform: translateY(-40vh) scaleX(1.6); opacity: 0; }
        }
      `}</style>
      {/* layered soft green waves, slowly panning */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(110deg, transparent 0%, #a8c68626 18%, transparent 40%, #7ba05b1f 60%, transparent 82%, #d9b64a14 100%)",
          backgroundSize: "200% 100%",
          animation: reduce ? undefined : "wave-pan 38s linear infinite",
        }}
      />
      <div
        className="absolute"
        style={{
          inset: "-15%",
          background:
            "radial-gradient(55% 45% at 12% 88%, #7ba05b3d 0%, transparent 70%), radial-gradient(45% 40% at 90% 15%, #a8c68633 0%, transparent 70%), radial-gradient(40% 35% at 60% 60%, #d9b64a1a 0%, transparent 70%)",
          filter: "blur(4px)",
        }}
      />
      {/* tea steam wisps */}
      {[18, 42, 71].map((left, i) => (
        <span
          key={`steam-${i}`}
          className="absolute"
          style={{
            left: `${left}%`,
            bottom: 0,
            width: "8rem",
            height: "40vh",
            background:
              "radial-gradient(50% 100% at 50% 100%, rgba(255,255,255,0.5) 0%, transparent 70%)",
            filter: "blur(18px)",
            animation: reduce ? undefined : `steam-rise ${16 + i * 5}s ease-out ${i * 4}s infinite`,
            opacity: reduce ? 0.25 : undefined,
          }}
        />
      ))}
      {leaves.map((l, i) => (
        <span
          key={i}
          className="absolute"
          style={
            {
              top: `${l.top}%`,
              left: 0,
              width: l.size,
              height: l.size * 0.55,
              background:
                l.tone > 0.5
                  ? "linear-gradient(120deg, #8fb56b, #5f8b46)"
                  : "linear-gradient(120deg, #b3cf90, #7ba05b)",
              borderRadius: "0 100% 0 100%",
              opacity: 0.75,
              "--rise": l.rise,
              animation: reduce
                ? undefined
                : `leaf-drift ${l.duration}s ease-in-out ${l.delay}s infinite`,
              transform: reduce ? `translateX(${(i * 53) % 100}vw)` : undefined,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
}

/* ————————————————— BLUEPRINT: drafting grid + scan ————————————————— */

function Grid() {
  const reduce = useReducedMotion();
  const line = "rgba(62, 111, 176, 0.35)";
  const fine = "rgba(62, 111, 176, 0.16)";
  return (
    <>
      <style>{`
        @keyframes grid-pan {
          0% { background-position: 0px 0px, 0px 0px; }
          100% { background-position: 120px 120px, 120px 120px; }
        }
        @keyframes scan-sweep {
          0% { transform: translateX(-30vw) skewX(-8deg); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateX(130vw) skewX(-8deg); opacity: 0; }
        }
        @keyframes compass-turn { to { transform: rotate(360deg); } }
        @keyframes blueprint-breathe {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.9; }
        }
      `}</style>
      {/* fine + major grid, slowly panning like a moving drafting table */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, ${fine} 0 1px, transparent 1px 24px), repeating-linear-gradient(90deg, ${fine} 0 1px, transparent 1px 24px)`,
          animation: reduce ? undefined : "grid-pan 40s linear infinite",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, ${line} 0 1px, transparent 1px 120px), repeating-linear-gradient(90deg, ${line} 0 1px, transparent 1px 120px)`,
          animation: reduce ? undefined : "grid-pan 40s linear infinite",
        }}
      />
      {/* sweeping highlight band */}
      {!reduce && (
        <div
          className="absolute inset-y-0"
          style={{
            width: "22vw",
            background:
              "linear-gradient(90deg, transparent, rgba(127, 166, 214, 0.22), rgba(62, 111, 176, 0.1), transparent)",
            animation: "scan-sweep 13s ease-in-out infinite",
          }}
        />
      )}
      {/* rotating compass rose + dashed measure circles */}
      <svg
        className="absolute"
        style={{
          right: "6%",
          top: "12%",
          width: "26rem",
          height: "26rem",
          opacity: 0.5,
          animation: reduce ? undefined : "compass-turn 90s linear infinite",
        }}
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r="88" fill="none" stroke={line} strokeDasharray="4 7" />
        <circle cx="100" cy="100" r="58" fill="none" stroke={fine} />
        <circle cx="100" cy="100" r="26" fill="none" stroke={line} strokeDasharray="2 5" />
        <line x1="100" y1="4" x2="100" y2="196" stroke={fine} />
        <line x1="4" y1="100" x2="196" y2="100" stroke={fine} />
      </svg>
      <svg
        className="absolute"
        style={{
          left: "-4%",
          bottom: "-8%",
          width: "34rem",
          height: "34rem",
          opacity: 0.4,
          animation: reduce ? undefined : "compass-turn 140s linear infinite reverse",
        }}
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r="92" fill="none" stroke={line} strokeDasharray="10 6" />
        <circle cx="100" cy="100" r="64" fill="none" stroke={fine} strokeDasharray="3 6" />
        <polygon points="100,30 160,150 40,150" fill="none" stroke={fine} />
      </svg>
      {/* corner measurement ticks */}
      <div
        className="absolute inset-x-0 top-0 h-6"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, ${line} 0 1px, transparent 1px 60px)`,
          animation: reduce ? undefined : "blueprint-breathe 7s ease-in-out infinite",
        }}
      />
    </>
  );
}

/* ————————————————— MANUSCRIPT: candlelight + dust ————————————————— */

function Candle() {
  const reduce = useReducedMotion();
  const motes = useParticles(22, () => ({
    left: Math.random() * 100,
    size: 1.5 + Math.random() * 2.5,
    duration: 14 + Math.random() * 18,
    delay: -Math.random() * 30,
    drift: (Math.random() - 0.5) * 60,
  }));

  return (
    <>
      <style>{`
        @keyframes candle-breathe {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          42% { transform: scale(1.06); opacity: 1; }
          58% { transform: scale(0.99); opacity: 0.85; }
          74% { transform: scale(1.04); opacity: 0.95; }
        }
        @keyframes mote-rise {
          0% { transform: translateY(102vh) translateX(0); opacity: 0; }
          12% { opacity: 0.7; }
          88% { opacity: 0.5; }
          100% { transform: translateY(-4vh) translateX(var(--drift)); opacity: 0; }
        }
      `}</style>
      {/* parchment vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 45%, transparent 55%, rgba(46, 31, 14, 0.16) 100%)",
        }}
      />
      {/* two breathing candle glows */}
      <div
        className="absolute"
        style={{
          left: "-12%",
          bottom: "-18%",
          width: "58vw",
          height: "62vh",
          background:
            "radial-gradient(50% 50% at 50% 60%, rgba(229, 180, 92, 0.5) 0%, rgba(201, 138, 45, 0.22) 45%, transparent 75%)",
          filter: "blur(30px)",
          animation: reduce ? undefined : "candle-breathe 5.2s ease-in-out infinite",
        }}
      />
      <div
        className="absolute"
        style={{
          right: "-10%",
          bottom: "-14%",
          width: "48vw",
          height: "52vh",
          background:
            "radial-gradient(50% 50% at 50% 60%, rgba(229, 180, 92, 0.4) 0%, rgba(138, 90, 34, 0.18) 50%, transparent 78%)",
          filter: "blur(34px)",
          animation: reduce ? undefined : "candle-breathe 6.4s ease-in-out 1.2s infinite",
        }}
      />
      {/* a soft top light, like a reading lamp far away */}
      <div
        className="absolute"
        style={{
          left: "30%",
          top: "-20%",
          width: "40vw",
          height: "40vh",
          background:
            "radial-gradient(50% 60% at 50% 30%, rgba(239, 215, 164, 0.55) 0%, transparent 72%)",
          filter: "blur(26px)",
          animation: reduce ? undefined : "candle-breathe 8.5s ease-in-out 0.6s infinite",
        }}
      />
      {/* rising dust motes */}
      {motes.map((m, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={
            {
              left: `${m.left}%`,
              bottom: 0,
              width: m.size,
              height: m.size,
              background: "rgba(229, 180, 92, 0.85)",
              boxShadow: "0 0 6px rgba(229, 180, 92, 0.6)",
              "--drift": `${m.drift}px`,
              animation: reduce
                ? undefined
                : `mote-rise ${m.duration}s linear ${m.delay}s infinite`,
              opacity: reduce ? 0.4 : undefined,
              transform: reduce ? `translateY(-${(i * 41) % 90}vh)` : undefined,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
}

/* ————————————————— ROYAL: gold silk over navy ————————————————— */

function Silk() {
  const reduce = useReducedMotion();
  const sparks = useParticles(26, () => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 1.5 + Math.random() * 2,
    duration: 2.5 + Math.random() * 4,
    delay: Math.random() * 6,
  }));

  const bands = [
    { top: "-10%", w: "70vw", rot: -24, dur: 34, delay: 0, gold: 0.2 },
    { top: "25%", w: "55vw", rot: -20, dur: 26, delay: -8, gold: 0.3 },
    { top: "55%", w: "80vw", rot: -26, dur: 42, delay: -18, gold: 0.16 },
    { top: "78%", w: "50vw", rot: -18, dur: 30, delay: -4, gold: 0.24 },
  ];

  return (
    <>
      <style>{`
        @keyframes silk-sweep {
          0% { transform: translateX(-70vw) rotate(var(--rot)); }
          100% { transform: translateX(170vw) rotate(var(--rot)); }
        }
        @keyframes spark-twinkle {
          0%, 100% { opacity: 0; transform: scale(0.6); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes royal-bloom {
          0%, 100% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.1) translate(2%, -3%); }
        }
      `}</style>
      {/* deep royal-blue under-bloom */}
      <div
        className="absolute"
        style={{
          inset: "-20%",
          background:
            "radial-gradient(50% 45% at 25% 75%, rgba(42, 63, 184, 0.4) 0%, transparent 70%), radial-gradient(45% 40% at 80% 20%, rgba(84, 104, 212, 0.32) 0%, transparent 70%)",
          filter: "blur(30px)",
          animation: reduce ? undefined : "royal-bloom 24s ease-in-out infinite",
        }}
      />
      {/* sweeping gold silk bands */}
      {bands.map((b, i) => (
        <div
          key={i}
          className="absolute"
          style={
            {
              top: b.top,
              left: 0,
              width: b.w,
              height: "16vh",
              background: `linear-gradient(90deg, transparent, rgba(217, 164, 40, ${b.gold}), rgba(243, 207, 109, ${b.gold * 1.4}), rgba(217, 164, 40, ${b.gold}), transparent)`,
              filter: "blur(26px)",
              "--rot": `${b.rot}deg`,
              animation: reduce
                ? undefined
                : `silk-sweep ${b.dur}s linear ${b.delay}s infinite`,
              transform: reduce ? `translateX(${20 + i * 15}vw) rotate(${b.rot}deg)` : undefined,
            } as React.CSSProperties
          }
        />
      ))}
      {/* gold dust twinkling */}
      {sparks.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            background: "#f3cf6d",
            boxShadow: "0 0 8px rgba(243, 207, 109, 0.9), 0 0 18px rgba(217, 164, 40, 0.5)",
            animation: reduce
              ? undefined
              : `spark-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
            opacity: reduce ? 0.5 : undefined,
          }}
        />
      ))}
    </>
  );
}

/* ————————————————— ULTRAVIOLET: synthwave nebula ————————————————— */

function Nebula() {
  const reduce = useReducedMotion();
  const stars = useParticles(60, () => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 1 + Math.random() * 1.8,
    duration: 2 + Math.random() * 5,
    delay: Math.random() * 8,
  }));

  const blobs = [
    { x: "12%", y: "22%", w: "55vw", h: "55vh", c: "rgba(154, 79, 224, 0.5)", dur: 30 },
    { x: "68%", y: "12%", w: "48vw", h: "48vh", c: "rgba(224, 95, 168, 0.4)", dur: 38 },
    { x: "55%", y: "70%", w: "60vw", h: "50vh", c: "rgba(93, 63, 211, 0.45)", dur: 26 },
    { x: "8%", y: "78%", w: "42vw", h: "42vh", c: "rgba(199, 143, 240, 0.3)", dur: 44 },
  ];

  return (
    <>
      <style>{`
        @keyframes nebula-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(6%, -5%) scale(1.12); }
          66% { transform: translate(-5%, 4%) scale(0.94); }
        }
        @keyframes nebula-hue {
          0%, 100% { filter: blur(46px) hue-rotate(0deg); }
          50% { filter: blur(46px) hue-rotate(28deg); }
        }
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.9; }
        }
      `}</style>
      <div
        className="absolute inset-0"
        style={{ animation: reduce ? undefined : "nebula-hue 40s ease-in-out infinite", filter: "blur(46px)" }}
      >
        {blobs.map((b, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              marginLeft: `calc(${b.w} / -2)`,
              marginTop: `calc(${b.h} / -2)`,
              background: `radial-gradient(circle, ${b.c} 0%, transparent 65%)`,
              animation: reduce ? undefined : `nebula-drift ${b.dur}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            background: "#eee6f8",
            boxShadow: "0 0 6px rgba(238, 230, 248, 0.8)",
            animation: reduce
              ? undefined
              : `star-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
            opacity: reduce ? 0.5 : undefined,
          }}
        />
      ))}
    </>
  );
}

/* ————————————————— TERMINAL: glyph rain (canvas) ————————————————— */

const MATRIX_GLYPHS = "01アイウエオカキクケコサシスセソタチツテトナニヌネノ<>[]{}#$+*=";

function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let cols = 0;
    let drops: number[] = [];
    let speeds: number[] = [];
    const cell = 16;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(window.innerWidth / cell);
      // scatter drops across the full height so it rains from frame one
      drops = Array.from({ length: cols }, () =>
        Math.random() * ((window.innerHeight / cell) + 60) - 40
      );
      speeds = Array.from({ length: cols }, () => 0.4 + Math.random() * 0.9);
      ctx.fillStyle = "#0a0f0a";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    };
    resize();
    window.addEventListener("resize", resize);

    ctx.font = `13px ui-monospace, monospace`;

    const step = () => {
      // fading trail
      ctx.fillStyle = "rgba(10, 15, 10, 0.14)";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = 0; i < cols; i++) {
        const x = i * cell;
        const y = drops[i]! * cell;
        const ch = MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)]!;
        // bright head + dimmer body handled by the trail fade
        ctx.fillStyle = Math.random() > 0.94 ? "#c8f5c0" : "rgba(57, 255, 20, 0.72)";
        ctx.fillText(ch, x, y);
        drops[i] = y > window.innerHeight + Math.random() * 400 ? Math.random() * -30 : drops[i]! + speeds[i]!;
      }
      raf = window.setTimeout(() => requestAnimationFrame(step), 50) as unknown as number;
    };

    if (reduce) {
      // one static frame of dim glyphs
      ctx.fillStyle = "rgba(57, 255, 20, 0.25)";
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < 6; j++) {
          if (Math.random() > 0.75) {
            ctx.fillText(
              MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)]!,
              i * cell,
              Math.random() * window.innerHeight
            );
          }
        }
      }
    } else {
      step();
    }

    return () => {
      window.clearTimeout(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reduce]);

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0" style={{ opacity: 0.5 }} />
      {/* CRT scanlines + green vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 1px, transparent 1px 3px)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(110% 90% at 50% 50%, transparent 60%, rgba(15, 122, 61, 0.14) 100%)",
        }}
      />
    </>
  );
}
