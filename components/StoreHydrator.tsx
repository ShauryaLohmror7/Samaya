"use client";

import { useEffect, useState } from "react";
import { useAura } from "@/lib/store";
import { effectiveTheme, themeOverride } from "@/lib/themes";

/**
 * Applies the effective theme (manual pick, or the night theme during
 * 20:00–07:00 when auto mode is on) and the aura-intensity multiplier to the
 * document once IndexedDB rehydration completes. Mirrors both to
 * localStorage so the pre-paint script avoids a flash. Renders nothing.
 */
export function StoreHydrator() {
  const hasHydrated = useAura((s) => s.hasHydrated);
  const settings = useAura((s) => s.settings);
  const [, setTick] = useState(0);

  // While auto mode is on, re-check the clock every minute.
  useEffect(() => {
    if (!settings.autoTheme) return;
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [settings.autoTheme]);

  useEffect(() => {
    if (!hasHydrated) return;
    const override = themeOverride();
    const theme = override ?? effectiveTheme(settings);
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.setProperty(
      "--aura-user",
      String(settings.auraIntensity ?? 1)
    );
    if (override) return; // view-only — don't persist an override
    try {
      localStorage.setItem("aura-theme", theme);
      localStorage.setItem("aura-intensity", String(settings.auraIntensity ?? 1));
    } catch {
      /* non-fatal */
    }
  });

  return null;
}
