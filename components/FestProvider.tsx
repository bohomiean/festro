"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { Announcement, FestEvent } from "@/lib/types";

interface FestContext {
  events: FestEvent[];
  announcements: Announcement[];
  loading: boolean;
  error: string | null;
  /** True while the realtime connection is open. */
  live: boolean;
  favs: Set<string>;
  toggleFav: (event: FestEvent) => void;
  toast: (message: string) => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<FestContext | null>(null);
const FAV_KEY = "festro-favs-v2";

export function FestProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<FestEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((message: string) => {
    setToastMsg(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2600);
  }, []);

  const refresh = useCallback(async () => {
    const [ev, an] = await Promise.all([
      supabase.from("events").select("*").order("event_date", { nullsFirst: false }).order("sort").order("name"),
      supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    if (ev.error || an.error) {
      setError((ev.error ?? an.error)?.message ?? "Could not load fest data.");
    } else {
      setEvents(ev.data as FestEvent[]);
      setAnnouncements(an.data as Announcement[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  // Load once, then listen for changes. This is what makes an organizer's
  // update appear on every participant's screen without a refresh.
  useEffect(() => {
    if (!supabaseConfigured) {
      setError("Supabase is not configured yet. Add your keys to .env.local (see README).");
      setLoading(false);
      return;
    }
    void refresh();

    const channel = supabase
      .channel("fest-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, (payload) => {
        const a = payload.new as Announcement;
        setAnnouncements((list) => [a, ...list.filter((x) => x.id !== a.id)].slice(0, 20));
        toast(`Live update: ${a.message}`);
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh, toast]);

  // Bookmarks are personal, so they stay in this browser.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]");
      if (Array.isArray(saved)) setFavs(new Set(saved.filter((x): x is string => typeof x === "string")));
    } catch {
      /* storage unavailable: start empty */
    }
  }, []);

  const toggleFav = useCallback(
    (event: FestEvent) => {
      setFavs((prev) => {
        const next = new Set(prev);
        if (next.has(event.id)) next.delete(event.id);
        else next.add(event.id);
        try {
          localStorage.setItem(FAV_KEY, JSON.stringify([...next]));
        } catch {
          /* ignore */
        }
        return next;
      });
      toast(favs.has(event.id) ? `Removed "${event.name}" from saved` : `Saved "${event.name}" to your schedule`);
    },
    [favs, toast],
  );

  return (
    <Ctx.Provider value={{ events, announcements, loading, error, live, favs, toggleFav, toast, refresh }}>
      {children}
      <div className={`toast${toastMsg ? " on" : ""}`} role="status" aria-live="polite">
        {toastMsg}
      </div>
    </Ctx.Provider>
  );
}

export function useFest(): FestContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFest must be used inside <FestProvider>");
  return ctx;
}
