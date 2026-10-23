"use client";

import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EventCard } from "@/components/EventCard";
import { useFest } from "@/components/FestProvider";
import { dayLabel, festDays } from "@/lib/dates";
import { downloadCalendar } from "@/lib/ics";

export default function EventsPage() {
  return (
    <Suspense>
      <Events />
    </Suspense>
  );
}

function Events() {
  const { events, favs, loading, error, toast } = useFest();
  const params = useSearchParams();
  const [category, setCategory] = useState("All");
  const [day, setDay] = useState("all");
  const [query, setQuery] = useState("");

  // /events?view=saved opens the Saved filter (used by the nav button).
  useEffect(() => {
    setCategory(params.get("view") === "saved" ? "Saved" : "All");
  }, [params]);

  const days = useMemo(() => festDays(events), [events]);
  const categories = useMemo(() => ["All", "Saved", ...Array.from(new Set(events.map((e) => e.category)))], [events]);

  const inDay = events.filter((e) => day === "all" || e.event_date === day);
  const count = (c: string) =>
    c === "All" ? inDay.length : c === "Saved" ? inDay.filter((e) => favs.has(e.id)).length : inDay.filter((e) => e.category === c).length;

  const filtered = inDay.filter((e) => {
    const q = query.toLowerCase().trim();
    const matchesQuery =
      !q || [e.name, e.category, e.venue, e.coordinator].some((field) => field.toLowerCase().includes(q));
    const matchesCategory = category === "All" ? true : category === "Saved" ? favs.has(e.id) : e.category === category;
    return matchesQuery && matchesCategory;
  });

  const savedEvents = events.filter((e) => favs.has(e.id));
  const reset = () => {
    setCategory("All");
    setDay("all");
    setQuery("");
  };

  return (
    <section className="wrap">
      <div className="section-head">
        <div>
          <h2>All events</h2>
          <p style={{ margin: "-8px 0 0" }}>Search, filter by day or category, bookmark your picks, or export to your calendar.</p>
        </div>
        <div className="row">
          <button
            className="btn2 btn-sm"
            onClick={() => {
              if (!savedEvents.length) return toast("No saved events yet. Tap the star on an event first.");
              downloadCalendar("Festro-Saved-Events.ics", savedEvents);
            }}
          >
            Export saved (.ics)
          </button>
          <button className="btn btn-sm" onClick={() => events.length && downloadCalendar("Festro-All-Events.ics", events)}>
            Export all (.ics)
          </button>
        </div>
      </div>

      {error && <div className="notice">{error}</div>}

      <div className="toolbar">
        <div className="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="search-inp"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, venue, coordinator or category…"
            aria-label="Search events"
            autoComplete="off"
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery("")} aria-label="Clear search">
              ✕
            </button>
          )}
        </div>
        <div className="filter-bar">
          <div className="filters">
            {days.length > 1 && (
              <div className="cats" role="group" aria-label="Filter by day">
                <button className={`cat-pill${day === "all" ? " active" : ""}`} onClick={() => setDay("all")}>
                  All days
                </button>
                {days.map((d) => (
                  <button key={d} className={`cat-pill${day === d ? " active" : ""}`} onClick={() => setDay(d)}>
                    {dayLabel(d, days)}
                  </button>
                ))}
              </div>
            )}
            <div className="cats" role="group" aria-label="Filter by category">
              {categories.map((c) => (
                <button key={c} className={`cat-pill${category === c ? " active" : ""}`} onClick={() => setCategory(c)}>
                  {c === "Saved" ? "⭐ " : ""}
                  {c} <span className="cnt">{count(c)}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="small">
            Showing {filtered.length} of {events.length} events
          </div>
        </div>
      </div>

      <div className="grid">
        {loading ? (
          <div className="empty-state">Loading events…</div>
        ) : filtered.length ? (
          // Group cards under a heading per day.
          [...days, null].map((d) => {
            const list = filtered.filter((e) => e.event_date === d);
            if (!list.length) return null;
            return (
              <Fragment key={d ?? "undated"}>
                {days.length > 1 && <h3 className="day-heading">{d ? dayLabel(d, days) : "Other"}</h3>}
                {list.map((e) => (
                  <EventCard key={e.id} event={e} dayNumber={d ? days.indexOf(d) + 1 : undefined} />
                ))}
              </Fragment>
            );
          })
        ) : (
          <div className="empty-state">
            <h3>No events found</h3>
            <p style={{ margin: "0 0 16px" }}>
              {category === "Saved"
                ? "You haven't saved any events yet. Tap the star on any event to save it."
                : "Try a different search, day or category."}
            </p>
            <button className="btn btn-sm" onClick={reset}>
              Show all events
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
