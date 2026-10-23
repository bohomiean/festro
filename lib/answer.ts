import { dayFromQuestion, dayLabel, festDays, formatDate, parseDate, timeRange } from "./dates";
import { COMMITTEES, EVENT_ALIASES, FAQS, FEST_NAME, HELPDESK, PROGRAMMES, programmeFor, type Programme } from "./fest";
import type { FestEvent } from "./types";

export interface AnswerOptions {
  /** IDs of events the participant has bookmarked. */
  saved?: readonly string[];
  /** The event currently selected in the chat, if any. */
  focus?: FestEvent | null;
  /** Current time, used for "today" / "tomorrow". */
  now?: Date;
}

const when = (e: FestEvent) => [formatDate(e.event_date), timeRange(e)].filter(Boolean).join(", ");

/** One-line summary of an event's status. */
export function describe(e: FestEvent): string {
  if (e.status === "cancelled") return `${e.name} [${e.category}] has been cancelled.`;
  if (e.status === "delayed") return `${e.name} [${e.category}] is delayed. New time: ${when(e)} at ${e.venue}.`;
  return `${e.name} [${e.category}]: ${when(e)} at ${e.venue}.`;
}

const contact = (e: FestEvent) => [e.coordinator, e.phone].filter(Boolean).join(", ");

// Everyday words that appear in event names ("I'm free at 3" should not mean Free Fire).
const COMMON = new Set(["free", "show", "night", "group", "battle", "event", "team", "open"]);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Words of an event's name that identify it on their own: 4+ letters, not common, not shared with another event. */
function distinctiveWords(e: FestEvent, events: readonly FestEvent[]): string[] {
  const words = (name: string) => name.toLowerCase().split(/\s+/);
  return words(e.name).filter(
    (w) => w.length > 3 && !COMMON.has(w) && !events.some((o) => o.id !== e.id && words(o.name).includes(w)),
  );
}

/** "12:30 PM" on an event's date as a Date, or null if the time can't be read. */
function atTime(date: string | null, time: string | null): Date | null {
  const m = time?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!date || !m) return null;
  const d = parseDate(date);
  d.setHours((Number(m[1]) % 12) + (/pm/i.test(m[3]) ? 12 : 0), Number(m[2]));
  return d;
}

/** Answers "what's on now / what's next". Null if the schedule has no readable times. */
function answerNowNext(events: readonly FestEvent[], now: Date): string | null {
  const timed = events
    .filter((e) => e.status !== "cancelled")
    .map((e) => ({ e, start: atTime(e.event_date, e.time), end: atTime(e.event_date, e.end_time) }))
    .filter((x): x is { e: FestEvent; start: Date; end: Date | null } => x.start !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  if (!timed.length) return null;

  const ongoing = timed.filter((x) => x.start <= now && x.end !== null && now < x.end);
  const upcoming = timed.filter((x) => x.start > now);
  const lines: string[] = [];
  if (ongoing.length) lines.push("Happening now:", ...ongoing.map((x) => describe(x.e)));
  if (upcoming.length) {
    const first = upcoming[0].start.getTime();
    if (ongoing.length) lines.push("");
    lines.push("Up next:", ...upcoming.filter((x) => x.start.getTime() === first).map((x) => describe(x.e)));
  } else if (!ongoing.length) {
    return "The fest is over. Thanks for being part of it!";
  }
  return lines.join("\n");
}

/** Which ceremony a question is about ("inauguration", "closing ceremony", …), if any. */
function programmeInQuestion(q: string): Programme | undefined {
  return PROGRAMMES.find(
    (p) => q.includes(p.event.toLowerCase()) || (EVENT_ALIASES[p.event] ?? []).some((a) => q.includes(a)),
  );
}

/** Answers about the Inauguration / Valedictory running order, emcees and dais. Null if not about them. */
function answerProgramme(q: string, events: readonly FestEvent[], days: readonly string[]): string | null {
  const prog = programmeInQuestion(q);
  const scope = prog ? [prog] : PROGRAMMES;
  const whenOf = (p: Programme) => {
    const e = events.find((x) => x.name.toLowerCase() === p.event.toLowerCase());
    return e?.event_date ? `${dayLabel(e.event_date, days)}, ${e.venue}` : (e?.venue ?? "");
  };
  const line = (i: Programme["items"][number]) => `${i.time}  ${i.item}${i.speaker ? ` (${i.speaker})` : ""}`;
  // The running order has fixed times, so warn when organizers have moved the event.
  const note = (p: Programme) => {
    const e = events.find((x) => x.name.toLowerCase() === p.event.toLowerCase());
    if (e?.status === "cancelled") return `\nNote: the ${p.event} has been cancelled.`;
    if (e?.status === "delayed") return `\nNote: the ${p.event} is delayed to ${e.time}, so these times will shift.`;
    return "";
  };

  // A specific item: "when is the principal's speech?", "when do we get certificates?"
  const hits = scope.flatMap((p) => p.items.filter((i) => i.keywords.some((k) => q.includes(k))).map((i) => ({ p, i })));
  if (hits.length) {
    return hits.map(({ p, i }) => `${p.event} · ${whenOf(p)}\n${line(i)}${note(p)}`).join("\n\n");
  }

  if (/\bdais\b|dignitar|chief guest|\bguests?\b|on stage/.test(q)) {
    const p = scope[0];
    return `On the dais${prog ? ` at the ${p.event}` : ""} (from the left): ${p.dais.join(", ")}.`;
  }

  if (/emcee|\bmc\b|anchor|\bhost/.test(q)) {
    return scope.map((p) => `${p.event} emcee${p.emcees.includes(" and ") ? "s" : ""}: ${p.emcees}.`).join("\n");
  }

  if (prog && /flow|programme|program\b|agenda|order|running|what happens|itinerary|plan|schedule/.test(q)) {
    return [`${prog.event} · ${whenOf(prog)}`, `Emcee: ${prog.emcees}`, "", ...prog.items.map(line)].join("\n") + note(prog);
  }
  return null;
}

/**
 * Rule-based answers. Used when the AI chatbot is not configured or fails,
 * so Festro always replies with correct live data.
 */
export function answer(raw: string, events: readonly FestEvent[], opts: AnswerOptions = {}): string {
  const q = raw.toLowerCase();
  const saved = new Set(opts.saved ?? []);
  const days = festDays(events);

  if (/my saved|my events|favou?rite|bookmark|starred|my schedule/.test(q)) {
    const mine = events.filter((e) => saved.has(e.id));
    if (!mine.length) return "You haven't saved any events yet. Tap the star on any event card to add it to your schedule.";
    return [`Your saved events (${mine.length}):`, ...mine.map(describe)].join("\n");
  }

  if (/calendar|export|download schedule|sync/.test(q)) {
    return "Tap the Calendar button on any event card to add it to Google, Apple or Outlook calendar. The Events page can also export all events or just your saved ones.";
  }

  const programmeReply = answerProgramme(q, events, days);
  if (programmeReply) return programmeReply;

  const committee = COMMITTEES.find((c) => q.includes(c.name.toLowerCase()));
  if (committee) return `The ${committee.name} committee is handled by ${committee.coordinator}.`;

  const categories = Array.from(new Set(events.map((e) => e.category.toLowerCase())));
  const namedEvent = events.some((e) => q.includes(e.name.toLowerCase()));
  const cat = categories.find((c) => q.includes(c));
  if (cat && !namedEvent) {
    const list = events.filter((e) => e.category.toLowerCase() === cat);
    if (list.length) return [`${cat[0].toUpperCase()}${cat.slice(1)} events:`, ...list.map(describe)].join("\n");
  }

  if (/helpdesk|help desk|contact (the )?(organi[sz]ers?|team)/.test(q)) return `Helpdesk: ${HELPDESK}.`;

  if (/how many (events|days)|when (does|is) (the )?(fest|oracle)|fest (dates|start|end)|which dates/.test(q) && days.length) {
    return `${FEST_NAME} runs ${formatDate(days[0])} to ${formatDate(days[days.length - 1])}: ${days.length} days, ${events.length} events.`;
  }

  if (!namedEvent && !/delay|cancel/.test(q) && /\bnow\b|right now|ongoing|what'?s next|up next|next event|happening next/.test(q)) {
    const reply = answerNowNext(events, opts.now ?? new Date());
    if (reply) return reply;
  }

  // "What's in Lab 1?" / "What does Sahil handle?"
  if (!namedEvent) {
    const venue = Array.from(new Set(events.map((e) => e.venue).filter(Boolean))).find((v) => q.includes(v.toLowerCase()));
    if (venue) {
      const list = events.filter((e) => e.venue === venue);
      return [`Events at ${venue}:`, ...list.map((e) => `${e.name} (${dayLabel(e.event_date ?? "", days)}, ${timeRange(e)})`)].join("\n");
    }
    const people = Array.from(
      new Set(
        events
          .flatMap((e) => e.coordinator.replace(/\(.*?\)/g, "").split(/,|&|\band\b/))
          .map((n) => n.trim())
          .filter((n) => n.length > 2),
      ),
    );
    const person = people.find((n) => new RegExp(`\\b${escapeRe(n.toLowerCase())}\\b`).test(q));
    if (person) {
      const list = events.filter((e) => e.coordinator.toLowerCase().includes(person.toLowerCase()));
      return [`${person} coordinates:`, ...list.map(describe)].join("\n");
    }
  }

  const faq = FAQS.find((f) => new RegExp(`\\b(?:${f.keywords.map(escapeRe).join("|")})\\b`).test(q));
  if (faq && !namedEvent) return faq.answer ?? `I don't have ${faq.topic} details yet. Please ask the helpdesk: ${HELPDESK}.`;

  const ev =
    events.find((e) => q.includes(e.name.toLowerCase())) ??
    events.find((e) => EVENT_ALIASES[e.name]?.some((a) => q.includes(a))) ??
    events.find((e) => distinctiveWords(e, events).some((w) => new RegExp(`\\b${escapeRe(w)}\\b`).test(q))) ??
    (/anything|every|all events|\bday\s*\d|today|tomorrow/.test(q) ? null : opts.focus ?? null);

  const askStatus = /delay|\blate\b|postpone|cancel|status|on time|running/.test(q);
  const askWhere = /where|venue|location|place|room/.test(q);
  const askWho = /\bwho\b|coordinator|contact|call|phone|number|head/.test(q);
  const askWhen = /when|time|start|begin|date|which day/.test(q);
  const askList = /today|tomorrow|schedule|\ball\b|list|happening|events|\bday\s*\d/.test(q);

  if (ev) {
    const general = !(askStatus || askWhere || askWho || askWhen);
    const parts: string[] = [];
    if (askStatus || general) {
      parts.push(
        ev.status === "cancelled"
          ? `${ev.name} has been cancelled.`
          : ev.status === "delayed"
            ? `${ev.name} is delayed. New time: ${ev.time} (was ${ev.orig_time}).`
            : `${ev.name} is on time.`,
      );
    }
    if ((askWhen || general) && ev.status !== "cancelled") {
      const date = ev.event_date ? `${dayLabel(ev.event_date, days)}, ` : "";
      parts.push(`When: ${date}${timeRange(ev)}.`);
    }
    if (askWhere || general) parts.push(`Venue: ${ev.venue}.`);
    if ((askWho || general) && contact(ev)) parts.push(`Coordinator: ${contact(ev)}.`);
    if (askWho && !contact(ev)) parts.push(`For questions, contact the helpdesk: ${HELPDESK}.`);
    parts.push(`Category: ${ev.category}.`);
    if (general && programmeFor(ev.name)) parts.push(`Ask "what's the ${ev.name.toLowerCase()} flow?" for the full programme.`);
    return parts.join("\n");
  }

  const day = dayFromQuestion(q, days, opts.now);
  if (day) {
    const list = events.filter((e) => e.event_date === day);
    return [`${dayLabel(day, days)}:`, ...list.map(describe)].join("\n");
  }
  if (/\btoday\b|\btomorrow\b/.test(q)) {
    const range = days.length ? `${formatDate(days[0])} to ${formatDate(days[days.length - 1])}` : "soon";
    return `There are no fest events ${/today/.test(q) ? "today" : "tomorrow"}. The fest runs ${range}.`;
  }

  if (askStatus) {
    const affected = events.filter((e) => e.status !== "on_time");
    return affected.length ? affected.map(describe).join("\n") : "Nothing is delayed right now. Every event is running on time.";
  }
  if (askList) {
    return days
      .map((d) => [`${dayLabel(d, days)}:`, ...events.filter((e) => e.event_date === d).map(describe)].join("\n"))
      .concat(events.filter((e) => !e.event_date).map(describe))
      .join("\n\n");
  }
  if ((askWhere || askWho || askWhen) && events.length) return `Which event do you mean? For example: ${events[0].name}.`;
  return `I couldn't find that in the latest fest info. Please contact the helpdesk: ${HELPDESK}.`;
}
