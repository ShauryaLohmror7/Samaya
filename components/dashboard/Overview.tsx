"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { format } from "date-fns";
import { useAura } from "@/lib/store";
import {
  subjectCompletion,
  minutesOnDay,
  dayStreak,
  daysUntil,
  formatMinutes,
} from "@/lib/derive";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PillButton } from "@/components/ui/PillButton";
import { SubjectForm } from "@/components/subjects/SubjectForm";
import { AURA_HUE_VAR } from "@/lib/types";
import { AURORAS } from "@/lib/aura-palettes";

const cardSpring = { type: "spring", stiffness: 260, damping: 24 } as const;

export function Overview() {
  const subjectsAll = useAura((s) => s.subjects);
  const sessions = useAura((s) => s.sessions);
  const [addOpen, setAddOpen] = useState(false);

  const subjects = useMemo(() => subjectsAll.filter((s) => !s.archived), [subjectsAll]);
  const todayMin = useMemo(
    () => minutesOnDay(sessions, format(new Date(), "yyyy-MM-dd")),
    [sessions]
  );
  const streak = useMemo(() => dayStreak(sessions), [sessions]);

  const nextExam = useMemo(() => {
    const dated = subjects
      .filter((s) => s.examDate && daysUntil(s.examDate) >= 0)
      .sort((a, b) => daysUntil(a.examDate!) - daysUntil(b.examDate!));
    return dated[0] ?? null;
  }, [subjects]);

  const stats = [
    {
      label: "logged today",
      value: todayMin,
      render: (
        <span className="font-mono">
          <AnimatedNumber value={Math.floor(todayMin / 60)} /> h{" "}
          <AnimatedNumber value={todayMin % 60} /> m
        </span>
      ),
    },
    {
      label: "day streak",
      value: streak,
      render: (
        <span className="font-mono">
          <AnimatedNumber value={streak} />{" "}
          <span className="text-base" style={{ color: "var(--ink-soft)" }}>
            {streak === 1 ? "day" : "days"}
          </span>
        </span>
      ),
    },
    {
      label: nextExam ? `next: ${nextExam.code}` : "next exam",
      value: nextExam ? daysUntil(nextExam.examDate!) : null,
      render: nextExam ? (
        <span className="font-mono">
          <AnimatedNumber value={daysUntil(nextExam.examDate!)} />{" "}
          <span className="text-base" style={{ color: "var(--ink-soft)" }}>
            days
          </span>
        </span>
      ) : (
        <span className="font-display text-2xl italic" style={{ color: "var(--ink-faint)" }}>
          none set
        </span>
      ),
    },
  ];

  return (
    <div className="mt-16 sm:mt-24">
      {/* stat strip */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        variants={{ show: { transition: { staggerChildren: 0.12 } } }}
        className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl sm:grid-cols-3"
        style={{ border: "1px solid var(--line)", background: "var(--line)" }}
      >
        {stats.map((s) => (
          <motion.div
            key={s.label}
            variants={{
              hidden: { opacity: 0, y: 24 },
              show: { opacity: 1, y: 0, transition: cardSpring },
            }}
            className="flex flex-col gap-2 px-7 py-6"
            style={{ background: "color-mix(in srgb, var(--paper-raised) 82%, transparent)" }}
          >
            <span className="microlabel">{s.label}</span>
            <span className="text-4xl sm:text-5xl">{s.render}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* subjects */}
      <SectionHeading
        kicker="this semester"
        right={
          <PillButton size="sm" onClick={() => setAddOpen(true)}>
            + Add subject
          </PillButton>
        }
      >
        Subjects
      </SectionHeading>

      <motion.ul
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {subjects.map((subj) => {
          const completion = subjectCompletion(subj);
          const total = sessions
            .filter((x) => x.subjectId === subj.id)
            .reduce((a, x) => a + x.durationMinutes, 0);
          const days = subj.examDate ? daysUntil(subj.examDate) : null;
          const [c0, , c2] = AURORAS[subj.aurora];
          return (
            <motion.li
              key={subj.id}
              variants={{
                hidden: { opacity: 0, y: 28, scale: 0.97 },
                show: { opacity: 1, y: 0, scale: 1, transition: cardSpring },
              }}
              whileHover={{ y: -5 }}
            >
              <Link
                href={`/subjects/${subj.id}`}
                className="group relative block overflow-hidden rounded-3xl p-6"
                style={{
                  border: "1px solid var(--line)",
                  background: "color-mix(in srgb, var(--paper-raised) 80%, transparent)",
                  boxShadow: "var(--shadow-soft)",
                }}
              >
                {/* the subject's aurora seeps in from the corner on hover */}
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-40 blur-2xl transition-opacity duration-500 group-hover:opacity-75"
                  style={{ background: `radial-gradient(circle, ${c0}, ${c2} 60%, transparent 75%)` }}
                />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-display text-3xl"
                        style={{ fontVariationSettings: "'opsz' 100, 'SOFT' 50" }}
                      >
                        {subj.code}
                      </span>
                      {subj.kind === "project" && (
                        <span className="microlabel rounded-full px-2 py-0.5" style={{ border: "1px solid var(--line-strong)" }}>
                          project
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs" style={{ color: "var(--ink-soft)" }}>
                      {subj.name}
                    </p>
                    <p className="mt-3 font-mono text-xs" style={{ color: "var(--ink-soft)" }}>
                      {formatMinutes(total)} logged
                      {days != null && days >= 0 && (
                        <> · <span style={{ color: days <= 14 ? AURA_HUE_VAR[subj.color] : undefined }}>{days}d left</span></>
                      )}
                    </p>
                  </div>
                  <ProgressRing value={completion} color={AURA_HUE_VAR[subj.color]} size={62}>
                    <span className="font-mono text-[0.65rem] tabular">
                      {Math.round(completion * 100)}%
                    </span>
                  </ProgressRing>
                </div>
              </Link>
            </motion.li>
          );
        })}
      </motion.ul>

      <SubjectForm open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
