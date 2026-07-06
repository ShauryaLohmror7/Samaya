"use client";

/**
 * Golden maker's mark, bottom-left, persistent on every page. Latin letters
 * styled in the spirit of Devanagari — hung from a continuous top bar
 * (शिरोरेखा / shirorekha) in Fraunces serif, filled with a slow-shimmering
 * gold gradient. A watermark: low opacity, never intercepts clicks, and
 * carries a soft dual shadow so it stays legible on both light paper and
 * dark themes.
 */
export function Signature() {
  return (
    <div
      aria-label="Created by Shaurya Lohmror"
      className="fixed bottom-3 left-4 z-40 flex flex-col gap-0.5 select-none sm:bottom-4 sm:left-6"
      style={{ pointerEvents: "none" }}
    >
      <span
        className="microlabel"
        style={{ fontSize: "0.55rem", opacity: 0.5, letterSpacing: "0.22em" }}
      >
        created by
      </span>
      <span className="samaya-sign">Shaurya Lohmror</span>
    </div>
  );
}
