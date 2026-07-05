"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { eachDayOfInterval, format, getDay, subDays } from "date-fns";
import type { StudySession } from "@/lib/types";
import { formatMinutes } from "@/lib/derive";

/**
 * Hand-built semester heatmap: one cell per day (last ~18 weeks),
 * warmth of the aura scale = minutes studied. Cells pop in staggered.
 */
export function Heatmap({ sessions }: { sessions: StudySession[] }) {
  const { weeks, byDay, max } = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 7 * 18 - 1);
    const days = eachDayOfInterval({ start, end });
    const byDay = new Map<string, number>();
    for (const s of sessions) {
      const k = format(new Date(s.startedAt), "yyyy-MM-dd");
      byDay.set(k, (byDay.get(k) ?? 0) + s.durationMinutes);
    }
    const max = Math.max(60, ...byDay.values());
    // group into columns of weeks, Monday-first
    const weeks: string[][] = [];
    let col: string[] = [];
    for (const d of days) {
      if (getDay(d) === 1 && col.length > 0) {
        weeks.push(col);
        col = [];
      }
      col.push(format(d, "yyyy-MM-dd"));
    }
    if (col.length) weeks.push(col);
    return { weeks, byDay, max };
  }, [sessions]);

  const cellColor = (min: number): string => {
    if (min === 0) return "var(--line)";
    const t = Math.min(1, min / max);
    if (t < 0.34) return "var(--aura-peach)";
    if (t < 0.67) return "var(--aura-coral)";
    return "var(--aura-orange)";
  };

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-1" role="img" aria-label="Study minutes per day heatmap">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => {
              const min = byDay.get(day) ?? 0;
              return (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, scale: 0.4 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: wi * 0.02 + di * 0.008,
                    type: "spring",
                    stiffness: 320,
                    damping: 20,
                  }}
                  whileHover={{ scale: 1.4 }}
                  className="h-3.5 w-3.5 rounded-[4px] sm:h-4 sm:w-4"
                  style={{ background: cellColor(min) }}
                  title={`${format(new Date(day), "d MMM")}: ${min ? formatMinutes(min) : "nothing"}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="microlabel">less</span>
        {["var(--line)", "var(--aura-peach)", "var(--aura-coral)", "var(--aura-orange)"].map((c) => (
          <span key={c} className="h-3 w-3 rounded-[3px]" style={{ background: c }} />
        ))}
        <span className="microlabel">more</span>
      </div>
    </div>
  );
}
