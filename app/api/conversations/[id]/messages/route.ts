import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/conversations/[id]/messages
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify user is a participant
  const { data: convo } = await supabaseAdmin
    .from('conversations')
    .select('id, buyer_id, broker_profile:broker_profile_id ( user_id )')
    .eq('id', id)
    .maybeSingle()

  if (!convo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const brokerUserId = (convo.broker_profile as unknown as { user_id: string } | null)?.user_id
  if (convo.buyer_id !== user.id && brokerUserId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: messages, error } = await supabaseAdmin
    .from('messages')
    .select('id, body, sender_id, read, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark messages from the other party as read — but only if this user
  // has read receipts enabled (default true; explicitly false means opt-out).
  const readReceiptsEnabled = user.user_metadata?.read_receipts_enabled !== false
  if (readReceiptsEnabled) {
    await supabaseAdmin
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', id)
      .eq('read', false)
      .neq('sender_id', user.id)
  }

  return NextResponse.json({ messages: messages ?? [] })
}

// POST /api/conversations/[id]/messages
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { body } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Message body required' }, { status: 400 })

  // Verify participant
  const { data: convo } = await supabaseAdmin
    .from('conversations')
    .select('id, buyer_id, broker_profile:broker_profile_id ( user_id )')
    .eq('id', id)
    .maybeSingle()

  if (!convo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const brokerUserId = (convo.broker_profile as unknown as { user_id: string } | null)?.user_id
  if (convo.buyer_id !== user.id && brokerUserId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: msg, error } = await supabaseAdmin
    .from('messages')
    .insert({ conversation_id: id, sender_id: user.id, body: body.trim() })
    .select('id, body, sender_id, read, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update last_message_at on the conversation
  await supabaseAdmin
    .from('conversations')
    .update({ last_message_at: msg.created_at })
    .eq('id', id)

  return NextResponse.json({ message: msg })
}
