"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { format } from "date-fns";
import { useAura } from "@/lib/store";
import { minutesOnDay, formatMinutes } from "@/lib/derive";
import { artForDay } from "@/lib/ascii/select";
import { revealedText } from "@/lib/ascii/text";
import { AsciiArt } from "./AsciiArt";
import { Modal } from "@/components/ui/Modal";
import { PillButton } from "@/components/ui/PillButton";
import type { ArtDescriptor, Subject } from "@/lib/types";

const HERO = { cols: 88, rows: 40 };
const THUMB = { cols: 50, rows: 22 };
const GALLERY_PAGE = 24;

/** Fit a monospace grid of `cols` columns to the container width. */
function useFitFont(cols: number, max = 13, min = 4) {
  const ref = useRef<HTMLDivElement>(null);
  const [fs, setFs] = useState(min);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setFs(Math.max(min, Math.min(max, el.clientWidth / (cols * 0.62))));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cols, max, min]);
  return { ref, fs };
}

function subjectLabel(subjects: Subject[], d: ArtDescriptor): string {
  if (!d.subjectId) return "free study";
  return subjects.find((s) => s.id === d.subjectId)?.code ?? "—";
}

interface DayPiece {
  date: string;
  minutes: number;
  target: number;
  progress: number;
  unlocked: boolean;
  descriptor: ArtDescriptor;
}

export function DailyAtelier() {
  const sessions = useAura((s) => s.sessions);
  const subjects = useAura((s) => s.subjects);
  const dailyLogs = useAura((s) => s.dailyLogs);
  const target = useAura((s) => s.settings.dailyTargetMinutes);

  const [expanded, setExpanded] = useState<DayPiece | null>(null);
  const [showAll, setShowAll] = useState(false);

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todayMin = useMemo(() => minutesOnDay(sessions, todayKey), [sessions, todayKey]);
  const todayDescriptor = useMemo(
    () => dailyLogs[todayKey]?.art ?? artForDay(todayKey, sessions, subjects),
    [dailyLogs, todayKey, sessions, subjects]
  );
  const todayProgress = target > 0 ? Math.min(1, todayMin / target) : 0;
  const todayUnlocked = todayProgress >= 1;

  const hero = useFitFont(HERO.cols);

  // Past days with study → gallery, most recent first.
  const gallery = useMemo<DayPiece[]>(() => {
    return Object.values(dailyLogs)
      .filter((l) => l.sessionIds.length > 0 && l.date !== todayKey)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((l) => {
        const descriptor = l.art ?? artForDay(l.date, sessions, subjects);
        const t = l.art?.targetMinutesAtUnlock ?? target;
        const progress = t > 0 ? Math.min(1, l.totalMinutes / t) : 0;
        return {
          date: l.date,
          minutes: l.totalMinutes,
          target: t,
          progress,
          unlocked: !!l.art?.unlockedAt || progress >= 1,
          descriptor,
        };
      });
  }, [dailyLogs, todayKey, sessions, subjects, target]);

  const shown = showAll ? gallery : gallery.slice(0, GALLERY_PAGE);

  return (
    <div>
      {/* ——— today's piece ——— */}
      <div
        className="relative overflow-hidden rounded-3xl p-5 sm:p-8"
        style={{ border: "1px solid var(--line)", background: "color-mix(in srgb, var(--paper-raised) 70%, transparent)" }}
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="microlabel">
              inspired by {subjectLabel(subjects, todayDescriptor)} ·{" "}
              {todayDescriptor.generator}
            </p>
            <p className="font-display text-xl italic sm:text-2xl">
              {todayUnlocked ? "Today, revealed ✦" : "Study to reveal today"}
            </p>
          </div>
          <button
            onClick={() =>
              setExpanded({
                date: todayKey,
                minutes: todayMin,
                target,
                progress: todayProgress,
                unlocked: todayUnlocked,
                descriptor: todayDescriptor,
              })
            }
            className="microlabel underline underline-offset-4 hover:text-ink"
          >
            expand ↗
          </button>
        </div>

        {/* the art */}
        <div ref={hero.ref} className="flex justify-center overflow-hidden">
          <AsciiArt
            descriptor={todayDescriptor}
            progress={todayProgress}
            cols={HERO.cols}
            rows={HERO.rows}
            fontSize={hero.fs}
          />
        </div>

        {/* progress to target */}
        <div className="mx-auto mt-6 max-w-xl">
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--ink)" }}
              animate={{ width: `${todayProgress * 100}%` }}
              transition={{ type: "spring", stiffness: 60, damping: 18 }}
            />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-xs tabular" style={{ color: "var(--ink-soft)" }}>
              {formatMinutes(todayMin)} / {formatMinutes(target)}
            </span>
            <span className="font-mono text-xs tabular" style={{ color: "var(--ink-soft)" }}>
              {Math.round(todayProgress * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* ——— gallery ——— */}
      {gallery.length > 0 && (
        <div className="mt-8">
          <p className="microlabel mb-3">the library · {gallery.length} days</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((day) => (
              <motion.button
                key={day.date}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                whileHover={{ y: -4 }}
                onClick={() => setExpanded(day)}
                className="group relative flex flex-col items-center overflow-hidden rounded-2xl p-3"
                style={{
                  border: "1px solid var(--line)",
                  background: "color-mix(in srgb, var(--paper-raised) 70%, transparent)",
                  opacity: day.unlocked ? 1 : 0.62,
                }}
              >
                <div className="flex h-[7.5rem] w-full items-center justify-center overflow-hidden">
                  <AsciiArt
                    descriptor={day.descriptor}
                    progress={day.progress}
                    cols={THUMB.cols}
                    rows={THUMB.rows}
                    fontSize={5}
                    defer
                    glow={false}
                  />
                </div>
                <div className="mt-2 flex w-full items-baseline justify-between">
                  <span className="font-mono text-[0.65rem]" style={{ color: "var(--ink-soft)" }}>
                    {format(new Date(day.date), "d MMM")}
                  </span>
                  <span className="font-mono text-[0.65rem] tabular" style={{ color: "var(--ink-faint)" }}>
                    {day.unlocked ? "✦" : `${Math.round(day.progress * 100)}%`}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
          {!showAll && gallery.length > GALLERY_PAGE && (
            <div className="mt-4 flex justify-center">
              <PillButton size="sm" tone="ghost" onClick={() => setShowAll(true)}>
                Show all {gallery.length}
              </PillButton>
            </div>
          )}
        </div>
      )}

      {expanded && (
        <ExpandView
          piece={expanded}
          subjectName={subjectLabel(subjects, expanded.descriptor)}
          onClose={() => setExpanded(null)}
        />
      )}
    </div>
  );
}

/* ——— fullscreen expand ——— */

function ExpandView({
  piece,
  subjectName,
  onClose,
}: {
  piece: DayPiece;
  subjectName: string;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(7);
  const [copied, setCopied] = useState(false);

  const text = useMemo(
    () => revealedText(piece.descriptor, HERO.cols, HERO.rows, piece.progress),
    [piece]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — download still works */
    }
  };
  const download = () => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aura-${piece.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal open onClose={onClose} title={format(new Date(piece.date), "EEEE d MMMM")}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="microlabel">
          {piece.unlocked ? "unlocked ✦" : `${Math.round(piece.progress * 100)}% revealed`} ·{" "}
          {formatMinutes(piece.minutes)} / {formatMinutes(piece.target)} · {subjectName} ·{" "}
          {piece.descriptor.generator}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <PillButton size="sm" tone="ghost" onClick={() => setZoom((z) => Math.max(4, z - 1))} aria-label="Zoom out">
            −
          </PillButton>
          <PillButton size="sm" tone="ghost" onClick={() => setZoom((z) => Math.min(16, z + 1))} aria-label="Zoom in">
            +
          </PillButton>
          <PillButton size="sm" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </PillButton>
          <PillButton size="sm" tone="ghost" onClick={download}>
            .txt
          </PillButton>
        </span>
      </div>
      <div
        className="flex justify-center overflow-auto rounded-2xl p-3"
        style={{ maxHeight: "62vh", background: "color-mix(in srgb, var(--paper-sunken) 60%, transparent)" }}
      >
        <AsciiArt
          descriptor={piece.descriptor}
          progress={piece.progress}
          cols={HERO.cols}
          rows={HERO.rows}
          fontSize={zoom}
        />
      </div>
    </Modal>
  );
}
