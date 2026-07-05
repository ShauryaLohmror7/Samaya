"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAura } from "@/lib/store";
import { useAuraMood } from "@/lib/aura-mood";
import { rollQuote } from "@/lib/quotes";
import { TimerDigits } from "./TimerDigits";
import { TimerPiP, type TimerPiPHandle } from "./TimerPiP";
import { PillButton } from "@/components/ui/PillButton";
import { AURA_HUE_VAR } from "@/lib/types";
import { categoryLabel, isWeeklyCategory, sessionCategoryOptions } from "@/lib/categories";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function AuraTimer() {
  const hasHydrated = useAura((s) => s.hasHydrated);
  const timer = useAura((s) => s.timer);
  const allSubjects = useAura((s) => s.subjects);
  const subjects = useMemo(() => allSubjects.filter((x) => !x.archived), [allSubjects]);
  const settings = useAura((s) => s.settings);
  const {
    configureTimer,
    startFocus,
    pauseTimer,
    resumeTimer,
    stopTimer,
    completeFocus,
    completeBreak,
    startBreak,
    updateSettings,
  } = useAura();
  const setMood = useAuraMood((s) => s.setMood);

  const [now, setNow] = useState(() => Date.now());
  const [quote, setQuote] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const lastCompleted = useRef(timer.completedFocusCount);
  const pipRef = useRef<TimerPiPHandle>(null);

  const running = timer.endsAt != null;
  const paused = timer.pausedRemainingMs != null;

  const remainingMs = useMemo(() => {
    if (timer.phase === "idle") return timer.focusMinutes * 60_000;
    if (paused) return timer.pausedRemainingMs ?? 0;
    if (timer.endsAt) return Math.max(0, new Date(timer.endsAt).getTime() - now);
    return 0;
  }, [timer, paused, now]);

  const totalMs =
    (timer.phase === "break" ? timer.breakMinutes : timer.focusMinutes) * 60_000;
  const progress =
    timer.phase === "idle" ? 0 : Math.min(1, Math.max(0, 1 - remainingMs / totalMs));

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const digits = `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;

  // tick
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running]);

  // phase completion
  useEffect(() => {
    if (!running || remainingMs > 0) return;
    if (timer.phase === "focus") completeFocus();
    else if (timer.phase === "break") completeBreak();
  }, [running, remainingMs, timer.phase, completeFocus, completeBreak]);

  // reconcile a session that ended while the tab was closed
  useEffect(() => {
    if (!hasHydrated) return;
    const t = useAura.getState().timer;
    if (t.endsAt && new Date(t.endsAt).getTime() <= Date.now()) {
      if (t.phase === "focus") useAura.getState().completeFocus();
      else useAura.getState().completeBreak();
    }
  }, [hasHydrated]);

  // aura mood follows phase
  useEffect(() => {
    setMood(timer.phase === "idle" || paused ? "idle" : timer.phase);
  }, [timer.phase, paused, setMood]);

  // roll a fresh quote when a focus block completes
  useEffect(() => {
    if (timer.completedFocusCount > lastCompleted.current) {
      lastCompleted.current = timer.completedFocusCount;
      if (settings.quotesEnabled) setQuote((q) => rollQuote(q ?? undefined));
    }
  }, [timer.completedFocusCount, settings.quotesEnabled]);

  // document title mirrors the clock
  useEffect(() => {
    document.title = running
      ? `${digits} · ${timer.phase === "break" ? "break" : "focus"} — SAMAYA`
      : "SAMAYA — personal study platform";
    return () => {
      document.title = "SAMAYA — personal study platform";
    };
  }, [digits, running, timer.phase]);

  const subject = subjects.find((x) => x.id === timer.subjectId);
  const categoryOptions = sessionCategoryOptions(subject);
  const canStart = timer.subjectId != null;
  const weeklyCategory = isWeeklyCategory(timer.category);
  const beginFocus = () => {
    startFocus();
    void pipRef.current?.open();
  };

  return (
    <section aria-label="Aura timer" className="relative">
      {/* vertical serif side label, like the reference */}
      <span
        aria-hidden
        className="vertical-label absolute -left-1 top-1/2 hidden -translate-y-1/2 rotate-180 text-lg md:block lg:text-xl"
        style={{ color: "var(--ink)" }}
      >
        aura timer
      </span>

      <div className="mx-auto flex max-w-3xl flex-col items-center pt-2">
        {/* pill progress bar */}
        <div className="w-full max-w-xl px-4">
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Session progress"
            className="h-5 w-full rounded-full"
            style={{ border: "1.5px solid var(--ink)", padding: "3px" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--ink)", originX: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ ease: "linear", duration: 0.25 }}
            />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="font-mono text-sm tabular" style={{ color: "var(--ink-soft)" }}>
              {Math.round(progress * 100)}&thinsp;%
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={timer.phase + String(paused)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="microlabel"
              >
                {paused
                  ? "paused"
                  : timer.phase === "focus"
                    ? "focus"
                    : timer.phase === "break"
                      ? "break"
                      : "ready"}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* the clock */}
        <div className="my-2 sm:my-4">
          <TimerDigits text={digits} />
        </div>

        {/* context line */}
        <div className="min-h-6 text-center">
          {subject ? (
            <p className="font-mono text-xs tracking-wide" style={{ color: "var(--ink-soft)" }}>
              <span
                className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                style={{ background: AURA_HUE_VAR[subject.color] }}
              />
              {subject.code}
              {timer.category ? ` · ${categoryLabel(timer.category, subject)}` : ""}
              {timer.weekRef && weeklyCategory ? ` · week ${timer.weekRef}` : ""}
              {" · "}
              {timer.focusMinutes}/{timer.breakMinutes}
            </p>
          ) : (
            <p className="microlabel">pick a subject to begin</p>
          )}
        </div>
        <div className="mt-3 flex justify-center">
          <TimerPiP ref={pipRef} />
        </div>

        {/* ——— idle: configuration ——— */}
        <AnimatePresence mode="wait">
          {timer.phase === "idle" && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 flex w-full max-w-2xl flex-col items-center gap-5"
            >
              {/* subject */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {subjects.map((s) => (
                  <PillButton
                    key={s.id}
                    size="sm"
                    active={timer.subjectId === s.id}
                    aria-pressed={timer.subjectId === s.id}
                    onClick={() =>
                      configureTimer({
                        subjectId: timer.subjectId === s.id ? null : s.id,
                        category: null,
                        weekRef: null,
                      })
                    }
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background:
                          timer.subjectId === s.id ? "var(--paper)" : AURA_HUE_VAR[s.color],
                      }}
                    />
                    {s.code}
                  </PillButton>
                ))}
              </div>

              {/* category + week */}
              {subject && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex flex-wrap items-center justify-center gap-2"
                >
                  {categoryOptions.map((c) => (
                    <PillButton
                      key={c.value}
                      size="sm"
                      tone="ghost"
                      active={timer.category === c.value}
                      aria-pressed={timer.category === c.value}
                      onClick={() =>
                        configureTimer({
                          category: timer.category === c.value ? null : c.value,
                        })
                      }
                    >
                      {c.label}
                    </PillButton>
                  ))}
                  {weeklyCategory && (
                    <label className="microlabel flex items-center gap-2">
                      week
                      <input
                        type="number"
                        min={1}
                        max={subject.totalWeeks}
                        value={timer.weekRef ?? ""}
                        placeholder="–"
                        onChange={(e) =>
                          configureTimer({
                            weekRef: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="w-14 rounded-full bg-transparent px-2 py-1 text-center font-mono text-xs"
                        style={{ border: "1px solid var(--line-strong)", color: "var(--ink)" }}
                      />
                    </label>
                  )}
                </motion.div>
              )}

              {/* presets */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {settings.presets.map((p) => (
                  <PillButton
                    key={p.id}
                    size="sm"
                    active={timer.presetId === p.id && !customOpen}
                    aria-pressed={timer.presetId === p.id && !customOpen}
                    onClick={() => {
                      setCustomOpen(false);
                      configureTimer({
                        presetId: p.id,
                        focusMinutes: p.focusMinutes,
                        breakMinutes: p.breakMinutes,
                      });
                    }}
                  >
                    {p.name}
                    <span className="font-mono normal-case tracking-normal opacity-70">
                      {p.focusMinutes}/{p.breakMinutes}
                    </span>
                  </PillButton>
                ))}
                <PillButton
                  size="sm"
                  tone="ghost"
                  active={customOpen}
                  aria-pressed={customOpen}
                  onClick={() => {
                    setCustomOpen((v) => !v);
                    configureTimer({ presetId: null });
                  }}
                >
                  Custom
                </PillButton>
              </div>

              <AnimatePresence>
                {customOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-4 overflow-hidden"
                  >
                    <label className="microlabel flex items-center gap-2">
                      focus
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={timer.focusMinutes}
                        onChange={(e) =>
                          configureTimer({ focusMinutes: Math.max(1, Number(e.target.value) || 1) })
                        }
                        className="w-16 rounded-full bg-transparent px-2 py-1 text-center font-mono text-xs"
                        style={{ border: "1px solid var(--line-strong)", color: "var(--ink)" }}
                      />
                      min
                    </label>
                    <label className="microlabel flex items-center gap-2">
                      break
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={timer.breakMinutes}
                        onChange={(e) =>
                          configureTimer({ breakMinutes: Math.max(1, Number(e.target.value) || 1) })
                        }
                        className="w-16 rounded-full bg-transparent px-2 py-1 text-center font-mono text-xs"
                        style={{ border: "1px solid var(--line-strong)", color: "var(--ink)" }}
                      />
                      min
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-1 flex items-center gap-4">
                <PillButton tone="solid" size="lg" disabled={!canStart} onClick={beginFocus}
                  style={!canStart ? { opacity: 0.35, cursor: "not-allowed" } : undefined}
                >
                  Begin focus
                </PillButton>
                <label className="microlabel flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.autoRepeat}
                    onChange={(e) => updateSettings({ autoRepeat: e.target.checked })}
                    className="h-3.5 w-3.5 accent-current"
                  />
                  auto-repeat
                </label>
              </div>
            </motion.div>
          )}

          {/* ——— running: controls ——— */}
          {timer.phase !== "idle" && (
            <motion.div
              key="controls"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 flex flex-col items-center gap-6"
            >
              <div className="flex items-center gap-3">
                {paused ? (
                  <PillButton tone="solid" onClick={resumeTimer}>
                    Resume
                  </PillButton>
                ) : (
                  <PillButton onClick={pauseTimer}>Pause</PillButton>
                )}
                {timer.phase === "break" ? (
                  <PillButton onClick={completeBreak}>Skip break</PillButton>
                ) : (
                  <PillButton onClick={startBreak} tone="ghost">
                    To break
                  </PillButton>
                )}
                <PillButton tone="ghost" onClick={stopTimer}>
                  Stop
                </PillButton>
              </div>

              {timer.phase === "break" && quote && (
                <motion.blockquote
                  key={quote}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.7 }}
                  className="font-display max-w-md px-6 text-center text-lg italic leading-snug"
                  style={{ color: "var(--ink-soft)" }}
                >
                  “{quote}”
                </motion.blockquote>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
