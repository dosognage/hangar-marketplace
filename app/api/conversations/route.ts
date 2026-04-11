import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ─── Types ────────────────────────────────────────────────────────────────────

type BrokerProfile = {
  id: string
  full_name: string
  avatar_url: string | null
  user_id: string
}

type RawConvo = {
  id: string
  last_message_at: string
  listing_id: string | null
  created_at: string
  buyer_id: string
  broker_profile_id: string
  // PostgREST always returns joined relations as an array even for many-to-one fks
  broker_profile: BrokerProfile[]
}

// ─── GET /api/conversations ───────────────────────────────────────────────────
// Returns all conversations for the current user (as buyer or broker).
// Uses Auth Admin API for buyer names — never joins auth.users via PostgREST
// (that join fails because PostgREST only exposes the public schema).

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get this user's broker profile IDs (0 for plain users, ≥1 for brokers)
  const brokerProfileIds = await getBrokerProfileIds(user.id)

  // Build OR filter: conversations where user is buyer OR broker
  let orFilter = `buyer_id.eq.${user.id}`
  if (brokerProfileIds.length > 0) {
    orFilter += `,broker_profile_id.in.(${brokerProfileIds.join(',')})`
  }

  // Fetch conversations + broker profile info (public schema — safe to join)
  const { data: convos, error } = await supabaseAdmin
    .from('conversations')
    .select(`
      id, last_message_at, listing_id, created_at, buyer_id, broker_profile_id,
      broker_profile:broker_profile_id ( id, full_name, avatar_url, user_id )
    `)
    .or(orFilter)
    .order('last_message_at', { ascending: false })

  if (error) {
    console.error('[GET /api/conversations]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!convos || convos.length === 0) {
    return NextResponse.json({ conversations: [] })
  }

  // Resolve buyer display names via Auth Admin API
  // (PostgREST cannot join auth.users — use the management API instead)
  const buyerIds = [...new Set(convos.map(c => c.buyer_id).filter(Boolean))]
  const buyerNameMap: Record<string, string> = {}
  await Promise.all(buyerIds.map(async (uid) => {
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserById(uid)
      if (data?.user) {
        buyerNameMap[uid] =
          (data.user.user_metadata?.full_name as string | undefined) ??
          (data.user.user_metadata?.name as string | undefined) ??
          data.user.email?.split('@')[0] ??
          'User'
      }
    } catch {
      // Non-fatal — falls back to 'User'
    }
  }))

  // Enrich each conversation: latest message + unread count (run in parallel)
  const enriched = await Promise.all((convos as RawConvo[]).map(async (c) => {
    const [latestRes, unreadRes] = await Promise.all([
      supabaseAdmin
        .from('messages')
        .select('id, body, sender_id, created_at, read')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', c.id)
        .eq('read', false)
        .neq('sender_id', user.id),
    ])

    const isUserBuyer = c.buyer_id === user.id
    const bp = c.broker_profile[0] ?? null

    return {
      id: c.id,
      last_message_at: c.last_message_at,
      listing_id: c.listing_id,
      buyer_id: c.buyer_id,
      broker_profile_id: c.broker_profile_id,
      // Normalised "other party" info so the UI doesn't need per-role logic
      other_party: isUserBuyer
        ? {
            name: bp?.full_name ?? 'Broker',
            role: 'broker' as const,
            avatar_url: bp?.avatar_url ?? null,
            broker_profile_id: bp?.id ?? null,
            user_id: bp?.user_id ?? null,
          }
        : {
            name: buyerNameMap[c.buyer_id] ?? 'User',
            role: 'buyer' as const,
            avatar_url: null,
            broker_profile_id: null,
            user_id: c.buyer_id,
          },
      latest_message: latestRes.data ?? null,
      unread_count: unreadRes.count ?? 0,
    }
  }))

  return NextResponse.json({ conversations: enriched })
}

// ─── POST /api/conversations ──────────────────────────────────────────────────
// Create or retrieve an existing conversation between the current user and a broker.

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { broker_profile_id, listing_id, message } = body as {
    broker_profile_id: string
    listing_id?: string | null
    message: string
  }

  if (!broker_profile_id || !message?.trim()) {
    return NextResponse.json(
      { error: 'broker_profile_id and message are required' },
      { status: 400 }
    )
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

  // Upsert conversation (idempotent — one conversation per buyer-broker pair)
  const { data: convo, error: convoErr } = await supabaseAdmin
    .from('conversations')
    .upsert(
      { buyer_id: user.id, broker_profile_id, listing_id: listing_id ?? null },
      { onConflict: 'buyer_id,broker_profile_id', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (convoErr) {
    console.error('[POST /api/conversations] upsert:', convoErr.message)
    return NextResponse.json({ error: convoErr.message }, { status: 500 })
  }

  // Insert the opening message
  const { data: msg, error: msgErr } = await supabaseAdmin
    .from('messages')
    .insert({ conversation_id: convo.id, sender_id: user.id, body: message.trim() })
    .select('id, body, sender_id, created_at, read')
    .single()

  if (msgErr) {
    console.error('[POST /api/conversations] insert message:', msgErr.message)
    return NextResponse.json({ error: msgErr.message }, { status: 500 })
  }

  // Keep last_message_at current
  await supabaseAdmin
    .from('conversations')
    .update({ last_message_at: msg.created_at })
    .eq('id', convo.id)

  return NextResponse.json({ conversation_id: convo.id, message: msg })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getBrokerProfileIds(userId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('broker_profiles')
    .select('id')
    .eq('user_id', userId)
  return (data ?? []).map(r => r.id)
}
