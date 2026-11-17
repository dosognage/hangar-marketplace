/**
 * POST /api/auth/login — email + password sign-in for the website.
 *
 * Body: the login form as multipart/form-data (email, password, next,
 * cf-turnstile-response). Sets the session cookie and answers
 * { redirectTo } on success, or { error } with 400/401. The login page
 * then does a full page load of redirectTo. See lib/password-login.ts
 * for why this is a Route Handler and not a Server Action.
 */

import { NextResponse } from 'next/server'
import { passwordLogin } from '@/lib/password-login'

export async function POST(req: Request) {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  try {
    const result = await passwordLogin(form)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ redirectTo: result.redirectTo })
  } catch (err) {
    console.error('[login] sign-in failed:', err)
    return NextResponse.json(
      { error: 'Something went wrong signing in. Please try again.' },
      { status: 500 },
    )
  }
}
