-- Festro database schema for ORACLE 2026
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run again: it upgrades an existing project and replaces the old demo events.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null default 'General',
  time        text not null,              -- current start time, e.g. '12:30 PM'
  orig_time   text not null,              -- originally scheduled start, so delays can show "was 12:30 PM"
  venue       text not null default '',
  coordinator text not null default '',
  phone       text not null default '',
  status      text not null default 'on_time'
              check (status in ('on_time', 'delayed', 'cancelled')),
  sort        int  not null default 0,
  updated_at  timestamptz not null default now()
);

-- Added for multi-day fests (no-ops if they already exist).
alter table public.events add column if not exists event_date date;
alter table public.events add column if not exists end_time   text;  -- null means "onwards"

create table if not exists public.announcements (
  id         bigint generated always as identity primary key,
  message    text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

-- Only users listed here can publish updates.
create table if not exists public.organizers (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- Internal settings, e.g. which version of the schedule is loaded. Not readable from the website.
create table if not exists public.fest_meta (
  key   text primary key,
  value text not null
);
alter table public.fest_meta enable row level security;

-- Keep updated_at fresh on every change.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists events_touch on public.events;
create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: everyone can read, only organizers can write
-- ---------------------------------------------------------------------------

alter table public.events        enable row level security;
alter table public.announcements enable row level security;
alter table public.organizers    enable row level security;

create or replace function public.is_organizer()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.organizers where user_id = auth.uid());
$$;

drop policy if exists "events are public"        on public.events;
drop policy if exists "organizers update events" on public.events;
drop policy if exists "announcements are public" on public.announcements;
drop policy if exists "organizers post announcements" on public.announcements;
drop policy if exists "see own organizer row"    on public.organizers;

create policy "events are public" on public.events
  for select using (true);

create policy "organizers update events" on public.events
  for update to authenticated
  using (public.is_organizer()) with check (public.is_organizer());

create policy "announcements are public" on public.announcements
  for select using (true);

create policy "organizers post announcements" on public.announcements
  for insert to authenticated
  with check (public.is_organizer());

create policy "see own organizer row" on public.organizers
  for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Privileges: newer Supabase projects don't grant table access automatically.
-- RLS above still decides which rows each role can actually see or change.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select on public.events, public.announcements to anon, authenticated;
grant update on public.events to authenticated;
grant insert on public.announcements to authenticated;
grant select on public.organizers to authenticated;
grant execute on function public.is_organizer() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: push every change on these tables to connected browsers
-- ---------------------------------------------------------------------------

do $$
begin
  begin
    alter publication supabase_realtime add table public.events;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.announcements;
  exception when duplicate_object then null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- ORACLE 2026 event data
-- Coordinators are the event heads for each category.
-- To change the year or dates later, edit the dates below and run this file again,
-- or run e.g.: update public.events set event_date = event_date + 7;
-- ---------------------------------------------------------------------------

create or replace function public.load_oracle_events()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.announcements where true;
  delete from public.events where true;

  insert into public.events (name, category, event_date, time, orig_time, end_time, venue, coordinator, phone, sort) values
    -- Day 1: Inauguration + Technical
    ('Inauguration',     'General',   '2026-09-24', '11:00 AM', '11:00 AM', '11:45 AM', 'Main Auditorium',  'Madiha (emcee)', '', 0),
    ('IT Manager',      'Technical', '2026-09-24', '12:30 PM', '12:30 PM', null,       'Mini Auditorium',  'Arjun Nair, Meera Pillai',  '', 1),
    ('IT Quiz',          'Technical', '2026-09-24', '12:30 PM', '12:30 PM', null,       'Room 107',         'Rohan Shetty, Divya Kamath',  '', 2),
    ('Poster Designing', 'Technical', '2026-09-24', '12:30 PM', '12:30 PM', null,       'Lab 2',            'Ananya Rao, Kiran Bhat',  '', 3),
    ('Web AI',           'Technical', '2026-09-24', '12:30 PM', '12:30 PM', null,       'Lab 1',            'Vikram Hegde, Neha D''Souza',  '', 4),
    -- Day 2: Gaming + Treasure Hunt
    ('BGMI',             'Gaming',    '2026-09-25', '12:45 PM', '12:45 PM', null,       'Room 118',         'Sanjay Kumar, Akash Poojary',  '', 5),
    ('Free Fire',        'Gaming',    '2026-09-25', '12:45 PM', '12:45 PM', null,       'Room 113',         'Suman Gowda, Prajwal Shenoy',  '', 6),
    ('DeadShot',         'Gaming',    '2026-09-25', '12:45 PM', '12:45 PM', null,       'Lab 1',            'Harsh Naik, Yashas Acharya',  '', 7),
    ('Treasure Hunt',    'Cultural',  '2026-09-25', '01:30 PM', '01:30 PM', null,       'Basketball Court', 'Pooja Kulal, Imran Sheikh', '', 8),
    -- Day 3: Cultural + Valedictory
    ('Group Singing',    'Cultural',  '2026-09-26', '08:30 AM', '08:30 AM', '09:00 AM', 'Main Auditorium',  'Shreya Bhandary, Joel Fernandes', '', 9),
    ('Group Dance',      'Cultural',  '2026-09-26', '09:10 AM', '09:10 AM', '09:50 AM', 'Main Auditorium',  'Tanvi Salian, Rahul Prabhu', '', 10),
    ('Cosplay',          'Cultural',  '2026-09-26', '10:00 AM', '10:00 AM', '10:50 AM', 'Main Auditorium',  'Aisha Khan, Dhanush Shetty', '', 11),
    ('Fashion Show',     'Cultural',  '2026-09-26', '11:00 AM', '11:00 AM', '12:00 PM', 'Main Auditorium',  'Nisha Menon, Aaron Dias', '', 12),
    ('Valedictory',      'General',   '2026-09-26', '12:00 PM', '12:00 PM', '12:40 PM', 'Main Auditorium',  'Saniya, Sahil (emcees)', '', 13);

  insert into public.announcements (message)
    values ('Welcome to ORACLE 2026! Live schedule updates, bookmarks and calendar sync are active.');

  insert into public.fest_meta (key, value) values ('schedule_version', '2')
    on conflict (key) do update set value = excluded.value;
end $$;

-- Only callable from the SQL editor or through reset_demo below, not directly from the website.
revoke execute on function public.load_oracle_events() from public, anon, authenticated;

-- "Reset demo" button on the organizer page.
create or replace function public.reset_demo()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_organizer() then
    raise exception 'Only organizers can reset the data';
  end if;
  perform public.load_oracle_events();
end $$;

grant execute on function public.reset_demo() to authenticated;

-- Load the events when the project has an older version of the schedule (or none).
-- Bump the version number in load_oracle_events() whenever the list above changes.
select public.load_oracle_events()
where coalesce((select value from public.fest_meta where key = 'schedule_version'), '') <> '2';

-- ---------------------------------------------------------------------------
-- Make someone an organizer (run after they have an account):
--   insert into public.organizers (user_id)
--   select id from auth.users where email = 'organizer@yourcollege.edu';
-- ---------------------------------------------------------------------------
