import type { Subject, WeekProgress, Settings } from "./types";

function emptyWeeks(totalWeeks: number): WeekProgress[] {
  return Array.from({ length: totalWeeks }, (_, i) => ({
    week: i + 1,
    lecture: "todo" as const,
    homework: "todo" as const,
    tutorial: "todo" as const,
  }));
}

/** The five current subjects. Everything here is editable in the UI. */
export function seedSubjects(): Subject[] {
  return [
    {
      id: "seed-fpv",
      name: "Funktionale Programmierung & Verifikation",
      code: "FPV",
      aurora: "lagoon",
      color: "pink",
      kind: "exam",
      totalWeeks: 14,
      weeks: emptyWeeks(14),
      pastPapers: [],
      focusTopics: [],
    },
    {
      id: "seed-eist",
      name: "Einführung in die Softwaretechnik",
      code: "EIST",
      aurora: "polar",
      color: "coral",
      kind: "exam",
      totalWeeks: 14,
      weeks: emptyWeeks(14),
      pastPapers: [],
      focusTopics: [],
    },
    {
      id: "seed-gad",
      name: "Grundlagen: Algorithmen und Datenstrukturen",
      code: "GAD",
      aurora: "meadow",
      color: "orange",
      kind: "exam",
      totalWeeks: 14,
      weeks: emptyWeeks(14),
      pastPapers: [],
      focusTopics: [],
    },
    {
      id: "seed-linalg",
      name: "Lineare Algebra für Informatik",
      code: "LinAlg",
      aurora: "orchid",
      color: "peach",
      kind: "exam",
      totalWeeks: 14,
      weeks: emptyWeeks(14),
      pastPapers: [],
      focusTopics: [],
    },
    {
      id: "seed-gra",
      name: "Grundlagenpraktikum: Rechnerarchitektur",
      code: "GRA",
      aurora: "glacier",
      color: "sage",
      kind: "project",
      totalWeeks: 14,
      weeks: emptyWeeks(14),
      pastPapers: [],
      focusTopics: [],
      milestones: [
        { id: "seed-gra-m1", label: "Team & topic registration", status: "todo" },
        { id: "seed-gra-m2", label: "Project plan / Grobentwurf", status: "todo" },
        { id: "seed-gra-m3", label: "Implementation milestone", status: "todo" },
        { id: "seed-gra-m4", label: "Testing & benchmarks", status: "todo" },
        { id: "seed-gra-m5", label: "Report (Ausarbeitung)", status: "todo" },
        { id: "seed-gra-m6", label: "Final presentation", status: "todo" },
      ],
    },
  ];
}

export function defaultSettings(): Settings {
  return {
    theme: "day",
    quotesEnabled: true,
    autoRepeat: false,
    presets: [
      { id: "preset-sprint", name: "Sprint", focusMinutes: 15, breakMinutes: 3 },
      { id: "preset-focus", name: "Focus", focusMinutes: 25, breakMinutes: 5 },
      { id: "preset-deep", name: "Deep Aura", focusMinutes: 50, breakMinutes: 10 },
    ],
    dailyTargetMinutes: 240,
    autoTheme: false,
    nightTheme: "night",
    auraIntensity: 1,
  };
}
