import { NextResponse } from "next/server";
import { answer } from "@/lib/answer";
import { dayLabel, festDays } from "@/lib/dates";
import { COMMITTEES, FEST_NAME, HELPDESK, PROGRAMMES } from "@/lib/fest";
import { serverClient, supabaseConfigured } from "@/lib/supabase";
import type { Announcement, FestEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ChatBody {
  question?: unknown;
  eventId?: unknown;
  saved?: unknown;
  history?: unknown;
}

interface Turn {
  role: "user" | "assistant";
  content: string;
}

const MAX_QUESTION = 500;

/**
 * POST /api/chat
 * 1. Loads the latest events and announcements from Supabase (so answers are always live).
 * 2. If ANTHROPIC_API_KEY is set, asks Claude to answer using only that data.
 * 3. Otherwise, or if the AI call fails, answers with the built-in rules.
 */
export async function POST(req: Request) {
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim().slice(0, MAX_QUESTION) : "";
  if (!question) return NextResponse.json({ error: "Question is required" }, { status: 400 });

  const saved = Array.isArray(body.saved) ? body.saved.filter((x): x is string => typeof x === "string").slice(0, 50) : [];

  let events: FestEvent[] = [];
  let announcements: Announcement[] = [];
  if (supabaseConfigured) {
    const sb = serverClient();
    const [ev, an] = await Promise.all([
      sb.from("events").select("*").order("event_date", { nullsFirst: false }).order("sort"),
      sb.from("announcements").select("*").order("created_at", { ascending: false }).limit(5),
    ]);
    events = (ev.data ?? []) as FestEvent[];
    announcements = (an.data ?? []) as Announcement[];
  }

  const focus = events.find((e) => e.id === body.eventId) ?? null;
  const fallback = answer(question, events, { saved, focus });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ answer: fallback, source: "rules" });

  try {
    const text = await askClaude({ apiKey, question, history: cleanHistory(body.history), events, announcements, saved, focus });
    return NextResponse.json({ answer: text || fallback, source: text ? "ai" : "rules" });
  } catch (err) {
    console.error("AI chat failed, using rules:", err);
    return NextResponse.json({ answer: fallback, source: "rules" });
  }
}

/** Keeps the last few turns, starting with a user turn and alternating roles. */
function cleanHistory(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  const turns: Turn[] = [];
  for (const item of raw.slice(-6)) {
    if (!item || typeof item !== "object") continue;
    const { role, text } = item as { role?: unknown; text?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof text !== "string" || !text.trim()) continue;
    const content = text.slice(0, 1000);
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content += `\n${content}`;
    else turns.push({ role, content });
  }
  while (turns.length && turns[0].role !== "user") turns.shift();
  // The new question is appended as a user turn, so history must end with the assistant.
  if (turns.length && turns[turns.length - 1].role === "user") turns.pop();
  return turns;
}

async function askClaude(args: {
  apiKey: string;
  question: string;
  history: Turn[];
  events: FestEvent[];
  announcements: Announcement[];
  saved: string[];
  focus: FestEvent | null;
}): Promise<string> {
  const { apiKey, question, history, events, announcements, saved, focus } = args;
  const now = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const days = festDays(events);
  const data = {
    fest: FEST_NAME,
    current_date_time_ist: now,
    events: events.map((e) => ({
      name: e.name,
      category: e.category,
      day: e.event_date ? dayLabel(e.event_date, days) : null,
      start_time: e.time,
      originally_scheduled_start: e.orig_time,
      end_time: e.end_time ?? "onwards (no fixed end)",
      venue: e.venue,
      coordinators: e.coordinator || null,
      phone: e.phone || null,
      status: e.status,
    })),
    committees: COMMITTEES,
    ceremony_programmes: PROGRAMMES.map(({ event, emcees, dais, items }) => ({
      event,
      emcees,
      on_the_dais_from_left: dais,
      running_order: items.map(({ time, item, speaker }) => ({ time, item, speaker: speaker ?? null })),
    })),
    helpdesk: HELPDESK,
    latest_announcements: announcements.map((a) => a.message),
    participant_saved_events: events.filter((e) => saved.includes(e.id)).map((e) => e.name),
    event_selected_in_chat: focus?.name ?? null,
  };

  const system = [
    `You are Festro, the friendly assistant for ${FEST_NAME}, a college fest.`,
    "Answer ONLY from the live fest data below. It is updated by organizers in real time and is always correct.",
    "If an event is delayed, give the new time. If it is cancelled, say so clearly.",
    `If the answer is not in the data, say you don't know and point to the helpdesk: ${HELPDESK}.`,
    "Keep replies short (1-4 sentences or a short list), plain text, no markdown, no emojis.",
    "Always say which day an event is on. If the participant mentions a time or day, use the schedule to suggest what they can attend.",
    "Coordinators are listed per event; if there is no phone number, suggest finding the coordinator or the helpdesk.",
    "ceremony_programmes gives the running order of the Inauguration and Valedictory. If that event is delayed, say its item times will shift.",
    "",
    "LIVE FEST DATA (JSON):",
    JSON.stringify(data),
  ].join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
      max_tokens: 400,
      system,
      messages: [...history, { role: "user", content: question }],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (json.content ?? [])
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("")
    .trim();
}
