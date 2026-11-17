import { supabaseAdmin } from './supabase-admin'
import { pushToUser, type PushCategory } from './push'

export type NotificationType =
  | 'inquiry'
  | 'listing_approved'
  | 'listing_rejected'
  | 'broker_approved'
  | 'broker_request_alert'
  | 'broker_application'   // admin-facing: a new broker has applied for verification
  | 'listing_submitted'    // admin-facing: a listing is waiting for review, or a broker listing went live

export async function createNotification({
  userId,
  type,
  title,
  body,
  link,
}: {
  userId: string
  type: NotificationType
  title: string
  body?: string
  link?: string
}): Promise<void> {
  const { error } = await supabaseAdmin.from('notifications').insert([{
    user_id: userId,
    type,
    title,
    body:    body ?? null,
    link:    link ?? null,
  }])
  if (error) console.error('[notifications] insert failed:', error.message)

  // Mirror the bell to the phone. 'inquiry' doubles as the "new listing
  // near your airport" alert (link /listing/<id>), which belongs under the
  // listings switch rather than messages.
  const category: PushCategory =
    type === 'broker_request_alert' ? 'listings' :
    type === 'inquiry' && link?.startsWith('/listing/') ? 'listings' :
    type === 'inquiry' ? 'messages' :
    'account'
  await pushToUser(userId, category, {
    title,
    body: body ?? '',
    data: { type: 'link', link: link ?? null },
  })
}
