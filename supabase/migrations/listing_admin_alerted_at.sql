-- Broker listings created in the iOS app announce themselves to admins
-- through POST /api/listings/announce (called by the manage-listing edge
-- function). This column is the once-only claim, so a retry or a repeat
-- call never sends a second admin email for the same listing.
alter table public.listings add column if not exists admin_alerted_at timestamptz;
