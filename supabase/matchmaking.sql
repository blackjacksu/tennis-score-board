-- "Find a Game" board — run this in the Supabase SQL Editor after schema.sql.
--
-- One row per pickup-game request. `raw_text` is what the player typed; every
-- other column is the structured intent extracted from it, which is what the
-- matcher compares. All the intent columns are nullable on purpose: a null
-- means "flexible", and flexible matches everything.

create table play_requests (
  id bigint generated always as identity primary key,
  author_name text not null check (char_length(author_name) between 1 and 40),
  raw_text text not null check (char_length(raw_text) between 1 and 400),

  -- Extracted intent.
  play_date date,
  start_minute int check (start_minute between 0 and 1439),
  end_minute int check (end_minute between 0 and 1439),
  city text,
  venue text,
  format text not null default 'either'
    check (format in ('singles', 'doubles', 'either')),
  ntrp numeric check (ntrp between 1 and 7),
  players_needed int not null default 1 check (players_needed between 1 and 7),

  -- How the poster wants to be reached. The handle is public to anyone
  -- viewing the board, so the UI says so before they type one.
  contact_channel text not null default 'none'
    check (contact_channel in ('none', 'messenger', 'instagram', 'whatsapp', 'sms')),
  contact_handle text,

  status text not null default 'open'
    check (status in ('open', 'matched', 'closed')),

  -- Random id from the poster's browser. Not authentication — it only lets
  -- someone close the request they just made from the same device.
  client_id text not null,

  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days'
);

create index play_requests_open_idx on play_requests (status, play_date);
create index play_requests_client_idx on play_requests (client_id, created_at desc);

-- Same posture as the rest of the schema: the anon key reads, and every write
-- goes through a server action holding the service_role key.
alter table play_requests enable row level security;

create policy "public read open play requests" on play_requests
  for select using (status <> 'closed' and expires_at > now());

-- Live updates for everyone on the board.
alter publication supabase_realtime add table play_requests;
