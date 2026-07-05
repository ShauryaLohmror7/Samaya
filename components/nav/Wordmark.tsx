"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

/**
 * SAMAYA — the royal wordmark. High-contrast Fraunces in royal blue with a
 * gold shimmer woven through the letters; on hover the mark lifts and a
 * golden halo orbits slowly around it.
 */

const ROYAL = "#2a3fb8";
const ROYAL_DEEP = "#1b2a86";
const GOLD = "#d9a428";
const GOLD_BRIGHT = "#f3cf6d";

export function Wordmark() {
  const reduceMotion = useReducedMotion();

  return (
    <Link href="/" aria-label="SAMAYA — home" className="group relative inline-block">
      {/* orbiting golden halo — blooms on hover */}
      {!reduceMotion && (
        <motion.span
          aria-hidden
          className="absolute -inset-x-4 -inset-y-2 -z-10 rounded-full opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-80"
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${GOLD}55 70deg, ${GOLD_BRIGHT}99 110deg, transparent 200deg, ${GOLD}44 300deg, transparent 360deg)`,
          }}
        />
      )}
      <motion.span
        whileHover={reduceMotion ? undefined : { y: -3, scale: 1.04, rotate: -0.5 }}
        transition={{ type: "spring", stiffness: 320, damping: 18 }}
        className="samaya-mark font-display inline-block text-2xl sm:text-3xl"
        style={{
          fontVariationSettings: "'opsz' 144, 'SOFT' 30, 'WONK' 1",
          fontWeight: 600,
          letterSpacing: "0.08em",
          backgroundImage: `linear-gradient(105deg, ${ROYAL_DEEP} 0%, ${ROYAL} 22%, ${GOLD_BRIGHT} 38%, ${GOLD} 46%, ${ROYAL} 60%, ${ROYAL_DEEP} 100%)`,
          backgroundSize: "250% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: `drop-shadow(0 1px 6px ${GOLD}38)`,
        }}
      >
        SAMAYA
      </motion.span>
    </Link>
  );
}
