-- Lease term on listings, and richer filters on saved searches (alerts).
--
-- listings.lease_term: the shortest commitment a lease listing asks for,
-- so renters can filter for month-to-month space. Null = not stated.
--
-- saved_searches: an alert can now carry a price floor, a property type,
-- required amenities (keys from listings.amenities, e.g. 'heat', 'power'),
-- and a location as a point plus radius ("within 50 nm of KBFI") instead
-- of only a text match on city/state/airport. location_label is the
-- human text for that point, shown in the app and in the alert email.
-- The hourly notify cron (app/api/cron/saved-searches-notify) applies all
-- of them. Every column is nullable and additive: existing alerts and the
-- website's alert form keep working unchanged.

alter table public.listings
  add column if not exists lease_term text;

alter table public.listings
  drop constraint if exists listings_lease_term_check;
alter table public.listings
  add constraint listings_lease_term_check
  check (lease_term is null or lease_term in ('month_to_month', 'six_months', 'one_year', 'multi_year'));

alter table public.saved_searches
  add column if not exists min_price      integer,
  add column if not exists property_type  text,
  add column if not exists amenities      text[],
  add column if not exists near_lat       double precision,
  add column if not exists near_lng       double precision,
  add column if not exists radius_nm      integer,
  add column if not exists location_label text;

alter table public.saved_searches
  drop constraint if exists saved_searches_radius_check;
alter table public.saved_searches
  add constraint saved_searches_radius_check
  check (
    (near_lat is null and near_lng is null and radius_nm is null)
    or (near_lat between -90 and 90 and near_lng between -180 and 180 and radius_nm between 1 and 1000)
  );
