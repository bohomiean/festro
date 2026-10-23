"use client";

import Link from "next/link";
import { useFest } from "@/components/FestProvider";
import { festDays } from "@/lib/dates";
import { FEST_NAME } from "@/lib/fest";

const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });

export default function HomePage() {
  const { announcements, events, error } = useFest();
  const days = festDays(events);

  return (
    <>
      <div className="wrap hero">
        <div style={{ flex: "1 1 400px" }}>
          <span className="chip ok" style={{ fontSize: 13, padding: "6px 14px" }}>
            Updated live by the organizers
          </span>
          <h1>Never miss a moment of {FEST_NAME}.</h1>
          <p className="lead">
            {days.length > 1 ? `${days.length} days, ${events.length} events. ` : ""}Search events, bookmark your schedule,
            export to calendar, and ask Festro anything.
          </p>
          <div className="row">
            <Link className="btn" href="/ask">
              Ask Festro
            </Link>
            <Link className="btn2" href="/events">
              See all events
            </Link>
          </div>
        </div>
        <div className="live">
          <b className="small">Live updates</b>
          {error && <div className="u">{error}</div>}
          {announcements.slice(0, 3).map((a) => (
            <div className="u" key={a.id}>
              <time dateTime={a.created_at}>{timeFmt.format(new Date(a.created_at))}</time>
              {a.message}
            </div>
          ))}
        </div>
      </div>

      <section className="wrap">
        <div className="grid">
          <Link className="card pop" href="/events">
            <h3 className="accent">Browse events</h3>
            <p>See the full list. Search, filter by category, save favourites and add them to your calendar.</p>
          </Link>
          <Link className="card pop" href="/ask">
            <h3 className="accent">Ask Festro</h3>
            <p>Instant answers on delays, venues, coordinators and your saved schedule.</p>
          </Link>
        </div>
      </section>
    </>
  );
}
