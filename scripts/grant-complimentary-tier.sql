-- Grant a single host complimentary tier access. Used for:
--   - Robert Outerbridge's 6-month free Featured (promised in his
--     2026-06-30 reply email)
--   - Future early-customer thank-yous
--   - Beta tester grants
--
-- Edit the three variables below before running. The script is
-- idempotent: re-running with the same user_id refreshes the trial
-- window from "now" forward.

-- ── Edit these three ──────────────────────────────────────────────────
\set user_id    '00000000-0000-0000-0000-000000000000'   -- the host's auth.users.id
\set tier       'featured'                                -- 'featured' or 'pro'
\set months     6                                         -- duration in months
-- ──────────────────────────────────────────────────────────────────────

INSERT INTO public.host_subscriptions (user_id, tier, status, current_period_end)
VALUES (
  :'user_id',
  :'tier',
  'trial',
  now() + (:months || ' months')::interval
)
ON CONFLICT (user_id) DO UPDATE SET
  tier   = EXCLUDED.tier,
  status = 'trial',
  current_period_end = EXCLUDED.current_period_end;

SELECT user_id, tier, status, current_period_end, updated_at
FROM   public.host_subscriptions
WHERE  user_id = :'user_id';
