"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { format, isSameDay } from "date-fns";
import { useAura } from "@/lib/store";
import { formatMinutes } from "@/lib/derive";
import { categoryLabel } from "@/lib/categories";
import { PageTitle } from "@/components/ui/PageTitle";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PillButton } from "@/components/ui/PillButton";
import { Heatmap } from "@/components/charts/Heatmap";
import { DailyAtelier } from "@/components/ascii/DailyAtelier";
import { AURA_HUE_VAR, type SessionCategory } from "@/lib/types";

const CATS: (SessionCategory | "all")[] = ["all", "lecture", "homework", "tutorial", "past_paper", "general"];

export default function LogPage() {
  const sessions = useAura((s) => s.sessions);
  const subjects = useAura((s) => s.subjects);
  const deleteSession = useAura((s) => s.deleteSession);

  const [subjectFilter, setSubjectFilter] = useState<string | "all">("all");
  const [catFilter, setCatFilter] = useState<SessionCategory | "all">("all");

  const filtered = useMemo(
    () =>
      sessions
        .filter((s) => (subjectFilter === "all" ? true : s.subjectId === subjectFilter))
        .filter((s) => (catFilter === "all" ? true : (s.category ?? "general") === catFilter))
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [sessions, subjectFilter, catFilter]
  );

  // group by day
  const groups = useMemo(() => {
    const out: { day: string; items: typeof filtered }[] = [];
    for (const s of filtered) {
      const last = out[out.length - 1];
      if (last && isSameDay(new Date(last.day), new Date(s.startedAt))) last.items.push(s);
      else out.push({ day: s.startedAt, items: [s] });
    }
    return out;
  }, [filtered]);

  const subjectOf = (id: string) => subjects.find((x) => x.id === id);
  const totalFiltered = filtered.reduce((a, s) => a + s.durationMinutes, 0);

  return (
    <div>
      <PageTitle outline="Log" italic="every honest minute" kicker="history" />

      <SectionHeading kicker="study to reveal — every day mints a piece">
        The Atelier
      </SectionHeading>
      <DailyAtelier />

      <SectionHeading kicker="semester at a glance">Study heat</SectionHeading>
      <Heatmap sessions={sessions} />

      <SectionHeading
        kicker={`${filtered.length} sessions · ${formatMinutes(totalFiltered)}`}
        right={
          <div className="flex flex-wrap justify-end gap-1.5">
            <PillButton size="sm" active={subjectFilter === "all"} onClick={() => setSubjectFilter("all")}>
              All
            </PillButton>
            {subjects.map((s) => (
              <PillButton key={s.id} size="sm" active={subjectFilter === s.id} onClick={() => setSubjectFilter(subjectFilter === s.id ? "all" : s.id)}>
                {s.code}
              </PillButton>
            ))}
          </div>
        }
      >
        Sessions
      </SectionHeading>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {CATS.map((c) => (
          <PillButton key={c} size="sm" tone="ghost" active={catFilter === c} onClick={() => setCatFilter(c as SessionCategory | "all")}>
            {c.replace("_", " ")}
          </PillButton>
        ))}
      </div>

      {groups.length === 0 && (
        <p className="font-display py-10 text-xl italic" style={{ color: "var(--ink-faint)" }}>
          Nothing here yet. The timer on Today is waiting.
        </p>
      )}

      <div className="flex flex-col gap-8">
        {groups.map((g) => (
          <motion.section
            key={g.day.slice(0, 10)}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="font-display text-lg italic">
                {format(new Date(g.day), "EEEE d MMMM")}
              </h3>
              <span className="font-mono text-xs tabular" style={{ color: "var(--ink-soft)" }}>
                {formatMinutes(g.items.reduce((a, s) => a + s.durationMinutes, 0))}
              </span>
            </div>
            <ul
              className="overflow-hidden rounded-2xl"
              style={{ border: "1px solid var(--line)", background: "color-mix(in srgb, var(--paper-raised) 75%, transparent)" }}
            >
              <AnimatePresence initial={false}>
                {g.items.map((s) => {
                  const subj = subjectOf(s.subjectId);
                  return (
                    <motion.li
                      key={s.id}
                      layout
                      exit={{ opacity: 0, x: 30 }}
                      className="group flex items-center gap-3 px-4 py-3 text-sm [&+&]:border-t"
                      style={{ borderColor: "var(--line)" }}
                    >
                      <span className="font-mono text-xs tabular" style={{ color: "var(--ink-faint)" }}>
                        {format(new Date(s.startedAt), "HH:mm")}
                      </span>
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: subj ? AURA_HUE_VAR[subj.color] : "var(--line-strong)" }}
                      />
                      <span className="w-14 font-mono text-xs">{subj?.code ?? "?"}</span>
                      <span className="microlabel hidden sm:inline">
                        {categoryLabel(s.category, subj)}
                        {s.weekRef ? ` · w${s.weekRef}` : ""}
                      </span>
                      <span className="flex-1 truncate text-xs" style={{ color: "var(--ink-soft)" }}>
                        {s.note}
                      </span>
                      <span className="font-mono text-xs tabular">{formatMinutes(s.durationMinutes)}</span>
                      <span className="microlabel hidden opacity-50 sm:inline">{s.source}</span>
                      <button
                        onClick={() => deleteSession(s.id)}
                        aria-label="Delete session"
                        className="opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
                      >
                        ×
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </motion.section>
        ))}
      </div>
    </div>
  );
}
