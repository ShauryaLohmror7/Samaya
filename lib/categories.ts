import type { Category, CustomSessionCategory, SessionCategory, Subject } from "./types";

export type WeeklyTrack = { key: Category | CustomSessionCategory; label: string };

export const BUILTIN_TRACKS: WeeklyTrack[] = [
  { key: "lecture", label: "Lecture" },
  { key: "homework", label: "Homework" },
  { key: "tutorial", label: "Tutorial" },
];

export const BASE_SESSION_CATEGORIES: { value: SessionCategory; label: string }[] = [
  { value: "lecture", label: "Lecture" },
  { value: "homework", label: "Homework" },
  { value: "tutorial", label: "Tutorial" },
  { value: "past_paper", label: "Past paper" },
  { value: "general", label: "General" },
];

export function customCategory(id: string): `custom:${string}` {
  return `custom:${id}`;
}

export function customCategoryId(category: SessionCategory | null | undefined): string | null {
  return typeof category === "string" && category.startsWith("custom:")
    ? category.slice("custom:".length)
    : null;
}

export function isWeeklyCategory(category: SessionCategory | null | undefined): boolean {
  return (
    category === "lecture" ||
    category === "homework" ||
    category === "tutorial" ||
    customCategoryId(category) != null
  );
}

export function subjectWeeklyTracks(subject: Subject): WeeklyTrack[] {
  return [
    ...BUILTIN_TRACKS,
    ...(subject.customAspects ?? []).map((aspect) => ({
      key: customCategory(aspect.id),
      label: aspect.label,
    })),
  ];
}

export function categoryLabel(category: SessionCategory | null | undefined, subject?: Subject): string {
  const value = category ?? "general";
  const customId = customCategoryId(value);
  if (customId) {
    return subject?.customAspects?.find((aspect) => aspect.id === customId)?.label ?? "Custom";
  }
  return value.replace("_", " ");
}

export function sessionCategoryOptions(subject?: Subject): { value: SessionCategory; label: string }[] {
  return [
    ...BASE_SESSION_CATEGORIES,
    ...(subject?.customAspects ?? []).map((aspect) => ({
      value: customCategory(aspect.id),
      label: aspect.label,
    })),
  ];
}
