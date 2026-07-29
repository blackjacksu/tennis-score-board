-- Event gallery — run this in the Supabase SQL Editor after schema.sql.
--
-- Two halves: a public Storage bucket holding the image files, and a table
-- holding the metadata the grid reads. The browser uploads straight to the
-- bucket using a single-use signed URL minted server-side, so the anon key
-- never needs write access to storage.
--
-- Only staff add photos. The viewer tab is read-only; uploads and deletes go
-- through server actions that check the admin PIN session first.

-- 1. The bucket. Public means reads need no signing — it's an event gallery,
--    and signed URLs on every thumbnail would expire mid-scroll.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-photos',
  'event-photos',
  true,
  8388608, -- 8 MB, matching MAX_UPLOAD_BYTES in lib/gallery.ts
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

-- Anyone may read an object in this bucket. No insert/update/delete policy is
-- defined on purpose: writes happen with the service_role key (signed upload
-- URLs and deletes), which bypasses RLS.
create policy "public read event photos" on storage.objects
  for select using (bucket_id = 'event-photos');

-- 2. The metadata. One row per photo, written only after the file has landed.
create table event_photos (
  id bigint generated always as identity primary key,
  storage_path text not null unique,
  caption text check (caption is null or char_length(caption) <= 140),
  -- Who to credit. Typed by staff at upload time, since staff do the
  -- uploading — it is not an account, just a name on the photo.
  uploader_name text not null check (char_length(uploader_name) between 1 and 40),

  -- Stored so the grid can reserve the right box before the image loads,
  -- which keeps the layout from jumping as photos stream in.
  width int,
  height int,

  created_at timestamptz not null default now()
);

create index event_photos_created_idx on event_photos (created_at desc);

alter table event_photos enable row level security;

create policy "public read event photos" on event_photos
  for select using (true);

-- Live updates, so a photo taken courtside appears on every other phone.
alter publication supabase_realtime add table event_photos;
