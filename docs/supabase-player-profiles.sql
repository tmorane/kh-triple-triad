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
  peak_rank_score_3x3 integer not null default 0,
  peak_rank_label_3x3 text not null default 'Iron IV',
  peak_rank_score_4x4 integer not null default 0,
  peak_rank_label_4x4 text not null default 'Iron IV',
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.player_ladder add column if not exists peak_rank_score_3x3 integer not null default 0;
alter table public.player_ladder add column if not exists peak_rank_label_3x3 text not null default 'Iron IV';
alter table public.player_ladder add column if not exists peak_rank_score_4x4 integer not null default 0;
alter table public.player_ladder add column if not exists peak_rank_label_4x4 text not null default 'Iron IV';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'player_ladder'
      and column_name = 'peak_rank_score'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'player_ladder'
      and column_name = 'peak_rank_label'
  ) then
    execute '
      update public.player_ladder
      set peak_rank_score_3x3 = peak_rank_score,
          peak_rank_label_3x3 = peak_rank_label,
          peak_rank_score_4x4 = peak_rank_score,
          peak_rank_label_4x4 = peak_rank_label
      where peak_rank_score_3x3 = 0
        and peak_rank_score_4x4 = 0
    ';
  end if;
end
$$;

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
create index if not exists player_ladder_rank_3x3_idx on public.player_ladder (peak_rank_score_3x3 desc, updated_at desc);
create index if not exists player_ladder_rank_4x4_idx on public.player_ladder (peak_rank_score_4x4 desc, updated_at desc);
