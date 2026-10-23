# Festro · ORACLE 2026

A live assistant for ORACLE 2026, a three-day college fest. Participants browse events, save a personal schedule, export it to their calendar, and ask an AI chatbot questions. When an organizer posts a delay, every open phone updates instantly, with no refresh.

**Stack:** Next.js 15 (App Router) · TypeScript · Supabase (Postgres, Auth, Realtime) · Claude API · Vercel

---

## Setup (about 15 minutes)

### 1. Install

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local
```

### 2. Create the Supabase project

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the whole of `supabase/schema.sql`, and click **Run**. This creates the tables, the security rules and live updates, and loads all 14 ORACLE 2026 events.
   Already ran an older version? Run the new file again. It upgrades the tables and loads the latest schedule, but only when the schedule version has changed, so organizer edits aren't wiped on every run.
3. Open **Project Settings → API** and copy the **Project URL** and **anon public** key into `.env.local`.

### 3. Create an organizer account

1. **Authentication → Users → Add user**, and enter an email and password.
2. In the SQL Editor, run:
   ```sql
   insert into public.organizers (user_id)
   select id from auth.users where email = 'organizer@yourcollege.edu';
   ```
3. Under **Authentication → Sign In / Providers**, turn off "Allow new users to sign up" so strangers can't create accounts.

### 4. (Optional) Turn on the AI chatbot

Add `ANTHROPIC_API_KEY` to `.env.local` (from [console.anthropic.com](https://console.anthropic.com)). Without a key, the chatbot still works using built-in keyword answers.

### 5. Run it

```bash
npm run dev      # http://localhost:3000
npm test         # chatbot and calendar export tests
```

To try live updates, open the site in two browser windows. Sign in at **/organizer** in one and publish a delay. The other window updates on its own.

### 6. Deploy to Vercel

1. Push the project to GitHub.
2. On [vercel.com](https://vercel.com), choose **Add New → Project**, import the repo, and add the same environment variables from `.env.local`.
3. Deploy. You get a public link to share or put on a QR code poster.

---

## How it works

### How does a delay reach everyone's phone?

1. The organizer signs in and clicks **Publish update**. The browser writes the change to the `events` table and adds a row to `announcements`.
2. Postgres checks the **Row Level Security** rules. Only users listed in `organizers` are allowed to write. Anyone else's write is rejected by the database itself, not just hidden in the UI.
3. Both tables are part of Supabase's **Realtime** publication. Supabase pushes the change over a WebSocket to every browser that has Festro open.
4. `components/FestProvider.tsx` listens on that connection. On an event change it reloads the schedule, and on a new announcement it shows it right away with a toast. React then re-renders every page.

The green dot in the announcement bar shows that the live connection is active.

### How does the chatbot answer?

`app/api/chat/route.ts` runs on the server:

1. It loads the latest events and announcements from Supabase, so answers always reflect the newest delays.
2. It sends that data, the current time in IST and the participant's saved events to Claude, with instructions to answer only from the data.
3. If there is no API key or the AI call fails, it falls back to `lib/answer.ts`, a rule-based answerer, so the bot never goes silent.

The API key stays on the server and is never sent to the browser.

### Why this stack

- **Supabase** provides the database, login and live updates in one service, so no separate backend server is needed.
- **Next.js** handles the pages and the one server route (the chatbot) in a single project, and deploys to Vercel with one click.
- **TypeScript** catches mistakes like misspelled event fields before the app runs.

---

## Your fest data

The schedule lives in `supabase/schema.sql`, in the `load_oracle_events` function:

| Day | Date | Events |
|---|---|---|
| Day 1 | Thu, 24 Sep 2026 | Inauguration (11:00–11:45 AM), IT Manager, IT Quiz, Poster Designing, Web AI (Technical) |
| Day 2 | Fri, 25 Sep 2026 | BGMI, Free Fire, DeadShot (Gaming), Treasure Hunt |
| Day 3 | Sat, 26 Sep 2026 | Group Singing, Group Dance, Cosplay, Fashion Show (Cultural), Valedictory (12:00–12:40 PM) |

- **Coordinators** are the event heads for each category (Technical: Sahil, Madiha; Gaming: Sanjay, Suman; Cultural: Saniya, Madiha).
- **Committees**, the **helpdesk** contact, and the **Inauguration and Valedictory running order** (emcees, dais, each item's time and speaker) are in `lib/fest.ts`. The chatbot answers from them ("when is the principal's speech?"), and the two event cards show the programme.
- **To change a detail during the fest**, use the organizer page. It updates everyone live.
- **To change the base schedule**, edit the list in `schema.sql`, change `'2'` to `'3'` in both places where `schedule_version` appears, and run the file again. This reloads the events and clears announcements.
- **To move every date** (for example, to a new year), run: `update public.events set event_date = event_date + interval '1 year';`

## Project map

| Path | What it does |
|---|---|
| `supabase/schema.sql` | Tables, security rules, realtime, demo data |
| `lib/supabase.ts` | Supabase client |
| `lib/types.ts` | Shared types for events and announcements |
| `lib/fest.ts` | Fest name, helpdesk, committees |
| `lib/dates.ts` | Day labels, time ranges, "day 2" / "25th" / "today" in questions |
| `lib/answer.ts` | Rule-based chatbot answers (fallback) |
| `lib/ics.ts` | Calendar (.ics) export |
| `components/FestProvider.tsx` | Loads data, subscribes to live updates, saved events, toasts |
| `components/Chat.tsx` | Chat window |
| `components/EventCard.tsx` | One event card |
| `app/page.tsx` | Home |
| `app/events/page.tsx` | Search, filter by day and category, save, export |
| `app/ask/page.tsx` | Chatbot page |
| `app/organizer/page.tsx` | Organizer login and publishing |
| `app/api/chat/route.ts` | AI chatbot endpoint |
| `tests/` | Tests for the chatbot rules and calendar export |

## Ideas for next steps

- Make it installable with offline support (add a service worker).
- Push notifications for delays on saved events.
- A QR code poster that links to the deployed site.
