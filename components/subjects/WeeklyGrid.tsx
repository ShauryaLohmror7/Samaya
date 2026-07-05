"use client";

import { motion } from "motion/react";
import { useAura } from "@/lib/store";
import { trackProgress } from "@/lib/derive";
import { customCategoryId, subjectWeeklyTracks } from "@/lib/categories";
import { AURA_HUE_VAR, type Category, type CustomSessionCategory, type Status, type Subject } from "@/lib/types";

const NEXT: Record<Status, string> = {
  todo: "mark in progress",
  in_progress: "mark done",
  done: "reset",
};

/**
 * The heart of subject tracking: rows = tracks, columns = weeks 1..N,
 * each cell a 3-state toggle that fills with a soft spring.
 */
export function WeeklyGrid({ subject }: { subject: Subject }) {
  const cycleWeekStatus = useAura((s) => s.cycleWeekStatus);
  const deleteCustomAspect = useAura((s) => s.deleteCustomAspect);
  const hue = AURA_HUE_VAR[subject.color];
  const tracks = subjectWeeklyTracks(subject);

  return (
    <div className="overflow-x-auto pb-2" role="grid" aria-label="Weekly review grid">
      <table className="w-full border-separate" style={{ borderSpacing: "0 0.35rem" }}>
        <thead>
          <tr>
            <th aria-label="Track" className="sticky left-0 z-10 pr-4" style={{ background: "transparent" }} />
            {subject.weeks.map((w) => (
              <th key={w.week} className="px-1 pb-1 text-center font-mono text-[0.6rem] font-normal" style={{ color: "var(--ink-faint)" }}>
                {w.week}
              </th>
            ))}
            <th className="pl-3 text-right font-mono text-[0.6rem] font-normal" style={{ color: "var(--ink-faint)" }}>
              done
            </th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((track) => {
            const p = trackProgress(subject, track.key as Category | CustomSessionCategory);
            const trackCustomId = customCategoryId(track.key);
            return (
              <tr key={track.key}>
                <td className="sticky left-0 z-10 whitespace-nowrap pr-4 text-xs uppercase tracking-[0.14em]" style={{ color: "var(--ink-soft)", background: "transparent" }}>
                  <span className="flex items-center gap-2">
                    <span>{track.label}</span>
                    {trackCustomId && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete "${track.label}" from ${subject.code}? Logged sessions for it will move to General.`)) {
                            deleteCustomAspect(subject.id, trackCustomId);
                          }
                        }}
                        aria-label={`Delete ${track.label}`}
                        className="font-mono text-xs opacity-45 transition-opacity hover:opacity-100"
                        style={{ color: "var(--ink)" }}
                      >
                        x
                      </button>
                    )}
                  </span>
                </td>
                {subject.weeks.map((w) => {
                  const status = trackCustomId ? w.custom?.[trackCustomId] ?? "todo" : w[track.key as Category];
                  return (
                    <td key={w.week} className="px-1 text-center">
                      <motion.button
                        whileHover={{ scale: 1.25 }}
                        whileTap={{ scale: 0.85 }}
                        transition={{ type: "spring", stiffness: 500, damping: 22 }}
                        onClick={() => cycleWeekStatus(subject.id, w.week, track.key as Category | CustomSessionCategory)}
                        aria-label={`${track.label} week ${w.week}: ${status.replace("_", " ")} — ${NEXT[status]}`}
                        className="relative mx-auto block h-6 w-6 rounded-full"
                        style={{ border: `1.5px solid ${status === "todo" ? "var(--line-strong)" : hue}` }}
                      >
                        {/* fill springs in: half-moon for in_progress, full for done */}
                        <motion.span
                          className="absolute inset-0.5 rounded-full"
                          initial={false}
                          animate={{
                            scale: status === "todo" ? 0 : 1,
                            opacity: status === "todo" ? 0 : 1,
                          }}
                          transition={{ type: "spring", stiffness: 420, damping: 20 }}
                          style={{
                            background:
                              status === "in_progress"
                                ? `linear-gradient(90deg, ${hue} 50%, transparent 50%)`
                                : hue,
                          }}
                        />
                      </motion.button>
                    </td>
                  );
                })}
                <td className="whitespace-nowrap pl-3 text-right font-mono text-xs tabular" style={{ color: "var(--ink-soft)" }}>
                  {p.done}/{p.total}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="microlabel mt-2">tap a cell: todo → in progress → done</p>
    </div>
  );
}
