import type { FestEvent } from "./types";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2026-09-24" -> Date at local midnight (avoids UTC shifting the day). */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "2026-09-24" -> "Thu, 24 Sep" */
export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = parseDate(iso);
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()][0].toUpperCase()}${MONTHS[d.getMonth()].slice(1)}`;
}

/** Sorted list of distinct fest dates. Day 1 is the first. */
export function festDays(events: readonly FestEvent[]): string[] {
  return Array.from(new Set(events.map((e) => e.event_date).filter((d): d is string => Boolean(d)))).sort();
}

/** "Day 2 · Fri, 25 Sep" */
export function dayLabel(iso: string, days: readonly string[]): string {
  const n = days.indexOf(iso);
  return n >= 0 ? `Day ${n + 1} · ${formatDate(iso)}` : formatDate(iso);
}

/** "12:30 PM onwards", "08:30 AM – 09:00 AM", or the new time when delayed. */
export function timeRange(e: FestEvent): string {
  if (e.status === "cancelled") return "Cancelled";
  if (e.end_time && e.time === e.orig_time) return `${e.time} – ${e.end_time}`;
  return `${e.time} onwards`;
}

/**
 * Finds which fest day a question is about: "day 2", "25th", "25 sep", "september 26",
 * "today" or "tomorrow" (relative to `now`). Returns the ISO date or null.
 */
export function dayFromQuestion(q: string, days: readonly string[], now: Date = new Date()): string | null {
  if (!days.length) return null;
  const text = q.toLowerCase();

  const dayN = text.match(/\bday\s*(\d)\b/);
  if (dayN) return days[Number(dayN[1]) - 1] ?? null;

  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (/\btoday\b/.test(text)) return days.includes(iso(now)) ? iso(now) : null;
  if (/\btomorrow\b/.test(text)) {
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return days.includes(iso(t)) ? iso(t) : null;
  }

  // "25th", "25 sep", "sept 25", "september 25th"
  const m =
    text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s*)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/) ??
    text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{1,2})(?:st|nd|rd|th)?\b/);
  let dayOfMonth: number | null = null;
  let month: number | null = null;
  if (m) {
    const [a, b] = /\d/.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
    dayOfMonth = Number(a);
    month = MONTHS.indexOf(b.slice(0, 3));
  } else {
    const ordinal = text.match(/\b(\d{1,2})(?:st|nd|rd|th)\b/);
    if (ordinal) dayOfMonth = Number(ordinal[1]);
  }
  if (dayOfMonth === null) return null;
  return (
    days.find((d) => {
      const date = parseDate(d);
      return date.getDate() === dayOfMonth && (month === null || date.getMonth() === month);
    }) ?? null
  );
}
