/**
 * Server-side Supabase client
 *
 * This creates a Supabase client that stores the auth session in an
 * httpOnly cookie instead of localStorage. It works in Server Components,
 * Server Actions, and Route Handlers.
 *
 * Reading cookies works in Server Components.
 * Writing cookies only works in Server Actions / Route Handlers
 * (Next.js doesn't allow setting cookies during a Server Component render).
 * The try/catch in setItem / removeItem handles that gracefully.
 */

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// The cookie name Supabase uses is derived from the project URL
const PROJECT_REF = supabaseUrl.split('//')[1].split('.')[0]
export const SESSION_COOKIE = `sb-${PROJECT_REF}-auth-token`

export async function createServerClient() {
  const cookieStore = await cookies()

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: false,
      storage: {
        getItem: (_key: string) => {
          return cookieStore.get(SESSION_COOKIE)?.value ?? null
        },
        setItem: (_key: string, value: string) => {
          try {
            cookieStore.set(SESSION_COOKIE, value, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
              maxAge: 60 * 60 * 24 * 7, // 7 days
            })
          } catch {
            // Called from a Server Component – cookies can't be set here.
            // This is expected and harmless; the cookie is set during login
            // (a Server Action) where it works correctly.
          }
        },
        removeItem: (_key: string) => {
          try {
            cookieStore.delete(SESSION_COOKIE)
          } catch {
            // Same as above — safe to ignore in Server Components.
          }
        },
      },
    },
  })
}
