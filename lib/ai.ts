/**
 * Single swappable model constant for the reflection feature.
 * Google Gemini Flash — available on Google AI Studio's free tier
 * (aistudio.google.com). Swap for any generateContent-capable model.
 */
export const REFLECTION_MODEL = "gemini-2.5-flash";

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
