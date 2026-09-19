-- Idempotency key for listing submissions.
--
-- The submit flow inserts the listing row first and uploads photos after.
-- Any failure between the two (Stripe checkout creation, a signed upload
-- URL, the photo record save) left a real listing behind while the form
-- still showed "please try again", and the retry inserted a second copy.
-- The form now sends one id per attempt; createListing returns the
-- existing row for a repeat of the same attempt.

alter table public.listings add column if not exists client_submission_id uuid;

create unique index if not exists listings_user_client_submission_uidx
  on public.listings (user_id, client_submission_id)
  where client_submission_id is not null;

comment on column public.listings.client_submission_id is
  'Idempotency key from the submit form: one per attempt, so a retry after a mid-flow failure returns the same listing instead of inserting a duplicate.';
