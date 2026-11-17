-- Zillow-style notes and "not interested" for the Hangar Marketplace app.
--
-- Notes ride on the saved row: a note is something you keep with a listing
-- you are tracking, so adding one also saves the listing. Hidden listings
-- are their own small table; the app drops them from search, the map and
-- "more like this". Both are private to their owner through RLS.

alter table public.saved_listings add column if not exists note text;
alter table public.saved_listings drop constraint if exists saved_listings_note_len;
alter table public.saved_listings
  add constraint saved_listings_note_len check (note is null or char_length(note) <= 1000);

create table if not exists public.hidden_listings (
  user_id    uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.hidden_listings enable row level security;

drop policy if exists "Users manage their own hidden listings" on public.hidden_listings;
create policy "Users manage their own hidden listings"
  on public.hidden_listings
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Since Supabase's Oct 2026 Data API change, new tables need explicit grants.
grant select, insert, delete on public.hidden_listings to authenticated;
