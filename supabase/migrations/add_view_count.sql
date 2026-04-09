-- Add view tracking to listings
-- Run this in the Supabase SQL Editor

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

-- inquiries table for contact form logs
CREATE TABLE IF NOT EXISTS inquiries (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_name  text        NOT NULL,
  buyer_email text        NOT NULL,
  buyer_phone text,
  message     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inquiries_listing_id_idx ON inquiries(listing_id);
CREATE INDEX IF NOT EXISTS inquiries_created_at_idx ON inquiries(created_at DESC);

-- Helper function to atomically increment view count
CREATE OR REPLACE FUNCTION increment_view_count(listing_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE listings SET view_count = view_count + 1 WHERE id = listing_id;
$$;

-- RLS: owners can see inquiries for their listings; anon can insert
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can submit an inquiry"
  ON inquiries FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Listing owners can read their inquiries"
  ON inquiries FOR SELECT TO authenticated
  USING (
    listing_id IN (
      SELECT id FROM listings WHERE user_id = auth.uid()
    )
  );
