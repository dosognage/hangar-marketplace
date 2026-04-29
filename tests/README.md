# Hangar Marketplace — E2E Test Suite

End-to-end browser tests powered by [Playwright](https://playwright.dev). Tests
exercise real user flows (signup, listing submission, broker approval with
password reauth, comp-sponsor admin actions, Stripe checkout) against a deployed
environment using an isolated Supabase test branch.

---

## TL;DR for Andre

1. **Locally**: tests assume a `.env.test` file is present in the repo root with
   credentials for the test Supabase branch + test users + Stripe test keys.
   Copy `tests/.env.test.example` and fill it in.

2. **In CI**: GitHub Actions runs the suite on every push to `main`, every PR,
   and every Monday 9am UTC. Required secrets are listed below.

3. **When something breaks**: GitHub will email you. Click into the failed run,
   download the `playwright-report-*.zip` artifact, open `index.html` to see
   exactly which test failed and why (with screenshots, video, and a full trace
   you can scrub through).

---

## Architecture

```
tests/
├── README.md                       # This file
├── .env.test.example               # Template for local env config
└── e2e/
    ├── setup/
    │   └── auth.setup.ts           # Pre-authenticates test users, saves storage
    ├── fixtures/
    │   ├── test.ts                 # Custom Playwright test extension
    │   └── pages/
    │       ├── BasePage.ts         # Page Object Model: shared header/nav
    │       ├── LoginPage.ts
    │       ├── SignupPage.ts
    │       ├── ForgotPasswordPage.ts
    │       ├── SettingsPage.ts
    │       ├── SubmitListingPage.ts
    │       ├── BrokerApplyPage.ts
    │       └── AdminPage.ts
    ├── helpers/
    │   ├── supabase-admin.ts       # Service-role client (test branch only)
    │   ├── test-users.ts           # ADMIN/BROKER/USER credentials
    │   ├── cleanup.ts              # Removes ephemeral test data
    │   └── stripe-cards.ts         # Stripe test card numbers
    ├── specs/
    │   ├── smoke.spec.ts           # Page renders + auth-gate redirects
    │   ├── auth.spec.ts            # Signup/login/forgot-password/login alerts
    │   ├── turnstile.spec.ts       # Turnstile bypass with test sitekey
    │   ├── settings-reauth.spec.ts # Email change requires password
    │   ├── admin-reauth.spec.ts    # Comp-sponsor password modal
    │   ├── broker-flow.spec.ts     # Apply → approve with reauth → broker dashboard
    │   ├── listing-flow.spec.ts    # Submit listing → pending → approve
    │   └── stripe-checkout.spec.ts # Stripe sponsor checkout (tagged @stripe)
    ├── .auth/                      # Saved auth states (gitignored)
    └── .test-results/              # Traces, screenshots, videos (gitignored)
```

### Why a Supabase test branch?

Because tests mutate data freely (creating users, listings, applications,
comping sponsorships), pointing at production would corrupt real user data.
The `e2e-test` branch (project ref `pukcxxgafgrieetkgogy`) is a Pro-tier
Supabase branch off the `hangar-marketplace` project, with its own database
that resets on demand.

### Why Stripe test mode?

Stripe test keys (`sk_test_...`) never charge real money but otherwise behave
identically. Test cards like `4242 4242 4242 4242` simulate successful
charges; `4000 0000 0000 0002` simulates a decline.

### Why the Turnstile test sitekey?

Cloudflare publishes special sitekeys
(`1x00000000000000000000AA`) that always pass without showing a challenge.
Production uses the real sitekey; tests substitute the bypass key via env vars.

---

## Running locally

### Prerequisites

- Node 20+
- A `.env.test` file in the repo root, copied from `tests/.env.test.example`
  and filled in with real values.

### One-time setup

```bash
npm install
npm run test:e2e:install   # installs Playwright browsers (~150 MB)
```

### Running

```bash
# Headless run, default browser (Chromium)
npm run test:e2e

# Interactive UI mode — recommended for debugging
npm run test:e2e:ui

# Headed mode (see the browser)
npm run test:e2e:headed

# Debug a single test step-by-step
npm run test:e2e:debug

# Open the HTML report after a run
npm run test:e2e:report

# Generate a new test by recording browser actions
npm run test:e2e:codegen http://localhost:3000
```

### Filtering tests

```bash
# Run only smoke tests
npx playwright test --grep @smoke

# Skip Stripe tests (e.g. when STRIPE_SECRET_KEY isn't configured)
npx playwright test --grep-invert @stripe

# Run a single spec file
npx playwright test specs/auth.spec.ts

# Run cross-browser (Firefox + WebKit too)
CROSS_BROWSER=1 npm run test:e2e
```

---

## CI / GitHub Actions

The workflow at `.github/workflows/e2e.yml` runs on:

- Every PR to `main` (Chromium only, fast feedback)
- Every push to `main` (catch breakage in deployed code)
- Mondays at 9am UTC (cross-browser, weekly drift check)
- Manual dispatch from Actions tab

### Required GitHub Actions secrets

Add these in **Repo Settings → Secrets and Variables → Actions → New repository
secret**:

| Secret name                          | Where to get it                                            |
|--------------------------------------|------------------------------------------------------------|
| `PLAYWRIGHT_BASE_URL`                | The deployed URL to test against. For prod-only tests, use `https://hangarmarketplace.com`. For preview deployments, see the Vercel section below. |
| `TEST_SUPABASE_URL`                  | Supabase test branch project URL: `https://pukcxxgafgrieetkgogy.supabase.co` |
| `TEST_SUPABASE_ANON_KEY`             | Supabase test branch → Settings → API → `anon` (public) key |
| `TEST_SUPABASE_SERVICE_ROLE_KEY`     | Same page → `service_role` (secret) key. **Never expose client-side.** |
| `STRIPE_TEST_SECRET_KEY`             | Stripe Dashboard → Developers → API keys → toggle to Test mode → `sk_test_...` |
| `STRIPE_TEST_WEBHOOK_SECRET`         | Stripe Dashboard → Developers → Webhooks → test endpoint → Signing secret. Need to add a test webhook endpoint pointing at your test environment URL. |
| `TEST_ADMIN_EMAIL`                   | `e2e+admin@hangarmarketplace.com` (or your choice) |
| `TEST_ADMIN_PASSWORD`                | The password you set when seeding the admin user |
| `TEST_BROKER_EMAIL`                  | `e2e+broker@hangarmarketplace.com` |
| `TEST_BROKER_PASSWORD`               | Seeded broker's password |
| `TEST_USER_EMAIL`                    | `e2e+user@hangarmarketplace.com` |
| `TEST_USER_PASSWORD`                 | Seeded user's password |
| `RESEND_API_KEY` *(optional)*        | Used by the `notify` job to email Andre on failures |

### Vercel Preview env wiring (recommended)

To run E2E tests against PR preview deployments instead of production, override
the Preview-scope env vars in Vercel:

1. Vercel → `hangar-marketplace-kpoo` → Settings → Environment Variables
2. For each of these, click **Edit** and add a separate Preview-scoped value:
   - `NEXT_PUBLIC_SUPABASE_URL` → test branch URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → test branch anon key
   - `SUPABASE_SERVICE_ROLE_KEY` → test branch service role key
   - `STRIPE_SECRET_KEY` → `sk_test_...`
   - `STRIPE_WEBHOOK_SECRET` → `whsec_...` (from Stripe test webhook endpoint)
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` → `1x00000000000000000000AA`
   - `TURNSTILE_SECRET_KEY` → `1x0000000000000000000000000000000AA`
3. Production scope stays as-is (live keys).

This way every PR preview talks to the test database, and tests run against the
exact deployed code without polluting production.

---

## Authoring new tests

### Use a Page Object

Don't put CSS selectors in spec files — put them in
`fixtures/pages/SomePage.ts`. When the UI changes, the fix is in one place.

```ts
// Bad
await page.locator('div[style*="dc2626"]').textContent()

// Good
await loginPage.errorBox.textContent()
```

### Use the seeded users

For most tests, prefer the pre-authenticated states:

```ts
import { test, AUTH_STATES } from '../fixtures/test'

test.use({ storageState: AUTH_STATES.admin })

test('admin sees ...', async ({ adminPage }) => {
  await adminPage.goto()
  // already logged in
})
```

### Create ephemeral users for one-off tests

For tests that need a fresh account (e.g. signup happy path):

```ts
import { ephemeralEmail } from '../helpers/test-users'
import { getTestSupabaseAdmin } from '../helpers/supabase-admin'

const email = ephemeralEmail('myflow')
// ... use email ...
// cleanup runs automatically via globalTeardown
```

### Tag tests for selective runs

```ts
test.describe('My feature @smoke @auth', () => { /* ... */ })
```

Common tags: `@smoke`, `@auth`, `@listings`, `@admin`, `@stripe`, `@security`,
`@cross-browser`. Filter with `--grep @tag` or `--grep-invert @tag`.

---

## Debugging failures

### From a CI run

1. Click into the failed run in GitHub Actions
2. Download `playwright-report-chromium-<run-id>.zip` artifact
3. Unzip and open `index.html` in a browser
4. Click the failed test → "Trace" tab → step-by-step replay with DOM snapshots

### Locally

```bash
# UI mode is the easiest — visual test runner with time-travel debugging
npm run test:e2e:ui

# Or step through one test
npx playwright test specs/auth.spec.ts -g 'rejects bad password' --debug
```

### Common failure causes

| Symptom                                   | Likely cause                                                |
|-------------------------------------------|-------------------------------------------------------------|
| `Turnstile token did not produce`         | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` isn't set to test sitekey |
| `Login failed for seeded user`            | Test users not seeded yet — run `tests/e2e/setup/seed.ts`  |
| `REFUSING to run: points at production`   | Your env vars are pointing at prod by accident              |
| `Stripe webhook never fired`              | Webhook endpoint not configured in Stripe test mode         |
| Flaky `networkidle` timeouts              | Test branch might be paused — run a query to wake it       |

---

## Cost notes

The Supabase test branch costs ~$0.013/hr (~$10/month if always-on). It can be
paused via the Supabase dashboard between test runs to reduce cost — the branch
auto-resumes when the next test connection arrives, with a few seconds of
warmup.

Stripe test mode is always free.

GitHub Actions on private repos: 2,000 minutes/month free. The full suite runs
in ~5 minutes on Chromium, so weekly + per-push consumes ~30-60 min/month
depending on commit frequency.
