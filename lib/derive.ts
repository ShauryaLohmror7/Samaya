import { differenceInCalendarDays, format, subDays } from "date-fns";
import { customCategoryId, subjectWeeklyTracks } from "./categories";
import type { Category, CustomSessionCategory, Subject, StudySession, Status, SessionCategory, WeekProgress } from "./types";

/* Derived data helpers — pure functions over store state. */

const statusValue: Record<Status, number> = { todo: 0, in_progress: 0.5, done: 1 };

export interface TrackProgress {
  done: number;
  inProgress: number;
  total: number;
}

export function trackProgress(
  subject: Subject,
  track: Category | CustomSessionCategory
): TrackProgress {
  const total = subject.weeks.length;
  let done = 0;
  let inProgress = 0;
  const customId = customCategoryId(track);
  for (const w of subject.weeks) {
    const status = customId ? w.custom?.[customId] ?? "todo" : w[track as Category];
    if (status === "done") done++;
    else if (status === "in_progress") inProgress++;
  }
  return { done, inProgress, total };
}

function weekStatusForTrack(week: WeekProgress, track: Category | CustomSessionCategory): Status {
  const customId = customCategoryId(track);
  return customId ? week.custom?.[customId] ?? "todo" : week[track as Category];
}

/**
 * Weighted composite completion for a subject.
 * Exam courses: weekly tracks 70% + past papers 30%.
 * Built-in rows keep their original 30/20/20 shape; custom rows join that
 * weekly score so the subject percentage follows every visible grid row.
 * If no past papers exist yet, weekly tracks are 100%.
 * Projects: milestones 80% + weeks-as-log 20% (milestones are the real work).
 */
export function subjectCompletion(subject: Subject): number {
  if (subject.kind === "project") {
    const ms = subject.milestones ?? [];
    const msScore =
      ms.length > 0 ? ms.reduce((a, m) => a + statusValue[m.status], 0) / ms.length : 0;
    return ms.length > 0 ? msScore : weeklyScore(subject);
  }

  const weekly = weeklyScore(subject);
  if (subject.pastPapers.length === 0) return weekly;
  const papers =
    subject.pastPapers.reduce((a, p) => a + statusValue[p.status], 0) /
    subject.pastPapers.length;
  return weekly * 0.7 + papers * 0.3;
}

function weeklyScore(subject: Subject): number {
  if (subject.weeks.length === 0) return 0;
  const weights = { lecture: 0.3, homework: 0.2, tutorial: 0.2 } as const;
  const customTracks = subjectWeeklyTracks(subject).filter((track) => customCategoryId(track.key));
  const customWeight = 0.2;
  const totalWeight = 0.7 + customTracks.length * customWeight;
  let acc = 0;
  for (const w of subject.weeks) {
    acc +=
      statusValue[w.lecture] * weights.lecture +
      statusValue[w.homework] * weights.homework +
      statusValue[w.tutorial] * weights.tutorial;
    for (const track of customTracks) {
      acc += statusValue[weekStatusForTrack(w, track.key)] * customWeight;
    }
  }
  return acc / (subject.weeks.length * totalWeight);
}

/* ——— time ——— */

export function minutesOnDay(sessions: StudySession[], dayKey: string): number {
  return sessions
    .filter((s) => format(new Date(s.startedAt), "yyyy-MM-dd") === dayKey)
    .reduce((a, s) => a + s.durationMinutes, 0);
}

export function minutesBySubject(sessions: StudySession[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    map.set(s.subjectId, (map.get(s.subjectId) ?? 0) + s.durationMinutes);
  }
  return map;
}

export function minutesByCategory(
  sessions: StudySession[]
): Map<SessionCategory, number> {
  const map = new Map<SessionCategory, number>();
  for (const s of sessions) {
    const cat = s.category ?? "general";
    map.set(cat, (map.get(cat) ?? 0) + s.durationMinutes);
  }
  return map;
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Day streak: consecutive calendar days (ending today or yesterday)
 * with at least one logged session. Derived, never stored — can't drift.
 */
export function dayStreak(sessions: StudySession[], now = new Date()): number {
  const days = new Set(sessions.map((s) => format(new Date(s.startedAt), "yyyy-MM-dd")));
  if (days.size === 0) return 0;
  let cursor = now;
  // A streak survives until midnight: if nothing logged yet today, start counting from yesterday.
  if (!days.has(format(cursor, "yyyy-MM-dd"))) cursor = subDays(cursor, 1);
  let streak = 0;
  while (days.has(format(cursor, "yyyy-MM-dd"))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

/** Days until an ISO date (calendar days, can be negative). */
export function daysUntil(iso: string, now = new Date()): number {
  return differenceInCalendarDays(new Date(iso), now);
}

/**
 * Outstanding work for a subject, weighted by exam proximity —
 * used by the dashboard and fed to the AI reflection.
 */
export interface OutstandingItem {
  subjectId: string;
  subjectCode: string;
  description: string;
  urgency: number; // higher = more urgent
}

export function outstandingWork(subjects: Subject[], now = new Date()): OutstandingItem[] {
  const items: OutstandingItem[] = [];
  for (const subj of subjects.filter((s) => !s.archived)) {
    const days = subj.examDate ? Math.max(0, daysUntil(subj.examDate, now)) : 60;
    const proximity = 1 / Math.max(1, days); // closer exam → heavier
    for (const track of subjectWeeklyTracks(subj)) {
      if (subj.kind === "project") continue;
      const p = trackProgress(subj, track.key);
      const remaining = p.total - p.done;
      if (remaining > 0) {
        items.push({
          subjectId: subj.id,
          subjectCode: subj.code,
          description: `${track.label.toLowerCase()} review: ${remaining} of ${p.total} weeks open`,
          urgency: remaining * proximity,
        });
      }
    }
    if (subj.kind === "project") {
      const open = (subj.milestones ?? []).filter((m) => m.status !== "done");
      if (open.length > 0) {
        items.push({
          subjectId: subj.id,
          subjectCode: subj.code,
          description: `project milestones open: ${open.map((m) => m.label).join(", ")}`,
          urgency: open.length * proximity,
        });
      }
    }
    const papersOpen = subj.pastPapers.filter((p) => p.status !== "done").length;
    if (papersOpen > 0) {
      items.push({
        subjectId: subj.id,
        subjectCode: subj.code,
        description: `${papersOpen} past paper${papersOpen > 1 ? "s" : ""} not done`,
        urgency: papersOpen * proximity * 1.5, // papers matter most near exams
      });
    }
  }
  return items.sort((a, b) => b.urgency - a.urgency);
}
