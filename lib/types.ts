/** Domain types for Aura. Timestamps are ISO strings throughout. */

import type { GeneratorId } from "./ascii/generators";
import type { AuroraName } from "./aura-palettes";

export type Category = "lecture" | "homework" | "tutorial";
export type CustomSessionCategory = `custom:${string}`;
export type SessionCategory = Category | "past_paper" | "general" | CustomSessionCategory;
export type Status = "todo" | "in_progress" | "done";

/** GRA is a project, not an exam course — its weeks track milestones. */
export type SubjectKind = "exam" | "project";

export interface WeekProgress {
  week: number; // 1..totalWeeks
  lecture: Status;
  homework: Status;
  tutorial: Status;
  custom?: Record<string, Status>;
  note?: string;
}

export interface PastPaper {
  id: string;
  label: string; // e.g. "WS22/23 Endterm"
  status: Status;
  scorePercent?: number;
  note?: string;
  completedAt?: string; // ISO, set when marked done — orders the score trend
}

export interface FocusTopic {
  id: string;
  text: string;
  done: boolean;
}

export interface CustomAspect {
  id: string;
  label: string;
}

export type AuraHue = "pink" | "coral" | "orange" | "peach" | "sage";

/** Cool aurora palette names available to subjects (defined in aura-palettes.ts). */
export type SubjectAurora = "lagoon" | "polar" | "meadow" | "orchid" | "glacier";

export interface Subject {
  id: string;
  name: string;
  code: string;
  color: AuraHue;
  /** The cool moving aurora shown behind this subject's page. */
  aurora: SubjectAurora;
  kind: SubjectKind;
  professor?: string;
  totalWeeks: number;
  examDate?: string; // ISO — exam for courses, deadline for projects
  weeks: WeekProgress[];
  hiddenAspects?: Category[];
  customAspects?: CustomAspect[];
  pastPapers: PastPaper[];
  focusTopics: FocusTopic[];
  /** Project milestones replace lecture/homework/tutorial for kind === "project". */
  milestones?: { id: string; label: string; status: Status }[];
  archived?: boolean;
}

export interface StudySession {
  id: string;
  subjectId: string;
  category?: SessionCategory;
  weekRef?: number;
  startedAt: string; // ISO
  durationMinutes: number;
  source: "timer" | "manual";
  note?: string;
}

/**
 * The ASCII piece bound to a day. Assigned once the day has study; frozen
 * (generator/seed/subject/target) at the moment it unlocks so later edits
 * never rewrite an earned piece.
 */
export interface ArtDescriptor {
  generator: GeneratorId;
  seed: string;
  subjectId?: string;
  aurora: AuroraName;
  unlockedAt?: string; // ISO — set when totalMinutes first crossed the target
  targetMinutesAtUnlock?: number;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  subjectsTouched: string[];
  sessionIds: string[];
  aiReflection?: string;
  reflectionGeneratedAt?: string;
  mood?: 1 | 2 | 3 | 4 | 5;
  art?: ArtDescriptor;
}

export interface TimerPreset {
  id: string;
  name: string;
  focusMinutes: number;
  breakMinutes: number;
}

export type ThemeName =
  | "day"
  | "night"
  | "sakura"
  | "matcha"
  | "blueprint"
  | "manuscript"
  | "royal"
  | "ultraviolet"
  | "terminal";

export interface Settings {
  theme: ThemeName;
  quotesEnabled: boolean;
  autoRepeat: boolean;
  presets: TimerPreset[];
  /** Minutes of study that fully reveal the day's ASCII piece. */
  dailyTargetMinutes: number;
  /** Switch to `nightTheme` automatically between 20:00 and 07:00. */
  autoTheme: boolean;
  /** Which dark theme evenings use when autoTheme is on. */
  nightTheme: ThemeName;
  /** Multiplier on background atmosphere strength (0.2–1.3). */
  auraIntensity: number;
}

/** Shape of the JSON export — the data-safety net. */
export interface ExportBundle {
  app: "aura";
  version: 1 | 2;
  exportedAt: string;
  subjects: Subject[];
  sessions: StudySession[];
  dailyLogs: Record<string, DailyLog>;
  settings: Settings;
}

export const AURA_HUE_VAR: Record<AuraHue, string> = {
  pink: "var(--aura-pink)",
  coral: "var(--aura-coral)",
  orange: "var(--aura-orange)",
  peach: "var(--aura-peach)",
  sage: "var(--sage)",
};
