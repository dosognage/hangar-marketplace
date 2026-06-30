-- Launch-day trial seeding for HangarMarketplace tier rollout.
--
-- Grants every existing host (anyone with at least one approved listing)
-- a 30-day complimentary Featured tier trial. After the 30 days, the
-- hourly cron job (sweep_host_subscription_expirations) auto-downgrades
-- them to Free if they haven't subscribed.
--
-- Run this ONCE on launch day. Re-running is safe (ON CONFLICT DO NOTHING)
-- but only the first run will seed the trial — subsequent existing-host
-- launches need their own communication.
--
-- Usage:
--   1. Confirm host_subscriptions migration has been applied
--   2. Run this script via Supabase SQL editor or psql
--   3. Send the launch announcement email to those hosts (30-day clock starts now)
--
-- Counts before/after are printed so you can sanity-check.

DO $$
DECLARE
  seeded_count INTEGER;
BEGIN
  RAISE NOTICE 'Existing host_subscriptions rows: %', (SELECT COUNT(*) FROM public.host_subscriptions);
  RAISE NOTICE 'Hosts with at least one approved listing: %',
    (SELECT COUNT(DISTINCT user_id) FROM public.listings WHERE status = 'approved');

  INSERT INTO public.host_subscriptions (user_id, tier, status, current_period_end)
  SELECT DISTINCT
    l.user_id,
    'featured'::text,
    'trial'::text,
    now() + interval '30 days'
  FROM public.listings l
  WHERE l.status = 'approved'
    AND l.user_id IS NOT NULL
  ON CONFLICT (user_id) DO NOTHING;

  GET DIAGNOSTICS seeded_count = ROW_COUNT;
  RAISE NOTICE 'Seeded % new host_subscriptions rows with 30-day Featured trial', seeded_count;
END $$;
