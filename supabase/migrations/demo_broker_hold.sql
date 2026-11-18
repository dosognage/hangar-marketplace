-- App Review demo broker: a verified broker account whose listings can
-- never go public.
--
-- Apple reviews the Hangar Marketplace app with a demo account, and the
-- broker side of the app (Listings tab, create, edit, photos) only opens
-- for verified brokers. Verified brokers' listings normally go live the
-- moment they are created (website and app alike), so a reviewer testing
-- "create a listing" would publish a fake hangar to real users.
--
-- broker_profiles.is_demo marks such an account. The trigger below holds
-- any listing owned by a demo broker (by profile or by user) at 'draft'
-- whenever something tries to make it 'approved', so it stays visible
-- only to its owner (listings RLS shows the public approved rows only).
-- Being in the database, it covers every writer: the website's server
-- actions, the app's manage-listing function, and admin tools.
-- Pair it with broker_profiles.is_hidden so the profile also stays out of
-- the public broker directory.

alter table public.broker_profiles
  add column if not exists is_demo boolean not null default false;

comment on column public.broker_profiles.is_demo is
  'App Review demo broker. Its listings are held at draft and can never be approved (trigger listings_hold_demo).';

create or replace function public.hold_demo_listings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and exists (
    select 1
    from public.broker_profiles b
    where b.is_demo
      and (b.id = new.broker_profile_id or b.user_id = new.user_id)
  ) then
    new.status := 'draft';
  end if;
  return new;
end;
$$;

revoke all on function public.hold_demo_listings() from public, anon, authenticated;

drop trigger if exists listings_hold_demo on public.listings;
create trigger listings_hold_demo
  before insert or update of status, broker_profile_id, user_id
  on public.listings
  for each row
  execute function public.hold_demo_listings();
