"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { format } from "date-fns";
import { useAura } from "@/lib/store";
import { outstandingWork, daysUntil, formatMinutes, minutesOnDay } from "@/lib/derive";
import type { ReflectRequest } from "@/lib/ai";
import { PageTitle } from "@/components/ui/PageTitle";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PillButton } from "@/components/ui/PillButton";
import { Heatmap } from "@/components/charts/Heatmap";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

const MOODS = [
  { value: 1, label: "rough" },
  { value: 2, label: "meh" },
  { value: 3, label: "okay" },
  { value: 4, label: "good" },
  { value: 5, label: "great" },
] as const;

export default function ReflectPage() {
  const subjects = useAura((s) => s.subjects);
  const sessions = useAura((s) => s.sessions);
  const dailyLogs = useAura((s) => s.dailyLogs);
  const saveReflection = useAura((s) => s.saveReflection);
  const setMood = useAura((s) => s.setMood);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");
  const log = dailyLogs[today];
  const todayMin = useMemo(() => minutesOnDay(sessions, today), [sessions, today]);

  const todaySessions = useMemo(
    () => sessions.filter((s) => format(new Date(s.startedAt), "yyyy-MM-dd") === today),
    [sessions, today]
  );
  const touchedCodes = useMemo(() => {
    const ids = new Set(todaySessions.map((s) => s.subjectId));
    return subjects.filter((s) => ids.has(s.id)).map((s) => s.code);
  }, [todaySessions, subjects]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: ReflectRequest = {
        date: today,
        totalMinutes: todayMin,
        sessions: todaySessions.map((s) => ({
          subjectCode: subjects.find((x) => x.id === s.subjectId)?.code ?? "?",
          category: s.category ?? "general",
          minutes: s.durationMinutes,
          ...(s.note ? { note: s.note } : {}),
        })),
        subjectsTouched: touchedCodes,
        outstanding: outstandingWork(subjects)
          .slice(0, 10)
          .map(({ subjectCode, description }) => ({ subjectCode, description })),
        examHorizon: subjects
          .filter((s) => !s.archived && s.examDate && daysUntil(s.examDate) >= 0)
          .map((s) => ({ subjectCode: s.code, daysLeft: daysUntil(s.examDate!) })),
        ...(log?.mood ? { mood: log.mood } : {}),
      };
      const res = await fetch("/api/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { reflection?: string; message?: string };
      if (!res.ok || !data.reflection) {
        setError(data.message ?? "Something went wrong.");
      } else {
        saveReflection(today, data.reflection);
      }
    } catch {
      setError("Couldn't reach the reflection service — are you offline?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageTitle outline="Reflect" italic="how did it really go?" kicker="end of day" />

      {/* today summary */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl sm:grid-cols-4" style={{ border: "1px solid var(--line)", background: "var(--line)" }}>
        {[
          { label: "logged", node: <span className="font-mono"><AnimatedNumber value={Math.floor(todayMin / 60)} />h <AnimatedNumber value={todayMin % 60} />m</span> },
          { label: "sessions", node: <span className="font-mono"><AnimatedNumber value={todaySessions.length} /></span> },
          { label: "subjects", node: <span className="font-mono"><AnimatedNumber value={touchedCodes.length} /></span> },
          {
            label: "mood",
            node: (
              <div className="flex gap-1.5">
                {MOODS.map((m) => (
                  <motion.button
                    key={m.value}
                    whileHover={{ scale: 1.2, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setMood(today, m.value)}
                    aria-label={`Mood: ${m.label}`}
                    aria-pressed={log?.mood === m.value}
                    className="h-6 w-6 rounded-full text-[0.6rem]"
                    style={{
                      border: "1px solid var(--line-strong)",
                      background: log?.mood === m.value ? "var(--aura-coral)" : "transparent",
                    }}
                  >
                    {m.value}
                  </motion.button>
                ))}
              </div>
            ),
          },
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-2 px-6 py-5" style={{ background: "color-mix(in srgb, var(--paper-raised) 82%, transparent)" }}>
            <span className="microlabel">{s.label}</span>
            <span className="text-2xl sm:text-3xl">{s.node}</span>
          </div>
        ))}
      </div>

      <SectionHeading
        kicker="claude reads your day"
        right={
          <PillButton tone="solid" size="sm" onClick={generate} disabled={loading}>
            {loading ? "Reflecting…" : log?.aiReflection ? "Regenerate" : "Generate reflection"}
          </PillButton>
        }
      >
        Today&rsquo;s reflection
      </SectionHeading>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 py-8"
          >
            {/* breathing dots while Claude thinks */}
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-3 w-3 rounded-full"
                style={{ background: "var(--aura-coral)" }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
            <span className="font-display italic" style={{ color: "var(--ink-soft)" }}>
              reading your day…
            </span>
          </motion.div>
        )}

        {!loading && error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl px-5 py-4"
            style={{ border: "1px solid var(--aura-coral)" }}
          >
            <p className="text-sm">{error}</p>
            <p className="mt-1 text-xs" style={{ color: "var(--ink-soft)" }}>
              Everything else keeps working — reflections just need a free <code className="font-mono">GEMINI_API_KEY</code> (from aistudio.google.com) in <code className="font-mono">.env.local</code>.
            </p>
          </motion.div>
        )}

        {!loading && !error && log?.aiReflection && (
          <motion.article
            key={log.reflectionGeneratedAt ?? "reflection"}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl rounded-3xl px-7 py-6 leading-relaxed"
            style={{ border: "1px solid var(--line)", background: "color-mix(in srgb, var(--paper-raised) 80%, transparent)", boxShadow: "var(--shadow-soft)" }}
          >
            <ReflectionText text={log.aiReflection} />
            {log.reflectionGeneratedAt && (
              <p className="microlabel mt-5">
                generated {format(new Date(log.reflectionGeneratedAt), "HH:mm")}
              </p>
            )}
          </motion.article>
        )}

        {!loading && !error && !log?.aiReflection && (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-display max-w-md py-6 text-xl italic"
            style={{ color: "var(--ink-faint)" }}
          >
            When the day is done, let Claude look at what you actually did — and
            what tomorrow should look like.
          </motion.p>
        )}
      </AnimatePresence>

      <SectionHeading kicker="the semester so far">Every day counts</SectionHeading>
      <Heatmap sessions={sessions} />

      {/* previous reflections */}
      {Object.values(dailyLogs).filter((l) => l.aiReflection && l.date !== today).length > 0 && (
        <>
          <SectionHeading kicker="archive">Past reflections</SectionHeading>
          <div className="flex flex-col gap-4">
            {Object.values(dailyLogs)
              .filter((l) => l.aiReflection && l.date !== today)
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 14)
              .map((l) => (
                <details key={l.date} className="rounded-2xl px-5 py-4" style={{ border: "1px solid var(--line)" }}>
                  <summary className="cursor-pointer font-display italic">
                    {format(new Date(l.date), "EEEE d MMMM")}{" "}
                    <span className="microlabel ml-2">{formatMinutes(l.totalMinutes)}</span>
                  </summary>
                  <div className="mt-3">
                    <ReflectionText text={l.aiReflection!} />
                  </div>
                </details>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Tiny markdown-ish renderer: **bold** headings, bullets, numbered lines. */
function ReflectionText({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      {text.split("\n").map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        const escaped = trimmed
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        const bolded = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        const isBullet = /^[-•]\s/.test(trimmed);
        const isNumbered = /^\d+\.\s/.test(trimmed);
        return (
          <p
            key={i}
            className={isBullet || isNumbered ? "pl-4" : ""}
            dangerouslySetInnerHTML={{ __html: bolded }}
          />
        );
      })}
    </div>
  );
}
