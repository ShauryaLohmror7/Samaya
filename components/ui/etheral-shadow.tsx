"use client";

/**
 * Adapted from the 21st.dev "Etheral Shadow" component (credit: 21st.dev
 * community registry). Re-themed for Aura per our design rules:
 * - color comes from the aura palette (never gray/black),
 * - `framer-motion` import swapped for our `motion` package,
 * - the external Framer-hosted mask + noise PNGs are replaced with a
 *   self-contained inline-SVG blob mask (local-first: no network fetches;
 *   grain already exists app-wide),
 * - the demo headline/noise layers were removed,
 * - prefers-reduced-motion freezes the undulation.
 */

import React, { useRef, useId, useEffect, type CSSProperties } from "react";
import {
  animate,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "motion/react";

interface AnimationConfig {
  scale: number; // 1..100 — how much the shapes displace
  speed: number; // 1..100 — how fast they undulate
}

interface EtheralShadowProps {
  sizing?: "fill" | "stretch";
  color?: string;
  animation?: AnimationConfig;
  style?: CSSProperties;
  className?: string;
}

function mapRange(
  value: number,
  fromLow: number,
  fromHigh: number,
  toLow: number,
  toHigh: number
): number {
  if (fromLow === fromHigh) return toLow;
  const percentage = (value - fromLow) / (fromHigh - fromLow);
  return toLow + percentage * (toHigh - toLow);
}

const useInstanceId = (): string => {
  const id = useId();
  return `shadowoverlay-${id.replace(/:/g, "")}`;
};

// Self-contained organic blob mask (white = visible), replacing the
// framerusercontent.com mask image so the app never fetches remote assets.
const BLOB_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800'><defs><filter id='b' x='-40%' y='-40%' width='180%' height='180%'><feGaussianBlur stdDeviation='70'/></filter></defs><g fill='white' filter='url(%23b)'><ellipse cx='320' cy='260' rx='260' ry='180'/><ellipse cx='820' cy='300' rx='300' ry='170'/><ellipse cx='560' cy='560' rx='340' ry='200'/><ellipse cx='1020' cy='620' rx='240' ry='160'/><ellipse cx='180' cy='640' rx='200' ry='150'/></g></svg>`
)}")`;

export function EtheralShadow({
  sizing = "fill",
  color = "var(--aura-coral)",
  animation,
  style,
  className,
}: EtheralShadowProps) {
  const id = useInstanceId();
  const reduceMotion = useReducedMotion();
  const animationEnabled = !reduceMotion && animation && animation.scale > 0;
  const feColorMatrixRef = useRef<SVGFEColorMatrixElement>(null);
  const hueRotateMotionValue = useMotionValue(180);
  const hueRotateAnimation = useRef<AnimationPlaybackControls | null>(null);

  const displacementScale = animation
    ? mapRange(animation.scale, 1, 100, 20, 100)
    : 0;
  const animationDuration = animation
    ? mapRange(animation.speed, 1, 100, 1000, 50)
    : 1;

  useEffect(() => {
    if (feColorMatrixRef.current && animationEnabled) {
      hueRotateAnimation.current?.stop();
      hueRotateMotionValue.set(0);
      hueRotateAnimation.current = animate(hueRotateMotionValue, 360, {
        duration: animationDuration / 25,
        repeat: Infinity,
        repeatType: "loop",
        ease: "linear",
        onUpdate: (value: number) => {
          feColorMatrixRef.current?.setAttribute("values", String(value));
        },
      });
      return () => hueRotateAnimation.current?.stop();
    }
    return undefined;
  }, [animationEnabled, animationDuration, hueRotateMotionValue]);

  return (
    <div
      className={className}
      style={{
        overflow: "hidden",
        position: "relative",
        width: "100%",
        height: "100%",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -displacementScale,
          filter: animationEnabled ? `url(#${id}) blur(4px)` : "blur(4px)",
        }}
      >
        {animationEnabled && (
          <svg style={{ position: "absolute" }} aria-hidden>
            <defs>
              <filter id={id}>
                <feTurbulence
                  result="undulation"
                  numOctaves="2"
                  baseFrequency={`${mapRange(animation.scale, 0, 100, 0.001, 0.0005)},${mapRange(
                    animation.scale,
                    0,
                    100,
                    0.004,
                    0.002
                  )}`}
                  seed="0"
                  type="turbulence"
                />
                <feColorMatrix
                  ref={feColorMatrixRef}
                  in="undulation"
                  type="hueRotate"
                  values="180"
                />
                <feColorMatrix
                  in="dist"
                  result="circulation"
                  type="matrix"
                  values="4 0 0 0 1  4 0 0 0 1  4 0 0 0 1  1 0 0 0 0"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="circulation"
                  scale={displacementScale}
                  result="dist"
                />
                <feDisplacementMap
                  in="dist"
                  in2="undulation"
                  scale={displacementScale}
                  result="output"
                />
              </filter>
            </defs>
          </svg>
        )}
        <div
          style={{
            backgroundColor: color,
            maskImage: BLOB_MASK,
            WebkitMaskImage: BLOB_MASK,
            maskSize: sizing === "stretch" ? "100% 100%" : "cover",
            WebkitMaskSize: sizing === "stretch" ? "100% 100%" : "cover",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
            width: "100%",
            height: "100%",
          }}
        />
      </div>
    </div>
  );
}
