/** Domain types for Aura. Timestamps are ISO strings throughout. */

export type Category = "lecture" | "homework" | "tutorial";
export type SessionCategory = Category | "past_paper" | "general";
export type Status = "todo" | "in_progress" | "done";

/** GRA is a project, not an exam course — its weeks track milestones. */
export type SubjectKind = "exam" | "project";

export interface WeekProgress {
  week: number; // 1..totalWeeks
  lecture: Status;
  homework: Status;
  tutorial: Status;
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

export type AuraHue = "pink" | "coral" | "orange" | "peach" | "sage";

export interface Subject {
  id: string;
  name: string;
  code: string;
  color: AuraHue;
  kind: SubjectKind;
  professor?: string;
  totalWeeks: number;
  examDate?: string; // ISO — exam for courses, deadline for projects
  weeks: WeekProgress[];
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

export interface DailyLog {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  subjectsTouched: string[];
  sessionIds: string[];
  aiReflection?: string;
  reflectionGeneratedAt?: string;
  mood?: 1 | 2 | 3 | 4 | 5;
}

export interface TimerPreset {
  id: string;
  name: string;
  focusMinutes: number;
  breakMinutes: number;
}

export type ThemeName = "day" | "night";

export interface Settings {
  theme: ThemeName;
  quotesEnabled: boolean;
  autoRepeat: boolean;
  presets: TimerPreset[];
}

/** Shape of the JSON export — the data-safety net. */
export interface ExportBundle {
  app: "aura";
  version: 1;
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
