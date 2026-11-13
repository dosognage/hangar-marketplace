-- Applied to production 2026-11-12 via the Supabase MCP (migration
-- social_posts_facebook_autopost). Kept here for the record.
--
-- One row per listing per social channel. Written only by the server
-- (service role); RLS on with no policies keeps it out of client reach.
create table if not exists public.social_posts (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid not null references public.listings(id) on delete cascade,
  channel          text not null default 'facebook_page' check (channel in ('facebook_page')),
  status           text not null check (status in ('posting', 'posted', 'failed', 'manual')),
  caption          text,
  photo_url        text,
  external_post_id text,
  permalink        text,
  error            text,
  attempts         integer not null default 0,
  notes            text,
  posted_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (listing_id, channel)
);

alter table public.social_posts enable row level security;

comment on table public.social_posts is
  'Facebook Page autopost ledger. status manual = Andre posted it by hand; the daily cron skips any listing that already has a row unless it failed fewer than 3 times.';

-- Listings Andre already posted by hand from the Oct 2026 post pack.
insert into public.social_posts (listing_id, channel, status, notes, posted_at)
values
  ('af8e4285-9c83-4dd3-a6af-c3e0a6c41164', 'facebook_page', 'manual', 'Post pack #01, posted by hand', '2026-10-30'),
  ('ac4c3d99-68ba-4a51-9b8a-96628aa62c67', 'facebook_page', 'manual', 'Post pack #02, posted by hand', '2026-11-01'),
  ('a9b3b44b-479f-4361-b6f8-b963d854b84d', 'facebook_page', 'manual', 'Post pack #03, posted by hand', null),
  ('91a2db9b-5c05-4b80-acb4-09a4c14c0513', 'facebook_page', 'manual', 'Post pack #04, queued for Andre to post by hand 2026-11-12', null)
on conflict (listing_id, channel) do nothing;
