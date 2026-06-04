/**
 * Pre-spec authentication setup — programmatic.
 *
 * Runs once (as the Playwright `setup` project, before everything else)
 * to mint a Supabase session per role and bake the corresponding
 * `sb-<ref>-auth-token` cookie into a storageState file. Downstream specs
 * `test.use({ storageState: AUTH_STATES.<role> })` and start signed-in.
 *
 * We deliberately do NOT drive the login form here. The form path is
 * brittle on GH Actions runners (Turnstile iframe blocked by network
 * egress, cold-Supabase 30+ second redirect tails, React hydration race
 * against the bypass-token injection). The login UI is exercised
 * end-to-end by auth.spec.ts; setup's job is just to produce a cookie
 * jar, and the SDK does that an order of magnitude faster and more
 * reliably than puppeteering through the rendered page.
 *
 * Self-healing: if a test user is missing from the branch DB the
 * helper creates them on the fly (see helpers/programmatic-auth.ts).
 * This shields us from the historical foot-gun where adding a new role
 * required a manual seed step that wasn't actually documented anywhere.
 */

import { test as setup } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { ADMIN, BROKER, USER, type TestUser } from '../helpers/test-users'
import {
  ensureUserAndGetSession,
  getSessionCookieName,
} from '../helpers/programmatic-auth'

const AUTH_DIR = path.resolve(__dirname, '..', '.auth')

// Programmatic setup is fast (<2s/role on a warm DB). Keep a generous
// timeout anyway in case Supabase cold-starts on a fresh branch — the
// admin createUser round-trip can stretch on first call after deploy.
setup.setTimeout(30_000)

setup.beforeAll(() => {
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true })

  // Fail fast if the env vars the helper needs are missing or pointing
  // at production — cheaper than 3 confusing setup failures.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error(
      '[auth.setup] NEXT_PUBLIC_SUPABASE_URL is not set. Configure ' +
      'TEST_SUPABASE_URL in GitHub Actions repo secrets pointing at the ' +
      'e2e-test branch (project ref pukcxxgafgrieetkgogy).',
    )
  }
  if (url.includes('tokvsbyokppnyxbthysd')) {
    throw new Error(
      '[auth.setup] REFUSING to run: NEXT_PUBLIC_SUPABASE_URL points at ' +
      'production. Tests must use the e2e-test branch.',
    )
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      '[auth.setup] SUPABASE_SERVICE_ROLE_KEY is not set. Configure ' +
      'TEST_SUPABASE_SERVICE_ROLE_KEY in GitHub Actions repo secrets.',
    )
  }
})

async function authenticateAndSave(
  context: import('@playwright/test').BrowserContext,
  user: TestUser,
  file: string,
): Promise<void> {
  // 1) Mint a Supabase session (creates the user if missing).
  const session = await ensureUserAndGetSession(user)

  // 2) Bake the session into the browser context as the cookie our
  //    server-side Supabase client reads. Format mirrors what
  //    lib/supabase-server.ts writes during a real login: the cookie
  //    VALUE is the JSON-serialized session, and the cookie attrs
  //    (httpOnly, sameSite=Lax, path=/, 7-day maxAge) match the runtime.
  const baseUrl  = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
  const hostname = new URL(baseUrl).hostname
  const secure   = baseUrl.startsWith('https://')

  await context.addCookies([{
    name:     getSessionCookieName(),
    value:    JSON.stringify(session),
    domain:   hostname,
    path:     '/',
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    // 7 days, matching lib/supabase-server.ts.
    expires:  Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  }])

  // 3) Persist for downstream specs.
  await context.storageState({ path: file })
}

setup('authenticate as admin', async ({ context }) => {
  await authenticateAndSave(context, ADMIN, path.join(AUTH_DIR, 'admin.json'))
})

setup('authenticate as broker', async ({ context }) => {
  await authenticateAndSave(context, BROKER, path.join(AUTH_DIR, 'broker.json'))
})

setup('authenticate as regular user', async ({ context }) => {
  await authenticateAndSave(context, USER, path.join(AUTH_DIR, 'user.json'))
})
