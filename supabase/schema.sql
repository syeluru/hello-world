-- Workout tracker sync table.
-- Run in the Supabase SQL editor (Dashboard > SQL Editor > New query).
--
-- The whole app document (workouts, routines, settings, in-progress workout)
-- is stored as one JSON row. Last write wins by the document's updatedAt.

create table if not exists public.app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Single-user setup: RLS enabled with a permissive anon policy, so anyone who
-- has your URL + anon key can read/write. Keep them private. To lock it down
-- add Supabase Auth and replace this policy with an auth.uid()-based one.
alter table public.app_state enable row level security;

drop policy if exists "anon full access" on public.app_state;
create policy "anon full access" on public.app_state
  for all using (true) with check (true);
