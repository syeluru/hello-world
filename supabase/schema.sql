-- Trackline: fitness & nutrition tracker schema
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor > New query).

create extension if not exists "pgcrypto";

-- One row per day of training
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  workout_date date not null unique,
  muscle_groups text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per logged meal
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  items jsonb not null default '[]'::jsonb,
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  eaten_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists meals_eaten_at_idx on public.meals (eaten_at desc);

-- keep updated_at fresh on workout edits
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists workouts_touch on public.workouts;
create trigger workouts_touch before update on public.workouts
  for each row execute function public.touch_updated_at();

-- Single-user setup: RLS is enabled with permissive policies for the anon key.
-- Anyone holding your anon key + URL can read/write, so don't share them
-- publicly. To lock it down later, add Supabase Auth and replace these
-- policies with auth.uid()-based ones.
alter table public.workouts enable row level security;
alter table public.meals enable row level security;

drop policy if exists "anon full access" on public.workouts;
create policy "anon full access" on public.workouts
  for all using (true) with check (true);

drop policy if exists "anon full access" on public.meals;
create policy "anon full access" on public.meals
  for all using (true) with check (true);
