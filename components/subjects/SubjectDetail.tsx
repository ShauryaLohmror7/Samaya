"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { format } from "date-fns";
import { useAura } from "@/lib/store";
import {
  subjectCompletion,
  trackProgress,
  minutesByCategory,
  daysUntil,
  formatMinutes,
} from "@/lib/derive";
import { categoryLabel, sessionCategoryOptions, subjectWeeklyTracks } from "@/lib/categories";
import { SceneAura } from "@/components/atmosphere/SceneAura";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { PillButton } from "@/components/ui/PillButton";
import { Field, TextInput, NumberInput, Select } from "@/components/ui/inputs";
import { WeeklyGrid } from "./WeeklyGrid";
import { ScoreTrend } from "./ScoreTrend";
import { SubjectForm } from "./SubjectForm";
import { AURA_HUE_VAR, type SessionCategory, type Status } from "@/lib/types";

const STATUS_LABEL: Record<Status, string> = {
  todo: "todo",
  in_progress: "in progress",
  done: "done",
};

export function SubjectDetail({ id }: { id: string }) {
  const router = useRouter();
  const hasHydrated = useAura((s) => s.hasHydrated);
  const subjects = useAura((s) => s.subjects);
  const sessions = useAura((s) => s.sessions);
  const {
    updatePastPaper,
    addPastPaper,
    deletePastPaper,
    addFocusTopic,
    toggleFocusTopic,
    deleteFocusTopic,
    cycleMilestoneStatus,
    addMilestone,
    deleteMilestone,
    logSession,
    deleteSession,
    updateSubject,
    deleteSubject,
    addCustomAspect,
  } = useAura();

  const subject = subjects.find((s) => s.id === id);

  const [editOpen, setEditOpen] = useState(false);
  const [paperLabel, setPaperLabel] = useState("");
  const [aspectLabel, setAspectLabel] = useState("");
  const [topicText, setTopicText] = useState("");
  const [milestoneLabel, setMilestoneLabel] = useState("");
  // manual log form
  const [logH, setLogH] = useState(0);
  const [logM, setLogM] = useState(30);
  const [logCat, setLogCat] = useState<SessionCategory>("general");
  const [logWeek, setLogWeek] = useState<number | "">("");
  const [logNote, setLogNote] = useState("");
  const [logDate, setLogDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const subjectSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.subjectId === id)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [sessions, id]
  );
  const totalMin = subjectSessions.reduce((a, s) => a + s.durationMinutes, 0);
  const byCategory = useMemo(() => minutesByCategory(subjectSessions), [subjectSessions]);
  const categoryOptions = useMemo(() => sessionCategoryOptions(subject), [subject]);

  useEffect(() => {
    if (!categoryOptions.some((option) => option.value === logCat)) {
      setLogCat("general");
    }
  }, [categoryOptions, logCat]);

  if (!subject) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="font-display text-2xl italic" style={{ color: "var(--ink-soft)" }}>
          {hasHydrated ? "This subject doesn't exist (anymore)." : "Opening…"}
        </p>
        {hasHydrated && (
          <Link href="/" className="microlabel underline underline-offset-4">
            back to today
          </Link>
        )}
      </div>
    );
  }

  const hue = AURA_HUE_VAR[subject.color];
  const completion = subjectCompletion(subject);
  const days = subject.examDate ? daysUntil(subject.examDate) : null;

  const submitManualLog = (e: React.FormEvent) => {
    e.preventDefault();
    const minutes = logH * 60 + logM;
    if (minutes < 1) return;
    logSession({
      subjectId: subject.id,
      category: logCat,
      ...(logWeek !== "" ? { weekRef: Number(logWeek) } : {}),
      startedAt: new Date(`${logDate}T${format(new Date(), "HH:mm")}`).toISOString(),
      durationMinutes: minutes,
      source: "manual",
      ...(logNote.trim() ? { note: logNote.trim() } : {}),
    });
    setLogNote("");
  };

  return (
    <div className="pt-2">
      <SceneAura palette={subject.aurora} />

      {/* header */}
      <header className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-outline leading-none"
              style={{ fontSize: "clamp(3.5rem, 12vw, 8rem)" }}
            >
              {subject.code}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="font-display mt-2 max-w-xl text-xl italic sm:text-2xl"
              style={{ color: "var(--ink-soft)", fontVariationSettings: "'opsz' 100, 'SOFT' 80" }}
            >
              {subject.name}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-3 font-mono text-xs"
              style={{ color: "var(--ink-soft)" }}
            >
              {subject.professor && <>{subject.professor} · </>}
              {subject.kind === "project" ? "project" : "exam course"} ·{" "}
              {subject.totalWeeks} weeks
              {subject.examDate && (
                <>
                  {" · "}
                  <span style={{ color: days != null && days <= 14 ? hue : undefined }}>
                    {subject.kind === "project" ? "deadline" : "exam"}{" "}
                    {format(new Date(subject.examDate), "d MMM")}
                    {days != null && days >= 0 && <> — in {days}d</>}
                  </span>
                </>
              )}
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
            className="flex items-center gap-5"
          >
            <ProgressRing value={completion} color={hue} size={96} stroke={7}>
              <div className="text-center">
                <span className="font-mono text-lg tabular">
                  <AnimatedNumber value={completion * 100} />
                </span>
                <span className="font-mono text-xs">%</span>
              </div>
            </ProgressRing>
            <div className="flex flex-col gap-2">
              <PillButton size="sm" onClick={() => setEditOpen(true)}>
                Edit
              </PillButton>
              <PillButton
                size="sm"
                tone="ghost"
                onClick={() => {
                  if (confirm(`Delete ${subject.code} and keep its logged sessions?`)) {
                    deleteSubject(subject.id);
                    router.push("/");
                  }
                }}
              >
                Delete
              </PillButton>
            </div>
          </motion.div>
        </div>
        <motion.div
          className="rule mt-6"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.2, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: "left", borderColor: "var(--line-strong)" }}
        />
      </header>

      {/* weekly grid or project milestones */}
      {subject.kind === "project" ? (
        <>
          <SectionHeading kicker="the real work">Milestones</SectionHeading>
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {(subject.milestones ?? []).map((m) => (
                <motion.li
                  key={m.id}
                  layout
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  className="group flex items-center gap-4 rounded-2xl px-4 py-3"
                  style={{ border: "1px solid var(--line)", background: "color-mix(in srgb, var(--paper-raised) 75%, transparent)" }}
                >
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => cycleMilestoneStatus(subject.id, m.id)}
                    aria-label={`${m.label}: ${STATUS_LABEL[m.status]} — tap to advance`}
                    className="relative h-6 w-6 shrink-0 rounded-full"
                    style={{ border: `1.5px solid ${m.status === "todo" ? "var(--line-strong)" : hue}` }}
                  >
                    <motion.span
                      className="absolute inset-0.5 rounded-full"
                      initial={false}
                      animate={{ scale: m.status === "todo" ? 0 : 1 }}
                      transition={{ type: "spring", stiffness: 420, damping: 20 }}
                      style={{
                        background:
                          m.status === "in_progress"
                            ? `linear-gradient(90deg, ${hue} 50%, transparent 50%)`
                            : hue,
                      }}
                    />
                  </motion.button>
                  <span className={`flex-1 text-sm ${m.status === "done" ? "line-through opacity-50" : ""}`}>
                    {m.label}
                  </span>
                  <span className="microlabel">{STATUS_LABEL[m.status]}</span>
                  <button
                    onClick={() => deleteMilestone(subject.id, m.id)}
                    aria-label={`Delete milestone ${m.label}`}
                    className="opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
                  >
                    ×
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (milestoneLabel.trim()) {
                addMilestone(subject.id, milestoneLabel.trim());
                setMilestoneLabel("");
              }
            }}
            className="mt-3 flex items-end gap-3"
          >
            <div className="flex-1">
              <TextInput
                value={milestoneLabel}
                onChange={(e) => setMilestoneLabel(e.target.value)}
                placeholder="Add a milestone…"
                aria-label="New milestone"
              />
            </div>
            <PillButton size="sm" type="submit">
              Add
            </PillButton>
          </form>
        </>
      ) : (
        <>
          <SectionHeading
            kicker="week by week"
            right={
              <span className="flex items-center gap-4">
                <span className="font-mono text-xs" style={{ color: "var(--ink-soft)" }}>
                  {subjectWeeklyTracks(subject)
                    .map((t) => `${t.label[0]} ${trackProgress(subject, t.key).done}/${subject.totalWeeks}`)
                    .join(" · ")}
                </span>
                <span className="flex items-center gap-1.5" aria-label="Number of weeks">
                  <button
                    onClick={() => updateSubject(subject.id, { totalWeeks: Math.max(1, subject.totalWeeks - 1) })}
                    aria-label="One week fewer"
                    className="h-6 w-6 rounded-full font-mono text-xs transition-transform hover:scale-110"
                    style={{ border: "1px solid var(--line-strong)" }}
                  >
                    −
                  </button>
                  <span className="font-mono text-xs tabular" style={{ minWidth: "3.5rem", textAlign: "center" }}>
                    {subject.totalWeeks} wks
                  </span>
                  <button
                    onClick={() => updateSubject(subject.id, { totalWeeks: Math.min(30, subject.totalWeeks + 1) })}
                    aria-label="One week more"
                    className="h-6 w-6 rounded-full font-mono text-xs transition-transform hover:scale-110"
                    style={{ border: "1px solid var(--line-strong)" }}
                  >
                    +
                  </button>
                </span>
              </span>
            }
          >
            Review grid
          </SectionHeading>
          <WeeklyGrid subject={subject} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (aspectLabel.trim()) {
                addCustomAspect(subject.id, aspectLabel.trim());
                setAspectLabel("");
              }
            }}
            className="mt-3 flex items-end gap-3"
          >
            <div className="flex-1">
              <TextInput
                value={aspectLabel}
                onChange={(e) => setAspectLabel(e.target.value)}
                placeholder='e.g. "Extra homework"'
                aria-label="New review aspect"
              />
            </div>
            <PillButton size="sm" type="submit">
              Add aspect
            </PillButton>
          </form>
        </>
      )}

      {/* past papers */}
      <SectionHeading kicker="exam practice">Past papers</SectionHeading>
      <div className="grid gap-8 lg:grid-cols-[1fr_minmax(260px,320px)]">
        <div>
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {subject.pastPapers.map((p) => (
                <motion.li
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="group flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ border: "1px solid var(--line)", background: "color-mix(in srgb, var(--paper-raised) 75%, transparent)" }}
                >
                  <button
                    onClick={() =>
                      updatePastPaper(subject.id, p.id, {
                        status: p.status === "todo" ? "in_progress" : p.status === "in_progress" ? "done" : "todo",
                      })
                    }
                    aria-label={`${p.label}: ${STATUS_LABEL[p.status]} — tap to advance`}
                    className="relative h-6 w-6 shrink-0 rounded-full"
                    style={{ border: `1.5px solid ${p.status === "todo" ? "var(--line-strong)" : hue}` }}
                  >
                    <motion.span
                      className="absolute inset-0.5 rounded-full"
                      initial={false}
                      animate={{ scale: p.status === "todo" ? 0 : 1 }}
                      transition={{ type: "spring", stiffness: 420, damping: 20 }}
                      style={{
                        background:
                          p.status === "in_progress"
                            ? `linear-gradient(90deg, ${hue} 50%, transparent 50%)`
                            : hue,
                      }}
                    />
                  </button>
                  <span className={`flex-1 text-sm ${p.status === "done" ? "opacity-60" : ""}`}>{p.label}</span>
                  <label className="flex items-center gap-1 font-mono text-xs" style={{ color: "var(--ink-soft)" }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="–"
                      value={p.scorePercent ?? ""}
                      onChange={(e) =>
                        updatePastPaper(subject.id, p.id, {
                          scorePercent: e.target.value === "" ? undefined : Math.min(100, Number(e.target.value)),
                        })
                      }
                      aria-label={`Score for ${p.label}`}
                      className="w-12 bg-transparent text-right outline-none"
                      style={{ borderBottom: "1px solid var(--line)" }}
                    />
                    %
                  </label>
                  <button
                    onClick={() => deletePastPaper(subject.id, p.id)}
                    aria-label={`Delete ${p.label}`}
                    className="opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
                  >
                    ×
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (paperLabel.trim()) {
                addPastPaper(subject.id, paperLabel.trim());
                setPaperLabel("");
              }
            }}
            className="mt-3 flex items-end gap-3"
          >
            <div className="flex-1">
              <TextInput
                value={paperLabel}
                onChange={(e) => setPaperLabel(e.target.value)}
                placeholder='e.g. "WS22/23 Endterm"'
                aria-label="New past paper"
              />
            </div>
            <PillButton size="sm" type="submit">
              Add paper
            </PillButton>
          </form>
        </div>
        <ScoreTrend papers={subject.pastPapers} color={hue} />
      </div>

      {/* focus topics */}
      <SectionHeading kicker="go deeper on">Focus topics</SectionHeading>
      <ul className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {subject.focusTopics.map((t) => (
            <motion.li
              key={t.id}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              className="group flex items-center gap-3 py-1"
            >
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={() => toggleFocusTopic(subject.id, t.id)}
                role="checkbox"
                aria-checked={t.done}
                aria-label={t.text}
                className="relative h-5 w-5 shrink-0 rounded-full"
                style={{ border: `1.5px solid ${t.done ? hue : "var(--line-strong)"}` }}
              >
                <motion.span
                  className="absolute inset-0.5 rounded-full"
                  initial={false}
                  animate={{ scale: t.done ? 1 : 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 18 }}
                  style={{ background: hue }}
                />
              </motion.button>
              <span className="relative flex-1 text-sm">
                {t.text}
                <motion.span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-px w-full"
                  style={{ background: "var(--ink-soft)", transformOrigin: "left" }}
                  initial={false}
                  animate={{ scaleX: t.done ? 1 : 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
              <button
                onClick={() => deleteFocusTopic(subject.id, t.id)}
                aria-label={`Delete topic ${t.text}`}
                className="opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
              >
                ×
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (topicText.trim()) {
            addFocusTopic(subject.id, topicText.trim());
            setTopicText("");
          }
        }}
        className="mt-3 flex items-end gap-3"
      >
        <div className="flex-1">
          <TextInput
            value={topicText}
            onChange={(e) => setTopicText(e.target.value)}
            placeholder='e.g. "prove AVL rotations without notes"'
            aria-label="New focus topic"
          />
        </div>
        <PillButton size="sm" type="submit">
          Add topic
        </PillButton>
      </form>

      {/* time */}
      <SectionHeading
        kicker="honest hours"
        right={
          <span className="font-display text-2xl italic tabular" style={{ color: "var(--ink)" }}>
            {formatMinutes(totalMin)}
          </span>
        }
      >
        Time on {subject.code}
      </SectionHeading>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          {/* category breakdown bars */}
          <ul className="flex flex-col gap-3">
            {[...byCategory.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([cat, min]) => (
                <li key={cat} className="flex items-center gap-3">
                  <span className="microlabel w-24 shrink-0">{categoryLabel(cat, subject)}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: hue }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${totalMin ? (min / totalMin) * 100 : 0}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right font-mono text-xs tabular" style={{ color: "var(--ink-soft)" }}>
                    {formatMinutes(min)}
                  </span>
                </li>
              ))}
            {byCategory.size === 0 && (
              <li className="font-display italic" style={{ color: "var(--ink-faint)" }}>
                Nothing logged yet — the timer or the form below will fix that.
              </li>
            )}
          </ul>

          {/* recent sessions */}
          <ul className="mt-6 flex flex-col">
            <AnimatePresence initial={false}>
              {subjectSessions.slice(0, 8).map((s) => (
                <motion.li
                  key={s.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="rule group flex items-center gap-3 py-2.5 text-sm first:border-t-0"
                >
                  <span className="font-mono text-xs tabular" style={{ color: "var(--ink-faint)" }}>
                    {format(new Date(s.startedAt), "d MMM HH:mm")}
                  </span>
                  <span className="microlabel">{categoryLabel(s.category, subject)}{s.weekRef ? ` · w${s.weekRef}` : ""}</span>
                  <span className="flex-1 truncate text-xs" style={{ color: "var(--ink-soft)" }}>
                    {s.note}
                  </span>
                  <span className="font-mono text-xs tabular">{formatMinutes(s.durationMinutes)}</span>
                  <span className="microlabel opacity-50">{s.source}</span>
                  <button
                    onClick={() => deleteSession(s.id)}
                    aria-label="Delete session"
                    className="opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
                  >
                    ×
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>

        {/* manual log */}
        <form
          onSubmit={submitManualLog}
          className="flex h-fit flex-col gap-5 rounded-3xl p-6"
          style={{ border: "1px solid var(--line)", background: "color-mix(in srgb, var(--paper-raised) 75%, transparent)" }}
        >
          <p className="font-display text-lg italic">Log time by hand</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Hours">
              <NumberInput min={0} max={16} value={logH} onChange={(e) => setLogH(Math.max(0, Number(e.target.value) || 0))} />
            </Field>
            <Field label="Minutes">
              <NumberInput min={0} max={59} value={logM} onChange={(e) => setLogM(Math.min(59, Math.max(0, Number(e.target.value) || 0)))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <Select value={logCat} onChange={(e) => setLogCat(e.target.value as SessionCategory)}>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Week (optional)">
              <NumberInput
                min={1}
                max={subject.totalWeeks}
                value={logWeek}
                placeholder="–"
                onChange={(e) => setLogWeek(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </Field>
          </div>
          <Field label="Date">
            <TextInput type="date" value={logDate} max={format(new Date(), "yyyy-MM-dd")} onChange={(e) => setLogDate(e.target.value)} />
          </Field>
          <Field label="Note (optional)">
            <TextInput value={logNote} onChange={(e) => setLogNote(e.target.value)} placeholder="what did you actually do?" />
          </Field>
          <PillButton type="submit" tone="solid" className="self-end">
            Log {logH > 0 && `${logH}h `}
            {logM}m
          </PillButton>
        </form>
      </div>

      <SubjectForm key={editOpen ? "open" : "closed"} open={editOpen} onClose={() => setEditOpen(false)} subject={subject} />
    </div>
  );
}
