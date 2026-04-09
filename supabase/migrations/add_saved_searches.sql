-- Saved searches: users can subscribe to email alerts for new listings
-- matching their criteria (airport/state/type/price).
-- Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS saved_searches (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text        NOT NULL,
  -- Filter criteria (all optional — null = "any")
  query            text,           -- free-text (city, state, airport code)
  listing_type     text,           -- 'sale' | 'lease' | 'space' | null
  max_price        integer,
  min_sqft         integer,
  -- Notification metadata
  notify_token     text        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  last_notified_at timestamptz,    -- track so we only send truly NEW listings
  -- Optional user link
  user_id          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_searches_email_idx ON saved_searches(email);
CREATE INDEX IF NOT EXISTS saved_searches_notify_token_idx ON saved_searches(notify_token);

-- RLS: owners can manage their own searches
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can create a saved search"
  ON saved_searches FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Token holders can delete their search"
  ON saved_searches FOR DELETE TO anon, authenticated
  USING (true);  -- deletion is gated by token in the API, not RLS
