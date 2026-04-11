import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/conversations — list all conversations for the current user
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Always fetch conversations where user is the buyer
  // Plus broker-side conversations if they have a broker profile
  const brokerProfileIds = await getBrokerProfileIds(user.id)

  let orFilter = `buyer_id.eq.${user.id}`
  if (brokerProfileIds.length > 0) {
    orFilter += `,broker_profile_id.in.(${brokerProfileIds.join(',')})`
  }

  // Fetch conversations where user is buyer OR broker
  const { data: convos, error } = await supabaseAdmin
    .from('conversations')
    .select(`
      id, last_message_at, listing_id, created_at,
      buyer:buyer_id ( id, raw_user_meta_data ),
      broker_profile:broker_profile_id ( id, full_name, avatar_url, user_id )
    `)
    .or(orFilter)
    .order('last_message_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach latest message and unread count to each conversation
  const enriched = await Promise.all((convos ?? []).map(async (c) => {
    const { data: latest } = await supabaseAdmin
      .from('messages')
      .select('body, sender_id, created_at, read')
      .eq('conversation_id', c.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { count: unread } = await supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', c.id)
      .eq('read', false)
      .neq('sender_id', user.id)

    return { ...c, latest_message: latest, unread_count: unread ?? 0 }
  }))

  return NextResponse.json({ conversations: enriched })
}

// POST /api/conversations — create or retrieve a conversation
export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { broker_profile_id, listing_id, message } = await req.json()
  if (!broker_profile_id || !message?.trim()) {
    return NextResponse.json({ error: 'broker_profile_id and message are required' }, { status: 400 })
  }

  // Prevent brokers from messaging themselves
  const { data: brokerProfile } = await supabaseAdmin
    .from('broker_profiles')
    .select('user_id')
    .eq('id', broker_profile_id)
    .maybeSingle()

  if (brokerProfile?.user_id === user.id) {
    return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
  }

  // Upsert conversation (one per buyer-broker pair)
  const { data: convo, error: convoErr } = await supabaseAdmin
    .from('conversations')
    .upsert(
      { buyer_id: user.id, broker_profile_id, listing_id: listing_id ?? null },
      { onConflict: 'buyer_id,broker_profile_id', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (convoErr) return NextResponse.json({ error: convoErr.message }, { status: 500 })

  // Insert the first message
  const { data: msg, error: msgErr } = await supabaseAdmin
    .from('messages')
    .insert({ conversation_id: convo.id, sender_id: user.id, body: message.trim() })
    .select('id, body, sender_id, created_at, read')
    .single()

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

  // Update last_message_at
  await supabaseAdmin
    .from('conversations')
    .update({ last_message_at: msg.created_at })
    .eq('id', convo.id)

  return NextResponse.json({ conversation_id: convo.id, message: msg })
}

async function getBrokerProfileIds(userId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('broker_profiles')
    .select('id')
    .eq('user_id', userId)
  return (data ?? []).map(r => r.id)
}
