# Key rotation runbook

When to rotate: after a leak, when an employee with access leaves, or on a calendar cadence (every 6 months minimum). All four credential surfaces below should be rotated together, in this order, to avoid leaving the app broken between steps.

## Order of operations

1. Generate new credentials in the provider dashboard (don't revoke the old ones yet — they need to keep working until step 3).
2. Update them in Vercel Environment Variables (Production scope), then trigger a new production deploy. Wait for the deploy to finish.
3. Verify a request flows end-to-end against the new keys (sign in, post a listing, complete a Stripe sponsor checkout, send a transactional email).
4. Revoke the old credentials in the provider dashboard.

Skipping step 2 → the old keys are revoked but Vercel still serves them, breaking the app for users.

## Stripe

Test mode and live mode are separate; rotate both, but live first since that's what production uses.

- **Stripe Dashboard → Developers → API keys** → roll the secret key. Stripe gives you a 24-hour overlap window.
- Update `STRIPE_SECRET_KEY` in Vercel (Production scope only — keep test key in Preview/Development).
- **Stripe Dashboard → Developers → Webhooks** → click the endpoint that points at `hangarmarketplace.com/api/stripe/webhook` → "Roll signing secret". Copy the new `whsec_...`.
- Update `STRIPE_WEBHOOK_SECRET` in Vercel.
- Redeploy production.
- Test: sponsor a listing for 7 days using a real card. Verify webhook fires, `sponsored_until` updates.
- Revoke the old API key in Stripe Dashboard.

## Supabase

- **Supabase Dashboard → Project Settings → API** → "Reset" the `service_role` key (do NOT reset the `anon` key — that one is shipped to the browser and rotating it requires a coordinated client release).
- Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel (Production).
- Redeploy. Verify a server-side write works (post a listing as a verified broker).
- The old key is invalidated immediately on reset, so no separate revoke step.

## Resend

- **Resend Dashboard → API Keys** → "Create API key" with the same scope as the existing one. Then revoke the old one.
- Update `RESEND_API_KEY` in Vercel (Production).
- Redeploy. Verify an email goes out (subscribe to the newsletter from a test account, watch the dashboard).

## GitHub Actions

The E2E test secrets live in **GitHub → Settings → Secrets and variables → Actions**. After any of the above rotations:

- `STRIPE_TEST_SECRET_KEY` and `STRIPE_TEST_WEBHOOK_SECRET` should be the **test mode** equivalents from Stripe (separate keys, never the production ones).
- `TEST_SUPABASE_SERVICE_ROLE_KEY` is the service role for the e2e-test Supabase branch (project ref `pukcxxgafgrieetkgogy`), not production.

Check after rotation: the next E2E workflow run on `main` should still pass.

## Cadence

Calendar reminder for `andre.dosogne@outlook.com`:

- Every March 1 and September 1: rotate Stripe + Supabase + Resend.
- Every December 1: review the GitHub Actions secrets and confirm they still match.

Ad-hoc rotations (employee offboarding, suspected leak): same procedure, same day.
