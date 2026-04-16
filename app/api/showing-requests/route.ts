import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'

export async function POST(req: Request) {
  const body = await req.json()
  const {
    broker_profile_id, listing_id, requester_name, requester_email,
    requester_phone, preferred_date, preferred_time, message,
  } = body

  if (!broker_profile_id || !requester_name || !requester_email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Save to DB
  const { error: insertError } = await supabaseAdmin
    .from('showing_requests')
    .insert({
      broker_profile_id, listing_id: listing_id ?? null,
      requester_name, requester_email,
      requester_phone: requester_phone ?? null,
      preferred_date: preferred_date ?? null,
      preferred_time: preferred_time ?? null,
      message: message ?? null,
    })

  if (insertError) {
    console.error('[showing-requests] insert:', insertError.message)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Get broker contact info + user_id for notification
  const { data: broker } = await supabaseAdmin
    .from('broker_profiles')
    .select('full_name, contact_email, phone, user_id')
    .eq('id', broker_profile_id)
    .single()

  // Create in-app notification for the broker
  if (broker?.user_id) {
    await supabaseAdmin.from('notifications').insert({
      user_id: broker.user_id,
      type: 'showing_request',
      title: 'New showing request',
      body: `${requester_name} wants to schedule a showing${listing_id ? ' of your listing' : ''}.`,
      link: '/broker/dashboard',
    }).catch(err => console.error('[showing-requests] notification insert:', err))
  }

  const brokerEmail = broker?.contact_email
  if (brokerEmail) {
    const dateStr = preferred_date
      ? new Date(preferred_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      : 'Flexible'

    await sendEmail({
      to: brokerEmail,
      subject: `Showing request from ${requester_name} — Hangar Marketplace`,
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#1a3a5c;padding:24px 40px;">
          <p style="margin:0;color:white;font-size:20px;font-weight:700;">✈ Hangar Marketplace</p>
          <p style="margin:3px 0 0;color:#93c5fd;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Aviation Properties</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <h1 style="margin:0 0 8px;font-size:20px;color:#111827;">New showing request</h1>
          <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Someone wants to schedule a showing with you on Hangar Marketplace.</p>

          <table style="width:100%;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
            <tr style="background:#f9fafb;"><td style="padding:10px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Contact</td><td style="padding:10px 16px;font-size:14px;color:#111827;">${requester_name}</td></tr>
            <tr><td style="padding:10px 16px;font-size:12px;font-weight:700;color:#6b7280;border-top:1px solid #f3f4f6;text-transform:uppercase;letter-spacing:0.05em;">Email</td><td style="padding:10px 16px;font-size:14px;border-top:1px solid #f3f4f6;"><a href="mailto:${requester_email}" style="color:#2563eb;">${requester_email}</a></td></tr>
            ${requester_phone ? `<tr style="background:#f9fafb;"><td style="padding:10px 16px;font-size:12px;font-weight:700;color:#6b7280;border-top:1px solid #f3f4f6;text-transform:uppercase;letter-spacing:0.05em;">Phone</td><td style="padding:10px 16px;font-size:14px;border-top:1px solid #f3f4f6;"><a href="tel:${requester_phone}" style="color:#2563eb;">${requester_phone}</a></td></tr>` : ''}
            <tr ${requester_phone ? '' : 'style="background:#f9fafb;"'}><td style="padding:10px 16px;font-size:12px;font-weight:700;color:#6b7280;border-top:1px solid #f3f4f6;text-transform:uppercase;letter-spacing:0.05em;">Preferred date</td><td style="padding:10px 16px;font-size:14px;border-top:1px solid #f3f4f6;color:#111827;">${dateStr}</td></tr>
            ${preferred_time ? `<tr style="background:#f9fafb;"><td style="padding:10px 16px;font-size:12px;font-weight:700;color:#6b7280;border-top:1px solid #f3f4f6;text-transform:uppercase;letter-spacing:0.05em;">Preferred time</td><td style="padding:10px 16px;font-size:14px;border-top:1px solid #f3f4f6;color:#111827;">${preferred_time}</td></tr>` : ''}
            ${message ? `<tr><td style="padding:10px 16px;font-size:12px;font-weight:700;color:#6b7280;border-top:1px solid #f3f4f6;text-transform:uppercase;letter-spacing:0.05em;">Message</td><td style="padding:10px 16px;font-size:14px;border-top:1px solid #f3f4f6;color:#374151;">${message}</td></tr>` : ''}
          </table>

          <a href="mailto:${requester_email}" style="display:inline-block;padding:11px 26px;background:#1a3a5c;color:white;text-decoration:none;border-radius:7px;font-size:14px;font-weight:600;">
            Reply to ${requester_name}
          </a>
        </td></tr>
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            <a href="https://hangarmarketplace.com" style="color:#9ca3af;">hangarmarketplace.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })
  }

  return NextResponse.json({ success: true })
}
