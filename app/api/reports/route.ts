import { NextRequest, NextResponse, after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { adminEmailList } from '@/lib/auth-admin'
import { sendEmail, htmlEscape } from '@/lib/email'

/**
 * POST /api/reports
 * Headers: Authorization: Bearer <the reporter's Supabase access token>
 * Body:    { target_type, target_id?, category, subject?, body, url? }
 *
 * The Hangar Marketplace app files reports here (App Store guideline 1.2:
 * users must be able to report content and the developer must respond).
 * Stores the row in user_reports, then emails every ADMIN_EMAILS address
 * so a report is seen the same day instead of sitting in a table nobody
 * reads.
 *
 * Limited to 10 reports per account per day so the endpoint cannot be
 * used to flood the admin inbox.
 */

const TARGET_TYPES = new Set(['listing', 'user', 'conversation', 'broker', 'other'])
const CATEGORIES = new Set(['safety', 'fraud', 'harassment', 'listing_inaccuracy', 'bug', 'other'])
const CATEGORY_LABEL: Record<string, string> = {
  safety: 'Safety concern', fraud: 'Scam or fraud', harassment: 'Harassment or abuse',
  listing_inaccuracy: 'Listing is inaccurate', bug: 'Something is broken', other: 'Something else',
}
const DAILY_LIMIT = 10
const SITE = 'https://hangarmarketplace.com'

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return NextResponse.json({ error: 'Sign in to submit a report.' }, { status: 401 })
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Sign in to submit a report.' }, { status: 401 })

  const b = await req.json().catch(() => null) as Record<string, unknown> | null
  const targetType = typeof b?.target_type === 'string' ? b.target_type : ''
  const category   = typeof b?.category === 'string' ? b.category : ''
  const body       = typeof b?.body === 'string' ? b.body.trim().slice(0, 4000) : ''
  const targetId   = typeof b?.target_id === 'string' ? b.target_id.slice(0, 100) : null
  const subject    = typeof b?.subject === 'string' ? b.subject.trim().slice(0, 200) || null : null
  const url        = typeof b?.url === 'string' ? b.url.slice(0, 500) : null

  if (!TARGET_TYPES.has(targetType) || !CATEGORIES.has(category)) {
    return NextResponse.json({ error: 'Pick what the report is about.' }, { status: 400 })
  }
  if (body.length < 5) {
    return NextResponse.json({ error: 'Please add a bit more detail.' }, { status: 400 })
  }

  const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString()
  const { count } = await supabaseAdmin
    .from('user_reports')
    .select('id', { count: 'exact', head: true })
    .eq('reporter_user_id', user.id)
    .gte('created_at', since)
  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: 'You have sent a lot of reports today. Email hello@hangarmarketplace.com if this is urgent.' },
      { status: 429 },
    )
  }

  const { data: row, error } = await supabaseAdmin
    .from('user_reports')
    .insert({
      reporter_user_id: user.id,
      reporter_email:   user.email ?? null,
      target_type:      targetType,
      target_id:        targetId,
      category,
      subject,
      body,
      url,
    })
    .select('id')
    .single()
  if (error) {
    console.error('[reports] insert failed:', error.message)
    return NextResponse.json({ error: 'Could not save the report. Try again.' }, { status: 500 })
  }

  after(async () => {
    const link =
      targetType === 'listing' && targetId ? `${SITE}/listing/${targetId}` :
      targetType === 'broker'  && targetId ? `${SITE}/broker/${targetId}` :
      url
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;color:#111827">
      <h2 style="margin:0 0 12px">New report: ${htmlEscape(CATEGORY_LABEL[category] ?? category)}</h2>
      <p style="margin:0 0 4px"><strong>About:</strong> ${htmlEscape(targetType)}${targetId ? ` ${htmlEscape(targetId)}` : ''}</p>
      ${link ? `<p style="margin:0 0 4px"><a href="${htmlEscape(link)}">${htmlEscape(link)}</a></p>` : ''}
      <p style="margin:0 0 4px"><strong>From:</strong> ${htmlEscape(user.email ?? user.id)}</p>
      ${subject ? `<p style="margin:0 0 4px"><strong>Subject:</strong> ${htmlEscape(subject)}</p>` : ''}
      <p style="margin:12px 0;padding:12px;background:#f3f4f6;border-radius:8px;white-space:pre-wrap">${htmlEscape(body)}</p>
      <p style="margin:0;color:#6b7280;font-size:12px">Report ${row.id}. Apple expects reports to be acted on within 24 hours.</p>
    </div>`
    await Promise.all(adminEmailList().map(to =>
      sendEmail({ to, subject: `Report: ${CATEGORY_LABEL[category] ?? category}`, html })
        .catch(e => console.error('[reports] admin email failed:', e)),
    ))
  })

  return NextResponse.json({ ok: true, id: row.id })
}
