/**
 * Programmatic auth for E2E setup.
 *
 * The `setup` Playwright project's job is to produce signed-in storage
 * states that downstream specs reuse via `test.use({ storageState })` —
 * NOT to exercise the login form. The real form has its own coverage in
 * auth.spec.ts. By going through the Supabase SDK directly here we
 * eliminate an entire class of CI flake:
 *
 *   - Cloudflare Turnstile iframe blocked by GH Actions network egress
 *   - React hydration / useEffect interactions with the form
 *   - Cold-Supabase 30+ second tails on the login Server Action redirect
 *
 * Self-healing: if a test user doesn't exist on the branch DB (which has
 * happened — README references a `tests/e2e/setup/seed.ts` that was never
 * committed), the helper creates them via the admin API. So a freshly-spun
 * branch is usable without any out-of-band seed step.
 */

import { createClient, type Session } from '@supabase/supabase-js'
import type { TestUser } from './test-users'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`[programmatic-auth] env var ${name} is not set`)
  return v
}

/**
 * Cookie name used by lib/supabase-server.ts to store the session,
 * derived from NEXT_PUBLIC_SUPABASE_URL the same way the runtime does
 * (sb-<projectRef>-auth-token). Mirroring the derivation in one place
 * means that switching test branches (or production migration) just
 * works without touching this helper.
 */
export function getSessionCookieName(): string {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const projectRef = url.split('//')[1]?.split('.')[0] ?? 'local'
  return `sb-${projectRef}-auth-token`
}

/**
 * Ensure `user` exists in the test branch's auth.users table, then sign
 * in and return the active session. The session value matches what the
 * production login Server Action would have produced via
 * supabase.auth.signInWithPassword, including JWT + refresh token.
 *
 * Idempotent: re-running against an already-seeded branch is a no-op
 * for the createUser step (Supabase returns "user already registered"
 * which we treat as success).
 */
export async function ensureUserAndGetSession(user: TestUser): Promise<Session> {
  const url            = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey        = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  // Admin client: bypasses RLS, can create-or-update auth.users rows.
  // Service-role keys are dangerous in production — fail loudly in
  // setup if the URL points at prod (already gated in auth.setup.ts,
  // but defence-in-depth here).
  if (url.includes('tokvsbyokppnyxbthysd')) {
    throw new Error('[programmatic-auth] REFUSING to mint a session against the production project ref tokvsbyokppnyxbthysd.')
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // 1) Create-or-no-op the user. email_confirm=true skips the verification
  //    email — we trust ourselves with our own test fixtures. The role is
  //    persisted in user_metadata so downstream code (RLS predicates,
  //    middleware) can branch on it without needing a separate profiles
  //    row lookup for the bare minimum cases.
  const { error: createErr } = await admin.auth.admin.createUser({
    email:         user.email,
    password:      user.password,
    email_confirm: true,
    user_metadata: { full_name: user.fullName, role: user.role },
  })
  if (createErr && !/already (registered|exists|been registered)/i.test(createErr.message)) {
    throw new Error(`[programmatic-auth] createUser failed for ${user.email}: ${createErr.message}`)
  }

  // 2) Sign in via the anon key — same auth surface a real browser uses,
  //    just without the form. Returns access_token + refresh_token wrapped
  //    in a Session object that's structurally identical to what supabase-js
  //    storage adapter persists.
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await anon.auth.signInWithPassword({
    email:    user.email,
    password: user.password,
  })
  if (error || !data.session) {
    throw new Error(
      `[programmatic-auth] signInWithPassword failed for ${user.email}: ` +
      `${error?.message ?? 'no session returned'}`,
    )
  }
  return data.session
}
