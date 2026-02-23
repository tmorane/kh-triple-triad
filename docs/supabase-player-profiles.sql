-- Run this in Supabase SQL editor after enabling Email auth.

create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.player_ladder (
  user_id uuid primary key references auth.users(id) on delete cascade,
  player_name text not null check (char_length(player_name) between 1 and 20),
  owned_cards_count integer not null default 0,
  peak_rank_score integer not null default 0,
  peak_rank_label text not null default 'Iron IV',
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.player_profiles enable row level security;
alter table public.player_ladder enable row level security;

drop policy if exists "Users can insert their own profile" on public.player_profiles;
create policy "Users can insert their own profile"
  on public.player_profiles
  for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own profile" on public.player_profiles;
create policy "Users can read their own profile"
  on public.player_profiles
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own profile" on public.player_profiles;
create policy "Users can update their own profile"
  on public.player_profiles
  for update
  using ((select auth.uid()) = user_id);

drop policy if exists "Public can read ladder" on public.player_ladder;
create policy "Public can read ladder"
  on public.player_ladder
  for select
  using (true);

drop policy if exists "Users can insert their own ladder row" on public.player_ladder;
create policy "Users can insert their own ladder row"
  on public.player_ladder
  for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own ladder row" on public.player_ladder;
create policy "Users can update their own ladder row"
  on public.player_ladder
  for update
  using ((select auth.uid()) = user_id);

create index if not exists player_ladder_owned_idx on public.player_ladder (owned_cards_count desc, updated_at desc);
create index if not exists player_ladder_rank_idx on public.player_ladder (peak_rank_score desc, updated_at desc);
