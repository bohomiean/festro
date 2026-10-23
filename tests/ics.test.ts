import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCalendar, escapeText, eventToIcs, parseTime } from "../lib/ics";
import { ev } from "./fixtures";

test("parses 12-hour and 24-hour times", () => {
  assert.deepEqual(parseTime("02:30 PM"), { hours: 14, minutes: 30 });
  assert.deepEqual(parseTime("12:00 AM"), { hours: 0, minutes: 0 });
  assert.deepEqual(parseTime("12:15 PM"), { hours: 12, minutes: 15 });
  assert.deepEqual(parseTime("18:45"), { hours: 18, minutes: 45 });
  assert.deepEqual(parseTime("soon"), { hours: 10, minutes: 0 });
});

test("escapes commas, semicolons and newlines", () => {
  assert.equal(escapeText("a,b;c\nd"), "a\\,b\\;c\\nd");
});

test("uses the event's own date and India time", () => {
  const ics = eventToIcs(ev({ event_date: "2026-09-25", time: "12:45 PM", orig_time: "12:45 PM" }));
  assert.match(ics, /DTSTART;TZID=Asia\/Kolkata:20260925T124500/);
  assert.match(ics, /DTEND;TZID=Asia\/Kolkata:20260925T144500/);
});

test("uses the end time when there is one", () => {
  const ics = eventToIcs(ev({ event_date: "2026-09-26", time: "08:30 AM", orig_time: "08:30 AM", end_time: "09:00 AM" }));
  assert.match(ics, /DTSTART;TZID=Asia\/Kolkata:20260926T083000/);
  assert.match(ics, /DTEND;TZID=Asia\/Kolkata:20260926T090000/);
});

test("a delayed event ignores the old end time", () => {
  const ics = eventToIcs(ev({ time: "09:20 AM", orig_time: "08:30 AM", end_time: "09:00 AM", status: "delayed" }));
  assert.match(ics, /DTEND;TZID=Asia\/Kolkata:20260924T112000/);
});

test("escapes venue text and marks cancelled events", () => {
  const ics = eventToIcs(ev({ venue: "Lab 1, Block A", status: "cancelled" }));
  assert.match(ics, /LOCATION:Lab 1\\, Block A/);
  assert.match(ics, /STATUS:CANCELLED/);
});

test("late events end at 23:59 instead of wrapping to the morning", () => {
  assert.match(eventToIcs(ev({ time: "11:00 PM", orig_time: "11:00 PM" })), /DTEND;TZID=Asia\/Kolkata:20260924T235900/);
});

test("calendar includes the timezone and all events", () => {
  const cal = buildCalendar([ev({}), ev({})]);
  assert.ok(cal.startsWith("BEGIN:VCALENDAR"));
  assert.ok(cal.endsWith("END:VCALENDAR"));
  assert.match(cal, /BEGIN:VTIMEZONE\r\nTZID:Asia\/Kolkata/);
  assert.equal(cal.match(/BEGIN:VEVENT/g)?.length, 2);
});
