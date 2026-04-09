-- Add paid sponsorship columns to listings
-- Run this in the Supabase SQL Editor

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS is_sponsored   boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsored_until timestamptz;
