-- TAA Tennis Tournament Score Tracker - database schema
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

create table teams (
  id bigint generated always as identity primary key,
  name text not null,
  name_zh text not null default '',
  color text not null default '#3b82f6'
);

create table lines (
  id bigint generated always as identity primary key,
  label text not null,
  ntrp text,
  sort_order int not null default 0
);

create table players (
  id bigint generated always as identity primary key,
  team_id bigint not null references teams(id) on delete cascade,
  name text not null,
  ntrp numeric
);

create table matches (
  id bigint generated always as identity primary key,
  line_id bigint not null references lines(id),
  team_a_id bigint not null references teams(id),
  team_b_id bigint not null references teams(id),
  pair_a text,
  pair_b text,
  score_a int not null default 0,
  score_b int not null default 0,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completed')),
  court text,
  round int not null default 1,
  updated_at timestamptz not null default now()
);

-- Row Level Security: everyone may read, nobody may write with the anon key.
-- Writes happen only from the server using the service_role key (bypasses RLS).
alter table teams enable row level security;
alter table lines enable row level security;
alter table players enable row level security;
alter table matches enable row level security;

create policy "public read teams" on teams for select using (true);
create policy "public read lines" on lines for select using (true);
create policy "public read players" on players for select using (true);
create policy "public read matches" on matches for select using (true);

-- Broadcast match changes to connected viewers in real time.
alter publication supabase_realtime add table matches;
