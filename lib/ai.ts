/** Single swappable model constant for the reflection feature. */
export const REFLECTION_MODEL = "claude-sonnet-5";

/** Payload the client sends to /api/reflect — already aggregated on-device. */
export interface ReflectRequest {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  sessions: {
    subjectCode: string;
    category: string;
    minutes: number;
    note?: string;
  }[];
  subjectsTouched: string[];
  outstanding: { subjectCode: string; description: string }[];
  examHorizon: { subjectCode: string; daysLeft: number }[];
  mood?: number;
}
