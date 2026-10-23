import { test } from "node:test";
import assert from "node:assert/strict";
import { answer } from "../lib/answer";
import { EVENTS } from "./fixtures";

test("lists delayed and cancelled events", () => {
  const a = answer("is anything delayed?", EVENTS);
  assert.match(a, /Web AI .* delayed/);
  assert.match(a, /Group Dance .* cancelled/);
  assert.doesNotMatch(a, /IT Quiz/);
});

test("says nothing is delayed when all on time", () => {
  assert.match(answer("any delays?", [EVENTS[0]]), /Nothing is delayed/);
});

test("answers venue for a named event", () => {
  const a = answer("where is BGMI", EVENTS);
  assert.match(a, /Venue: Room 118/);
  assert.doesNotMatch(a, /Coordinator/);
});

test("answers which day an event is on", () => {
  assert.match(answer("when is free fire?", EVENTS), /When: Day 2 · Fri, 25 Sep, 12:45 PM onwards/);
});

test("shows a time range when the event has an end time", () => {
  assert.match(answer("when is group singing", EVENTS), /08:30 AM – 09:00 AM/);
});

test("shows new and original time for a delayed event", () => {
  assert.match(answer("is web ai delayed", EVENTS), /New time: 01:15 PM \(was 12:30 PM\)/);
});

test("'I'm free at 3' does not match Free Fire", () => {
  assert.doesNotMatch(answer("I'm free, where is the venue?", EVENTS), /Free Fire/);
});

test("lists events for 'day 2'", () => {
  const a = answer("what's on day 2?", EVENTS);
  assert.match(a, /^Day 2 · Fri, 25 Sep:/);
  assert.match(a, /BGMI/);
  assert.doesNotMatch(a, /IT Quiz/);
});

test("lists events for a date like '26th september'", () => {
  const a = answer("events on 26th september", EVENTS);
  assert.match(a, /^Day 3/);
  assert.match(a, /Group Singing/);
});

test("'today' uses the current date", () => {
  const a = answer("what's happening today", EVENTS, { now: new Date(2026, 8, 24, 10) });
  assert.match(a, /^Day 1/);
  assert.match(a, /IT Quiz/);
});

test("'today' outside the fest says when it runs", () => {
  assert.match(answer("anything today?", EVENTS, { now: new Date(2026, 9, 1) }), /fest runs Thu, 24 Sep to Sat, 26 Sep/);
});

test("uses the focused event and lists its coordinators", () => {
  assert.match(answer("who do I contact?", EVENTS, { focus: EVENTS.find((e) => e.id === "bgmi") }), /Coordinator: Sanjay, Suman/);
});

test("answers committee questions", () => {
  assert.match(answer("who handles certificates?", EVENTS), /Greeshma Mam/);
});

test("lists saved events", () => {
  const a = answer("show my saved events", EVENTS, { saved: ["bgmi"] });
  assert.match(a, /Your saved events \(1\)/);
  assert.match(a, /BGMI/);
});

test("filters by category", () => {
  const a = answer("show gaming events", EVENTS);
  assert.match(a, /Gaming events:/);
  assert.match(a, /Free Fire/);
  assert.doesNotMatch(a, /IT Quiz/);
});

test("full schedule is grouped by day", () => {
  const a = answer("show the full schedule", EVENTS);
  assert.ok(a.indexOf("Day 1") < a.indexOf("Day 2") && a.indexOf("Day 2") < a.indexOf("Day 3"));
});

test("falls back to helpdesk for unknown questions", () => {
  assert.match(answer("what's the wifi password", EVENTS), /helpdesk/i);
});

// ----- Inauguration & Valedictory programmes -----

test("gives the full inauguration flow", () => {
  const a = answer("what's the flow of the inauguration?", EVENTS);
  assert.match(a, /^Inauguration · Day 1 · Thu, 24 Sep, Main Auditorium/);
  assert.match(a, /Emcee: Madiha/);
  assert.match(a, /11:15–11:20  Principal's Speech \(Rev\. Fr\. Dr\. Thomas MJ\)/);
});

test("finds a single programme item", () => {
  const a = answer("when is the principal's speech?", EVENTS);
  assert.match(a, /Inauguration/);
  assert.match(a, /11:15–11:20/);
  assert.doesNotMatch(a, /Lamp/);
});

test("certificate distribution is a programme item, certificate committee is not", () => {
  assert.match(answer("when do we get certificates?", EVENTS), /12:10–12:15  Certificate Distribution/);
  assert.match(answer("who handles certificates?", EVENTS), /Greeshma Mam/);
});

test("'closing ceremony' means the Valedictory", () => {
  const a = answer("closing ceremony agenda", EVENTS);
  assert.match(a, /^Valedictory · Day 3/);
  assert.match(a, /Vote of Thanks \(Anandhu\)/);
});

test("shared items are scoped by ceremony", () => {
  const a = answer("when is the welcome address at the valedictory", EVENTS);
  assert.match(a, /12:00–12:05  Welcome Address/);
  assert.doesNotMatch(a, /11:10/);
});

test("answers who is on the dais and who the emcees are", () => {
  assert.match(answer("who is on the dais?", EVENTS), /Rev\. Fr\. Dr\. Thomas MJ/);
  assert.match(answer("who are the emcees for valedictory", EVENTS), /Saniya \(3rd BCA\) and Sahil \(2nd BCA\)/);
});

test("warns that programme times shift when the ceremony is delayed", () => {
  const delayed = EVENTS.map((e) => (e.id === "inaug" ? { ...e, status: "delayed" as const, time: "11:30 AM" } : e));
  assert.match(answer("inauguration programme", delayed), /delayed to 11:30 AM, so these times will shift/);
});

test("plain status questions about a ceremony still work", () => {
  assert.match(answer("is the inauguration on time?", EVENTS), /Inauguration is on time/);
});
