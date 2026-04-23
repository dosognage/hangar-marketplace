-- Listing extras (HOA, property tax, amenities), drafts, and buyer home-airport preferences.
--
-- Three things happen in this migration:
--
--   1. `listings` gains hoa_monthly, annual_property_tax, and amenities (jsonb array).
--   2. `listings.status` accepts 'draft' so the submit form can "Save as Draft".
--   3. New `user_preferences` table caches each user's home airport ICAO + lat/lng so
--      we can run efficient 50-mile radius queries when a new listing drops. User-metadata
--      is where the ICAO originally lives (set via /settings), but you can't query
--      auth.users metadata efficiently, so we mirror the geocoded position here.
--
-- Run this in the Supabase SQL editor.

-- ─── 1. Listing columns ───────────────────────────────────────────────────────

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS hoa_monthly          numeric,
  ADD COLUMN IF NOT EXISTS annual_property_tax  numeric,
  ADD COLUMN IF NOT EXISTS amenities            jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Optional index so amenity filters stay fast.
CREATE INDEX IF NOT EXISTS listings_amenities_idx
  ON listings USING gin (amenities);

-- Radius queries need a lat/lng index. Only create if it doesn't already exist.
CREATE INDEX IF NOT EXISTS listings_latlng_idx
  ON listings (latitude, longitude)
  WHERE status = 'approved';

-- ─── 2. Draft status ──────────────────────────────────────────────────────────
--
-- If a CHECK constraint currently restricts listings.status to a fixed set,
-- drop it and replace with one that includes 'draft'. If none exists, the
-- DROP is harmless (IF EXISTS).

DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
   WHERE t.relname = 'listings'
     AND c.contype = 'c'
     AND pg_get_constraintdef(c.oid) ILIKE '%status%';

  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE listings DROP CONSTRAINT %I', conname);
  END IF;
END $$;

ALTER TABLE listings
  ADD CONSTRAINT listings_status_check
  CHECK (status IN ('draft', 'pending', 'pending_payment', 'approved', 'rejected'));

-- ─── 3. User preferences ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id               uuid         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  home_airport_code     text,
  home_airport_lat      numeric,
  home_airport_lng      numeric,
  notify_new_listings   boolean      NOT NULL DEFAULT true,
  created_at            timestamptz  NOT NULL DEFAULT now(),
  updated_at            timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_preferences_latlng_idx
  ON user_preferences (home_airport_lat, home_airport_lng)
  WHERE notify_new_listings = true;

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own preferences" ON user_preferences;
CREATE POLICY "Users manage their own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
