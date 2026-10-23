"use client";

import Link from "next/link";
import { formatDate, timeRange } from "@/lib/dates";
import { programmeFor } from "@/lib/fest";
import { downloadCalendar } from "@/lib/ics";
import { STATUS_LABEL, type FestEvent } from "@/lib/types";
import { useFest } from "./FestProvider";

const STAR = "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2";

export function StatusChip({ status }: { status: FestEvent["status"] }) {
  return <span className={`chip ${status === "on_time" ? "ok" : "d"}`}>{STATUS_LABEL[status]}</span>;
}

export function EventCard({ event: e, dayNumber }: { event: FestEvent; dayNumber?: number }) {
  const { favs, toggleFav, toast } = useFest();
  const isFav = favs.has(e.id);
  const contact = [e.coordinator, e.phone].filter(Boolean).join(" · ");
  const programme = programmeFor(e.name);

  return (
    <article className="card pop">
      <div className="card-header">
        <div className="card-title-group">
          <h3>{e.name}</h3>
          <div className="badges">
            <span className="tag-chip">{e.category}</span>
            <StatusChip status={e.status} />
          </div>
        </div>
        <button
          className={`fav-btn${isFav ? " is-fav" : ""}`}
          onClick={() => toggleFav(e)}
          aria-pressed={isFav}
          aria-label={`${isFav ? "Remove" : "Save"} ${e.name}`}
          title={isFav ? "Remove from saved" : "Save to your schedule"}
        >
          <svg viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <polygon points={STAR} />
          </svg>
        </button>
      </div>

      {e.event_date && (
        <p className="date">
          {dayNumber ? `Day ${dayNumber} · ` : ""}
          {formatDate(e.event_date)}
        </p>
      )}
      <p className="when">
        {e.status === "delayed" && <s>{e.orig_time}</s>} <b>{timeRange(e)}</b>
      </p>
      <p className="muted">📍 {e.venue}</p>
      {contact && <p className="small">👤 {contact}</p>}
      {programme && (
        <details className="programme">
          <summary>Programme ({programme.items.length} items)</summary>
          <ol>
            {programme.items.map((i) => (
              <li key={i.item}>
                <span className="t">{i.time}</span> {i.item}
                {i.speaker && <span className="muted"> · {i.speaker}</span>}
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="card-actions">
        <Link className="btn2 btn-sm" href={`/ask?event=${e.id}`}>
          Ask Festro
        </Link>
        <button
          className="btn2 btn-sm"
          onClick={() => {
            downloadCalendar(`${e.name.replace(/[^a-z0-9]/gi, "_")}.ics`, [e]);
            toast(`Added ${e.name} to a calendar file`);
          }}
        >
          Calendar
        </button>
      </div>
    </article>
  );
}
