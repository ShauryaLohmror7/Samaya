import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { REFLECTION_MODEL, type ReflectRequest } from "@/lib/ai";

export const runtime = "nodejs";

const SYSTEM = `You are the end-of-day reflection voice of "Aura", a personal study tracker used by a TUM Informatik student during exam season. You receive a JSON summary of today's studying: real logged sessions, total minutes, which subjects were touched, outstanding work (weighted by exam proximity), and days left until each exam.

Write a short reflection with exactly these three parts, in this order, using markdown:

**How today actually went** — 2–4 sentences. Warm but honest and specific: name subjects and minutes. If the day was thin, say so kindly without shaming. If a subject with a near exam got nothing, notice it.

**What's still open** — 2–3 bullet points max, drawn from the outstanding list, prioritised by exam proximity. Be concrete ("GAD homework weeks 8–10"), not generic.

**Tomorrow, in order** — a numbered plan of 2–3 concrete, sized suggestions (e.g. "one 50/10 block on FPV week 9 lecture"). Realistic for one day, no hero schedules.

Rules: no empty hype, no "you've got this!", no emoji. Total under 220 words. Address the student as "you".`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "missing_key", message: "ANTHROPIC_API_KEY is not set — add it to .env.local." },
      { status: 503 }
    );
  }

  let body: ReflectRequest;
  try {
    body = (await request.json()) as ReflectRequest;
  } catch {
    return NextResponse.json({ error: "bad_request", message: "Invalid JSON." }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: REFLECTION_MODEL,
      max_tokens: 600,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Today's study summary:\n${JSON.stringify(body, null, 2)}`,
        },
      ],
    });

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!text) throw new Error("Empty response");
    return NextResponse.json({ reflection: text });
  } catch (err) {
    console.error("[reflect] Anthropic call failed:", err);
    return NextResponse.json(
      { error: "api_error", message: "The reflection service is unavailable right now." },
      { status: 502 }
    );
  }
}
