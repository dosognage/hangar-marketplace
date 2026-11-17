/**
 * Push notifications to the Hangar Marketplace iOS app.
 *
 * Tokens live in push_tokens (written by the app at sign-in). The table is
 * shared with HangarNight, so every send here targets app =
 * 'hangarmarketplace' only. Expo's push API needs no key for this project.
 *
 * Best effort by design: a push failure is logged and never throws, so a
 * caller's real work (saving a message, a showing request) is never undone
 * by a notification problem.
 */

import { supabaseAdmin } from './supabase-admin'

export type PushCategory = 'messages' | 'listings' | 'account'

/** user_preferences column that can switch a category off; account pushes always send. */
const PREF_COLUMN: Record<PushCategory, string | null> = {
  messages: 'notify_messages',
  listings: 'notify_new_listings',
  account:  null,
}

export interface PushPayload {
  title: string
  body:  string
  /**
   * Read by the app's tap router (lib/push-notifications.ts):
   *   { type: 'message', conversationId }
   *   { type: 'listing', listingId }
   *   { type: 'showing' }
   *   { type: 'search', query }
   *   { type: 'link', link }   website path, mapped to an app screen
   */
  data?: Record<string, unknown>
}

interface ExpoTicket {
  status:   'ok' | 'error'
  message?: string
  details?: { error?: string }
}

export async function pushToUser(
  userId: string,
  category: PushCategory,
  payload: PushPayload,
): Promise<number> {
  try {
    const prefCol = PREF_COLUMN[category]
    if (prefCol) {
      const { data: pref } = await supabaseAdmin
        .from('user_preferences')
        .select(prefCol)
        .eq('user_id', userId)
        .maybeSingle()
      if (pref && (pref as unknown as Record<string, boolean | null>)[prefCol] === false) return 0
    }

    const { data: tokens } = await supabaseAdmin
      .from('push_tokens')
      .select('expo_push_token')
      .eq('user_id', userId)
      .eq('app', 'hangarmarketplace')
      .eq('is_active', true)
    if (!tokens?.length) return 0

    const messages = tokens.map(t => ({
      to:        t.expo_push_token as string,
      sound:     'default',
      title:     payload.title,
      body:      payload.body.length > 180 ? payload.body.slice(0, 177) + '...' : payload.body,
      data:      payload.data ?? {},
      channelId: 'default',
    }))

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method:  'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body:    JSON.stringify(messages),
      signal:  AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      console.warn('[push] Expo returned', res.status, await res.text().catch(() => ''))
      return 0
    }
    const json = await res.json() as { data?: ExpoTicket[] }
    const tickets = Array.isArray(json.data) ? json.data : []

    let sent = 0
    const stale: string[] = []
    tickets.forEach((t, i) => {
      if (t.status === 'ok') sent++
      else if (t.details?.error === 'DeviceNotRegistered') stale.push(messages[i].to)
      else console.warn('[push] ticket error:', t.message)
    })
    if (stale.length) {
      await supabaseAdmin.from('push_tokens').update({ is_active: false }).in('expo_push_token', stale)
    }
    return sent
  } catch (e) {
    console.warn('[push] send failed:', e)
    return 0
  }
}

/** Display name for a message sender: broker profile name, then account name, then email prefix. */
export async function senderDisplayName(userId: string): Promise<string> {
  const { data: bp } = await supabaseAdmin
    .from('broker_profiles').select('full_name').eq('user_id', userId).maybeSingle()
  if (bp?.full_name) return bp.full_name as string
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId)
  const meta = data?.user?.user_metadata as { full_name?: string } | undefined
  return meta?.full_name?.trim() || data?.user?.email?.split('@')[0] || 'Someone'
}
