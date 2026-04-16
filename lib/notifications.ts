import { supabaseAdmin } from './supabase-admin'

export type NotificationType =
  | 'inquiry'
  | 'listing_approved'
  | 'listing_rejected'
  | 'broker_approved'
  | 'broker_request_alert'

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
}
