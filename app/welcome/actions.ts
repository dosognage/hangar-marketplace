'use server'

/**
 * Welcome tour server actions.
 *
 * markWelcomeSeen — stamps user_preferences.welcome_seen_at so we don't
 * keep redirecting the user back to the tour on subsequent dashboard
 * visits. Called when the user finishes the carousel or hits "Skip".
 */

import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function markWelcomeSeen(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  // Upsert because the row may not exist yet for brand-new users — this is
  // often the first thing they touch in user_preferences.
  const { error } = await supabaseAdmin
    .from('user_preferences')
    .upsert(
      { user_id: user.id, welcome_seen_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
