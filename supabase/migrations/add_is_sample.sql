-- Add is_sample flag to listings
-- Marks a listing as a demo/sample so it shows a banner and disables the contact form.
-- Run this in the Supabase SQL Editor.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
