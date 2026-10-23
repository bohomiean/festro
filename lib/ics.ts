import { parseDate } from "./dates";
import { FEST_NAME } from "./fest";
import { STATUS_LABEL, type FestEvent } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

/** Parses "02:30 PM" / "14:30" into 24-hour time. Defaults to 10:00 if unreadable. */
export function parseTime(text: string): { hours: number; minutes: number } {
  const m = text.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return { hours: 10, minutes: 0 };
  let hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  const meridiem = (m[3] ?? "").toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
}

/** Escapes text per the iCalendar spec (RFC 5545). */
export function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function utcStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/**
 * One VEVENT block, on the event's own date (or `fallbackDay` if it has none).
 * Uses the end time when known and the event isn't delayed; otherwise assumes 2 hours.
 * Times are written in India time (Asia/Kolkata) so they're right on any phone.
 */
export function eventToIcs(e: FestEvent, fallbackDay: Date = new Date()): string {
  const day = e.event_date ? parseDate(e.event_date) : fallbackDay;
  const date = `${day.getFullYear()}${pad(day.getMonth() + 1)}${pad(day.getDate())}`;
  const start = parseTime(e.time);
  const startMin = start.hours * 60 + start.minutes;
  let endMin = startMin + 120;
  if (e.end_time && e.time === e.orig_time) {
    const end = parseTime(e.end_time);
    const m = end.hours * 60 + end.minutes;
    if (m > startMin) endMin = m;
  }
  endMin = Math.min(endMin, 23 * 60 + 59);

  const description = [
    `${FEST_NAME} · ${e.category}`,
    `Status: ${STATUS_LABEL[e.status]}`,
    `Venue: ${e.venue}`,
    e.coordinator && `Coordinator: ${e.coordinator}${e.phone ? ` (${e.phone})` : ""}`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "BEGIN:VEVENT",
    `UID:festro-${e.id}@festro`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART;TZID=Asia/Kolkata:${date}T${pad(start.hours)}${pad(start.minutes)}00`,
    `DTEND;TZID=Asia/Kolkata:${date}T${pad(Math.floor(endMin / 60))}${pad(endMin % 60)}00`,
    `SUMMARY:${escapeText(`${e.name} · ${FEST_NAME}`)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(e.venue)}`,
    `STATUS:${e.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
  ].join("\r\n");
}

// India has no daylight saving, so this one rule covers every date.
const KOLKATA = [
  "BEGIN:VTIMEZONE",
  "TZID:Asia/Kolkata",
  "BEGIN:STANDARD",
  "DTSTART:19700101T000000",
  "TZOFFSETFROM:+0530",
  "TZOFFSETTO:+0530",
  "TZNAME:IST",
  "END:STANDARD",
  "END:VTIMEZONE",
].join("\r\n");

export function buildCalendar(events: readonly FestEvent[], fallbackDay: Date = new Date()): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Festro//Event Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    KOLKATA,
    ...events.map((e) => eventToIcs(e, fallbackDay)),
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Browser only: downloads an .ics file. */
export function downloadCalendar(filename: string, events: readonly FestEvent[]): void {
  const blob = new Blob([buildCalendar(events)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
