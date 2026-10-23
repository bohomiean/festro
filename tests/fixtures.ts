import type { FestEvent } from "../lib/types";

let n = 0;
export const ev = (over: Partial<FestEvent>): FestEvent => ({
  id: `id-${++n}`,
  name: "Event",
  category: "Technical",
  event_date: "2026-09-24",
  time: "12:30 PM",
  orig_time: "12:30 PM",
  end_time: null,
  venue: "Hall",
  coordinator: "Sahil, Madiha",
  phone: "",
  status: "on_time",
  sort: 0,
  ...over,
});

/** A slice of the real ORACLE 2026 schedule. */
export const EVENTS: FestEvent[] = [
  ev({ id: "inaug", name: "Inauguration", category: "General", time: "11:00 AM", orig_time: "11:00 AM", end_time: "11:45 AM", venue: "Main Auditorium", coordinator: "Madiha (emcee)" }),
  ev({ id: "itq", name: "IT Quiz", venue: "Room 107" }),
  ev({ id: "web", name: "Web AI", venue: "Lab 1", status: "delayed", time: "01:15 PM" }),
  ev({ id: "bgmi", name: "BGMI", category: "Gaming", event_date: "2026-09-25", time: "12:45 PM", orig_time: "12:45 PM", venue: "Room 118", coordinator: "Sanjay, Suman" }),
  ev({ id: "ff", name: "Free Fire", category: "Gaming", event_date: "2026-09-25", time: "12:45 PM", orig_time: "12:45 PM", venue: "Room 113", coordinator: "Sanjay, Suman" }),
  ev({ id: "gs", name: "Group Singing", category: "Cultural", event_date: "2026-09-26", time: "08:30 AM", orig_time: "08:30 AM", end_time: "09:00 AM", venue: "Main Auditorium", coordinator: "Saniya, Madiha" }),
  ev({ id: "gd", name: "Group Dance", category: "Cultural", event_date: "2026-09-26", time: "09:10 AM", orig_time: "09:10 AM", end_time: "09:50 AM", venue: "Main Auditorium", coordinator: "Saniya, Madiha", status: "cancelled" }),
  ev({ id: "vale", name: "Valedictory", category: "General", event_date: "2026-09-26", time: "12:00 PM", orig_time: "12:00 PM", end_time: "12:40 PM", venue: "Main Auditorium", coordinator: "Saniya, Sahil (emcees)" }),
];
