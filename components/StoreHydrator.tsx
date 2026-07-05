"use client";

import { useEffect } from "react";
import { useAura } from "@/lib/store";

/**
 * Keeps the document theme attribute in sync with the persisted setting
 * once IndexedDB rehydration completes. Renders nothing.
 */
export function StoreHydrator() {
  const hasHydrated = useAura((s) => s.hasHydrated);
  const theme = useAura((s) => s.settings.theme);

  useEffect(() => {
    if (!hasHydrated) return;
    document.documentElement.setAttribute("data-theme", theme === "night" ? "night" : "day");
    try {
      localStorage.setItem("aura-theme", theme);
    } catch {
      /* non-fatal */
    }
  }, [hasHydrated, theme]);

  return null;
}
