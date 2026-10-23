export type EventStatus = "on_time" | "delayed" | "cancelled";

/** One row of the `events` table. */
export interface FestEvent {
  id: string;
  name: string;
  category: string;
  /** ISO date, e.g. "2026-09-24". Null for undated events. */
  event_date: string | null;
  time: string;
  orig_time: string;
  /** End time, e.g. "09:00 AM". Null means the event runs "onwards". */
  end_time: string | null;
  venue: string;
  coordinator: string;
  phone: string;
  status: EventStatus;
  sort: number;
}

/** One row of the `announcements` table. */
export interface Announcement {
  id: number;
  message: string;
  created_at: string;
}

export const STATUS_LABEL: Record<EventStatus, string> = {
  on_time: "ON TIME",
  delayed: "DELAYED",
  cancelled: "CANCELLED",
};

export { FEST_NAME, HELPDESK, COMMITTEES, CATEGORIES } from "./fest";
