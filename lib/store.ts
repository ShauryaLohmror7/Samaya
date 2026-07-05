"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { format } from "date-fns";
import { createIdbStorage } from "./storage";
import { seedSubjects, defaultSettings } from "./seed";
import { artForDay } from "./ascii/select";
import { customCategoryId } from "./categories";
import type {
  Subject,
  StudySession,
  DailyLog,
  Settings,
  Status,
  Category,
  SessionCategory,
  CustomSessionCategory,
  PastPaper,
  ExportBundle,
  TimerPreset,
  ThemeName,
} from "./types";

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const STATUS_CYCLE: Record<Status, Status> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

/* ——— timer ——— */

export type TimerPhase = "idle" | "focus" | "break";

export interface TimerState {
  phase: TimerPhase;
  /** Wall-clock end of the running phase (ISO). Null when idle or paused. */
  endsAt: string | null;
  /** Remaining ms captured at pause; null while running. */
  pausedRemainingMs: number | null;
  focusMinutes: number;
  breakMinutes: number;
  presetId: string | null;
  subjectId: string | null;
  category: SessionCategory | null;
  weekRef: number | null;
  /** When the current focus block started (ISO) — becomes the session start. */
  focusStartedAt: string | null;
  completedFocusCount: number;
}

const initialTimer: TimerState = {
  phase: "idle",
  endsAt: null,
  pausedRemainingMs: null,
  focusMinutes: 25,
  breakMinutes: 5,
  presetId: "preset-focus",
  subjectId: null,
  category: null,
  weekRef: null,
  focusStartedAt: null,
  completedFocusCount: 0,
};

/* ——— store shape ——— */

interface AuraState {
  hasHydrated: boolean;

  subjects: Subject[];
  sessions: StudySession[];
  dailyLogs: Record<string, DailyLog>;
  settings: Settings;
  timer: TimerState;

  // subjects
  addSubject: (input: Omit<Subject, "id" | "weeks" | "pastPapers" | "focusTopics"> & { id?: string }) => string;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  addCustomAspect: (subjectId: string, label: string) => void;
  deleteCustomAspect: (subjectId: string, aspectId: string) => void;
  setWeekStatus: (subjectId: string, week: number, category: Category | CustomSessionCategory, status: Status) => void;
  cycleWeekStatus: (subjectId: string, week: number, category: Category | CustomSessionCategory) => void;
  setWeekNote: (subjectId: string, week: number, note: string) => void;
  cycleMilestoneStatus: (subjectId: string, milestoneId: string) => void;
  addMilestone: (subjectId: string, label: string) => void;
  deleteMilestone: (subjectId: string, milestoneId: string) => void;

  // past papers
  addPastPaper: (subjectId: string, label: string) => void;
  updatePastPaper: (subjectId: string, paperId: string, patch: Partial<PastPaper>) => void;
  deletePastPaper: (subjectId: string, paperId: string) => void;

  // focus topics
  addFocusTopic: (subjectId: string, text: string) => void;
  toggleFocusTopic: (subjectId: string, topicId: string) => void;
  deleteFocusTopic: (subjectId: string, topicId: string) => void;

  // sessions
  logSession: (input: Omit<StudySession, "id">) => void;
  deleteSession: (id: string) => void;

  // daily logs
  saveReflection: (date: string, text: string) => void;
  setMood: (date: string, mood: 1 | 2 | 3 | 4 | 5) => void;

  // timer
  configureTimer: (patch: Partial<Pick<TimerState, "focusMinutes" | "breakMinutes" | "presetId" | "subjectId" | "category" | "weekRef">>) => void;
  startFocus: () => void;
  startBreak: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  /** Called when a focus block completes: logs the session, moves to break. */
  completeFocus: () => void;
  completeBreak: () => void;

  // settings
  updateSettings: (patch: Partial<Settings>) => void;
  setDailyTarget: (minutes: number) => void;
  upsertPreset: (preset: TimerPreset) => void;
  deletePreset: (id: string) => void;
  setTheme: (theme: ThemeName) => void;

  // export / import
  exportData: () => ExportBundle;
  importData: (bundle: ExportBundle) => void;
}

function todayKey(iso?: string): string {
  return format(iso ? new Date(iso) : new Date(), "yyyy-MM-dd");
}

/** Rebuild the DailyLog for a date from the full session list. */
function rebuildDailyLog(
  logs: Record<string, DailyLog>,
  sessions: StudySession[],
  date: string,
  subjects: Subject[],
  targetMinutes: number
): Record<string, DailyLog> {
  const daySessions = sessions.filter((s) => todayKey(s.startedAt) === date);
  const existing = logs[date];
  if (daySessions.length === 0) {
    if (!existing?.aiReflection && !existing?.mood && !existing?.art?.unlockedAt) {
      const { [date]: _removed, ...rest } = logs;
      return rest;
    }
    return {
      ...logs,
      [date]: { ...existing, totalMinutes: 0, subjectsTouched: [], sessionIds: [] },
    };
  }

  const totalMinutes = daySessions.reduce((a, s) => a + s.durationMinutes, 0);

  // Art: track the dominant subject until unlocked, then freeze it forever.
  let art = existing?.art;
  if (!art?.unlockedAt) art = artForDay(date, sessions, subjects);
  if (art && !art.unlockedAt && targetMinutes > 0 && totalMinutes >= targetMinutes) {
    art = { ...art, unlockedAt: new Date().toISOString(), targetMinutesAtUnlock: targetMinutes };
  }

  return {
    ...logs,
    [date]: {
      date,
      totalMinutes,
      subjectsTouched: [...new Set(daySessions.map((s) => s.subjectId))],
      sessionIds: daySessions.map((s) => s.id),
      ...(existing?.aiReflection ? { aiReflection: existing.aiReflection } : {}),
      ...(existing?.reflectionGeneratedAt
        ? { reflectionGeneratedAt: existing.reflectionGeneratedAt }
        : {}),
      ...(existing?.mood ? { mood: existing.mood } : {}),
      ...(art ? { art } : {}),
    },
  };
}

function updateSubjectIn(subjects: Subject[], id: string, fn: (s: Subject) => Subject): Subject[] {
  return subjects.map((s) => (s.id === id ? fn(s) : s));
}

export const useAura = create<AuraState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,

      subjects: seedSubjects(),
      sessions: [],
      dailyLogs: {},
      settings: defaultSettings(),
      timer: initialTimer,

      /* ——— subjects ——— */

      addSubject: (input) => {
        const id = input.id ?? newId();
        const subject: Subject = {
          ...input,
          id,
          weeks: Array.from({ length: input.totalWeeks }, (_, i) => ({
            week: i + 1,
            lecture: "todo" as const,
            homework: "todo" as const,
            tutorial: "todo" as const,
          })),
          customAspects: input.customAspects ?? [],
          pastPapers: [],
          focusTopics: [],
          ...(input.kind === "project" ? { milestones: [] } : {}),
        };
        set((s) => ({ subjects: [...s.subjects, subject] }));
        return id;
      },

      updateSubject: (id, patch) =>
        set((s) => ({
          subjects: updateSubjectIn(s.subjects, id, (subj) => {
            const next = { ...subj, ...patch };
            // Resize the week grid if totalWeeks changed, preserving progress.
            if (patch.totalWeeks && patch.totalWeeks !== subj.weeks.length) {
              next.weeks = Array.from({ length: patch.totalWeeks }, (_, i) =>
                subj.weeks[i] ?? {
                  week: i + 1,
                  lecture: "todo" as const,
                  homework: "todo" as const,
                  tutorial: "todo" as const,
                  custom: Object.fromEntries((subj.customAspects ?? []).map((a) => [a.id, "todo" as const])),
                }
              );
            }
            return next;
          }),
        })),

      deleteSubject: (id) =>
        set((s) => ({ subjects: s.subjects.filter((subj) => subj.id !== id) })),

      addCustomAspect: (subjectId, label) =>
        set((s) => {
          const clean = label.trim();
          if (!clean) return {};
          const id = newId();
          return {
            subjects: updateSubjectIn(s.subjects, subjectId, (subj) => ({
              ...subj,
              customAspects: [...(subj.customAspects ?? []), { id, label: clean }],
              weeks: subj.weeks.map((w) => ({
                ...w,
                custom: { ...(w.custom ?? {}), [id]: "todo" as const },
              })),
            })),
          };
        }),

      deleteCustomAspect: (subjectId, aspectId) =>
        set((s) => {
          const category: CustomSessionCategory = `custom:${aspectId}`;
          return {
            subjects: updateSubjectIn(s.subjects, subjectId, (subj) => ({
              ...subj,
              customAspects: (subj.customAspects ?? []).filter((aspect) => aspect.id !== aspectId),
              weeks: subj.weeks.map((w) => {
                const { [aspectId]: _removed, ...custom } = w.custom ?? {};
                return { ...w, custom };
              }),
            })),
            sessions: s.sessions.map((session) =>
              session.subjectId === subjectId && session.category === category
                ? { ...session, category: "general" as const }
                : session
            ),
            timer:
              s.timer.subjectId === subjectId && s.timer.category === category
                ? { ...s.timer, category: null, weekRef: null }
                : s.timer,
          };
        }),

      setWeekStatus: (subjectId, week, category, status) =>
        set((s) => ({
          subjects: updateSubjectIn(s.subjects, subjectId, (subj) => ({
            ...subj,
            weeks: subj.weeks.map((w) => {
              if (w.week !== week) return w;
              const customId = customCategoryId(category);
              return customId
                ? { ...w, custom: { ...(w.custom ?? {}), [customId]: status } }
                : { ...w, [category]: status };
            }),
          })),
        })),

      cycleWeekStatus: (subjectId, week, category) => {
        const subj = get().subjects.find((x) => x.id === subjectId);
        const row = subj?.weeks.find((w) => w.week === week);
        const customId = customCategoryId(category);
        const current = customId ? row?.custom?.[customId] ?? "todo" : row?.[category as Category] ?? "todo";
        get().setWeekStatus(subjectId, week, category, STATUS_CYCLE[current]);
      },

      setWeekNote: (subjectId, week, note) =>
        set((s) => ({
          subjects: updateSubjectIn(s.subjects, subjectId, (subj) => ({
            ...subj,
            weeks: subj.weeks.map((w) =>
              w.week === week ? { ...w, note: note || undefined } : w
            ),
          })),
        })),

      cycleMilestoneStatus: (subjectId, milestoneId) =>
        set((s) => ({
          subjects: updateSubjectIn(s.subjects, subjectId, (subj) => ({
            ...subj,
            milestones: subj.milestones?.map((m) =>
              m.id === milestoneId ? { ...m, status: STATUS_CYCLE[m.status] } : m
            ),
          })),
        })),

      addMilestone: (subjectId, label) =>
        set((s) => ({
          subjects: updateSubjectIn(s.subjects, subjectId, (subj) => ({
            ...subj,
            milestones: [
              ...(subj.milestones ?? []),
              { id: newId(), label, status: "todo" as const },
            ],
          })),
        })),

      deleteMilestone: (subjectId, milestoneId) =>
        set((s) => ({
          subjects: updateSubjectIn(s.subjects, subjectId, (subj) => ({
            ...subj,
            milestones: subj.milestones?.filter((m) => m.id !== milestoneId),
          })),
        })),

      /* ——— past papers ——— */

      addPastPaper: (subjectId, label) =>
        set((s) => ({
          subjects: updateSubjectIn(s.subjects, subjectId, (subj) => ({
            ...subj,
            pastPapers: [...subj.pastPapers, { id: newId(), label, status: "todo" as const }],
          })),
        })),

      updatePastPaper: (subjectId, paperId, patch) =>
        set((s) => ({
          subjects: updateSubjectIn(s.subjects, subjectId, (subj) => ({
            ...subj,
            pastPapers: subj.pastPapers.map((p) => {
              if (p.id !== paperId) return p;
              const next = { ...p, ...patch };
              if (patch.status === "done" && !p.completedAt) {
                next.completedAt = new Date().toISOString();
              }
              return next;
            }),
          })),
        })),

      deletePastPaper: (subjectId, paperId) =>
        set((s) => ({
          subjects: updateSubjectIn(s.subjects, subjectId, (subj) => ({
            ...subj,
            pastPapers: subj.pastPapers.filter((p) => p.id !== paperId),
          })),
        })),

      /* ——— focus topics ——— */

      addFocusTopic: (subjectId, text) =>
        set((s) => ({
          subjects: updateSubjectIn(s.subjects, subjectId, (subj) => ({
            ...subj,
            focusTopics: [...subj.focusTopics, { id: newId(), text, done: false }],
          })),
        })),

      toggleFocusTopic: (subjectId, topicId) =>
        set((s) => ({
          subjects: updateSubjectIn(s.subjects, subjectId, (subj) => ({
            ...subj,
            focusTopics: subj.focusTopics.map((t) =>
              t.id === topicId ? { ...t, done: !t.done } : t
            ),
          })),
        })),

      deleteFocusTopic: (subjectId, topicId) =>
        set((s) => ({
          subjects: updateSubjectIn(s.subjects, subjectId, (subj) => ({
            ...subj,
            focusTopics: subj.focusTopics.filter((t) => t.id !== topicId),
          })),
        })),

      /* ——— sessions & daily logs ——— */

      logSession: (input) => {
        const session: StudySession = { ...input, id: newId() };
        set((s) => {
          const sessions = [...s.sessions, session];
          return {
            sessions,
            dailyLogs: rebuildDailyLog(
              s.dailyLogs,
              sessions,
              todayKey(session.startedAt),
              s.subjects,
              s.settings.dailyTargetMinutes
            ),
          };
        });
      },

      deleteSession: (id) =>
        set((s) => {
          const victim = s.sessions.find((x) => x.id === id);
          const sessions = s.sessions.filter((x) => x.id !== id);
          return {
            sessions,
            dailyLogs: victim
              ? rebuildDailyLog(
                  s.dailyLogs,
                  sessions,
                  todayKey(victim.startedAt),
                  s.subjects,
                  s.settings.dailyTargetMinutes
                )
              : s.dailyLogs,
          };
        }),

      saveReflection: (date, text) =>
        set((s) => ({
          dailyLogs: {
            ...s.dailyLogs,
            [date]: {
              ...(s.dailyLogs[date] ?? {
                date,
                totalMinutes: 0,
                subjectsTouched: [],
                sessionIds: [],
              }),
              aiReflection: text,
              reflectionGeneratedAt: new Date().toISOString(),
            },
          },
        })),

      setMood: (date, mood) =>
        set((s) => ({
          dailyLogs: {
            ...s.dailyLogs,
            [date]: {
              ...(s.dailyLogs[date] ?? {
                date,
                totalMinutes: 0,
                subjectsTouched: [],
                sessionIds: [],
              }),
              mood,
            },
          },
        })),

      /* ——— timer ——— */

      configureTimer: (patch) => set((s) => ({ timer: { ...s.timer, ...patch } })),

      startFocus: () => {
        const t = get().timer;
        set({
          timer: {
            ...t,
            phase: "focus",
            endsAt: new Date(Date.now() + t.focusMinutes * 60_000).toISOString(),
            pausedRemainingMs: null,
            focusStartedAt: new Date().toISOString(),
          },
        });
      },

      startBreak: () => {
        const t = get().timer;
        set({
          timer: {
            ...t,
            phase: "break",
            endsAt: new Date(Date.now() + t.breakMinutes * 60_000).toISOString(),
            pausedRemainingMs: null,
            focusStartedAt: null,
          },
        });
      },

      pauseTimer: () => {
        const t = get().timer;
        if (!t.endsAt) return;
        set({
          timer: {
            ...t,
            pausedRemainingMs: Math.max(0, new Date(t.endsAt).getTime() - Date.now()),
            endsAt: null,
          },
        });
      },

      resumeTimer: () => {
        const t = get().timer;
        if (t.pausedRemainingMs == null) return;
        set({
          timer: {
            ...t,
            endsAt: new Date(Date.now() + t.pausedRemainingMs).toISOString(),
            pausedRemainingMs: null,
          },
        });
      },

      stopTimer: () => {
        const t = get().timer;
        // Stopping mid-focus still logs the honest elapsed time (≥1 min).
        if (t.phase === "focus" && t.focusStartedAt) {
          const elapsedMin = Math.round((Date.now() - new Date(t.focusStartedAt).getTime()) / 60_000);
          if (elapsedMin >= 1 && t.subjectId) {
            get().logSession({
              subjectId: t.subjectId,
              category: t.category ?? "general",
              ...(t.weekRef ? { weekRef: t.weekRef } : {}),
              startedAt: t.focusStartedAt,
              durationMinutes: elapsedMin,
              source: "timer",
            });
          }
        }
        set((s) => ({
          timer: {
            ...initialTimer,
            focusMinutes: s.timer.focusMinutes,
            breakMinutes: s.timer.breakMinutes,
            presetId: s.timer.presetId,
            subjectId: s.timer.subjectId,
            category: s.timer.category,
            weekRef: s.timer.weekRef,
            completedFocusCount: s.timer.completedFocusCount,
          },
        }));
      },

      completeFocus: () => {
        const t = get().timer;
        if (t.phase !== "focus") return;
        if (t.subjectId && t.focusStartedAt) {
          get().logSession({
            subjectId: t.subjectId,
            category: t.category ?? "general",
            ...(t.weekRef ? { weekRef: t.weekRef } : {}),
            startedAt: t.focusStartedAt,
            durationMinutes: t.focusMinutes,
            source: "timer",
          });
        }
        set((s) => ({
          timer: { ...s.timer, completedFocusCount: s.timer.completedFocusCount + 1 },
        }));
        get().startBreak();
      },

      completeBreak: () => {
        const t = get().timer;
        if (t.phase !== "break") return;
        if (get().settings.autoRepeat) {
          get().startFocus();
        } else {
          set((s) => ({
            timer: { ...s.timer, phase: "idle", endsAt: null, pausedRemainingMs: null },
          }));
        }
      },

      /* ——— settings ——— */

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      setDailyTarget: (minutes) =>
        set((s) => {
          const target = Math.max(0, Math.round(minutes));
          // Re-evaluate every studied day so a newly-met target mints its art.
          // Frozen unlocks are never undone, so lowering then raising is safe.
          let dailyLogs = s.dailyLogs;
          for (const d of new Set(s.sessions.map((x) => todayKey(x.startedAt)))) {
            dailyLogs = rebuildDailyLog(dailyLogs, s.sessions, d, s.subjects, target);
          }
          return { settings: { ...s.settings, dailyTargetMinutes: target }, dailyLogs };
        }),

      upsertPreset: (preset) =>
        set((s) => {
          const exists = s.settings.presets.some((p) => p.id === preset.id);
          return {
            settings: {
              ...s.settings,
              presets: exists
                ? s.settings.presets.map((p) => (p.id === preset.id ? preset : p))
                : [...s.settings.presets, preset],
            },
          };
        }),

      deletePreset: (id) =>
        set((s) => ({
          settings: { ...s.settings, presets: s.settings.presets.filter((p) => p.id !== id) },
        })),

      setTheme: (theme) => {
        set((s) => ({ settings: { ...s.settings, theme } }));
        if (typeof document !== "undefined") {
          document.documentElement.setAttribute("data-theme", theme === "night" ? "night" : "day");
          try {
            localStorage.setItem("aura-theme", theme);
          } catch {
            /* private mode — theme just won't persist pre-paint */
          }
        }
      },

      /* ——— export / import ——— */

      exportData: () => {
        const s = get();
        return {
          app: "aura",
          version: 2,
          exportedAt: new Date().toISOString(),
          subjects: s.subjects,
          sessions: s.sessions,
          dailyLogs: s.dailyLogs,
          settings: s.settings,
        };
      },

      importData: (bundle) => {
        if (bundle.app !== "aura" || !Array.isArray(bundle.subjects)) {
          throw new Error("Not a valid Aura export file.");
        }
        const palettes = ["lagoon", "polar", "meadow", "orchid", "glacier"] as const;
        set({
          subjects: bundle.subjects.map((s, i) => ({
            ...s,
            aurora: s.aurora ?? palettes[i % palettes.length]!,
            customAspects: s.customAspects ?? [],
            weeks: s.weeks.map((w) => ({
              ...w,
              custom: {
                ...Object.fromEntries((s.customAspects ?? []).map((a) => [a.id, "todo" as const])),
                ...(w.custom ?? {}),
              },
            })),
          })),
          sessions: bundle.sessions ?? [],
          dailyLogs: bundle.dailyLogs ?? {},
          settings: { ...defaultSettings(), ...bundle.settings },
          timer: initialTimer,
        });
      },
    }),
    {
      name: "aura-store",
      version: 4,
      migrate: (persisted) => {
        const state = persisted as Partial<AuraState>;
        // v1 → v2: subjects gained a per-page `aurora` palette.
        const palettes = ["lagoon", "polar", "meadow", "orchid", "glacier"] as const;
        if (Array.isArray(state.subjects)) {
          state.subjects = state.subjects.map((s, i) => ({
            ...s,
            aurora: s.aurora ?? palettes[i % palettes.length]!,
            customAspects: s.customAspects ?? [],
            weeks: s.weeks.map((w) => ({
              ...w,
              custom: {
                ...Object.fromEntries((s.customAspects ?? []).map((a) => [a.id, "todo" as const])),
                ...(w.custom ?? {}),
              },
            })),
          }));
        }
        // v2 → v3: the Atelier added a daily reveal target.
        if (state.settings && state.settings.dailyTargetMinutes == null) {
          state.settings = { ...state.settings, dailyTargetMinutes: 240 };
        }
        // v3 → v4: the theme system grew — auto day/night + intensity.
        if (state.settings && state.settings.autoTheme == null) {
          state.settings = {
            ...state.settings,
            autoTheme: false,
            nightTheme: "night",
            auraIntensity: 1,
          };
        }
        return state as AuraState;
      },
      storage: createJSONStorage(createIdbStorage),
      partialize: (s) => ({
        subjects: s.subjects,
        sessions: s.sessions,
        dailyLogs: s.dailyLogs,
        settings: s.settings,
        timer: s.timer,
      }),
      onRehydrateStorage: () => () => {
        // IndexedDB rehydration is async; the callback fires after the store
        // exists, so this reference is safe.
        useAura.setState({ hasHydrated: true });
      },
    }
  )
);
