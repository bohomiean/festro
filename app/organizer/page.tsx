"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { useFest } from "@/components/FestProvider";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/dates";
import { CATEGORIES, type EventStatus } from "@/lib/types";

export default function OrganizerPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecked(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // The database decides who is an organizer; this check only picks which screen to show.
  useEffect(() => {
    if (!session) return setIsOrganizer(false);
    supabase
      .from("organizers")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setIsOrganizer(Boolean(data)));
  }, [session]);

  return (
    <section className="wrap">
      <h2>Organizer mode</h2>
      {!checked ? (
        <div className="org">Checking login…</div>
      ) : !session ? (
        <Login />
      ) : !isOrganizer ? (
        <div className="org">
          <p style={{ margin: 0 }}>
            You're signed in as <b>{session.user.email}</b>, but this account isn't an organizer yet. Ask the admin to add
            it to the organizers table.
          </p>
          <button className="btn2" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      ) : (
        <Publisher email={session.user.email ?? ""} />
      )}
    </section>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setBusy(false);
  }

  return (
    <form className="org" onSubmit={submit}>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function Publisher({ email }: { email: string }) {
  const { events, toast } = useFest();
  const [eventId, setEventId] = useState("");
  const [category, setCategory] = useState<string>("Technical");
  const [status, setStatus] = useState<EventStatus>("on_time");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const current = events.find((e) => e.id === eventId) ?? events[0];

  // Fill the form with the selected event's current values.
  useEffect(() => {
    if (!current) return;
    setEventId(current.id);
    setCategory(current.category);
    setStatus(current.status);
    setTime(current.time);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function publish(e: FormEvent) {
    e.preventDefault();
    if (!current) return;
    setBusy(true);
    setError("");
    const newTime = time.trim() || current.time;
    const update = await supabase.from("events").update({ status, category, time: newTime }).eq("id", current.id).select();
    if (update.error || !update.data?.length) {
      setError(update.error?.message ?? "Update was blocked. Is this account in the organizers table?");
      setBusy(false);
      return;
    }
    const text =
      message.trim() ||
      (status === "cancelled"
        ? `${current.name} has been cancelled.`
        : status === "delayed"
          ? `${current.name} is delayed. New time: ${newTime}.`
          : `${current.name} is on time at ${newTime}.`);
    const insert = await supabase.from("announcements").insert({ message: text });
    if (insert.error) setError(insert.error.message);
    else {
      setMessage("");
      toast("Published. Every participant sees it now.");
    }
    setBusy(false);
  }

  async function reset() {
    if (!confirm("Reset all events to the original ORACLE 2026 schedule and clear announcements?")) return;
    const { error } = await supabase.rpc("reset_demo");
    if (error) setError(error.message);
    else toast("Original schedule restored");
  }

  if (!events.length) return <div className="org">No events found. Run supabase/schema.sql first.</div>;

  const categories = Array.from(new Set<string>([...CATEGORIES, ...events.map((e) => e.category)]));

  return (
    <form className="org" onSubmit={publish}>
      <p className="small" style={{ margin: 0 }}>
        Signed in as <b>{email}</b>
      </p>
      <div>
        <label htmlFor="ev">Event</label>
        <select id="ev" value={current?.id ?? ""} onChange={(e) => setEventId(e.target.value)}>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.event_date ? `${formatDate(e.event_date)}, ` : ""}
              {e.time})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="cat">Category</label>
        <select id="cat" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="st">Status</label>
        <select id="st" value={status} onChange={(e) => setStatus(e.target.value as EventStatus)}>
          <option value="on_time">On time</option>
          <option value="delayed">Delayed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div>
        <label htmlFor="nt">Time</label>
        <input id="nt" value={time} onChange={(e) => setTime(e.target.value)} placeholder="e.g. 02:30 PM" />
      </div>
      <div>
        <label htmlFor="nm">Message to participants (optional)</label>
        <textarea id="nm" rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Sorry for the delay…" />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="btn" disabled={busy}>
          {busy ? "Publishing…" : "Publish update"}
        </button>
        <button type="button" className="btn2" onClick={reset}>
          Reset schedule
        </button>
        <button type="button" className="btn2" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>
    </form>
  );
}
