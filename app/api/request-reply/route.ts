import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'
import { htmlEscape } from '@/lib/email'
import { validatePhone } from '@/lib/validate'

const RESEND_API    = 'https://api.resend.com/emails'
const FROM_ADDRESS  = 'Hangar Marketplace <notify@hangarmarketplace.com>'
const TEST_TO       = process.env.RESEND_TEST_TO

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Email service not configured.' }, { status: 500 })
  }

  let body: {
    requestId: string
    name: string
    email: string
    phone?: string
    message: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { requestId, name, email, phone: rawPhone, message } = body

  if (!requestId || !name || !email || !message) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  // M13: validate phone if provided. Drop silently on invalid (optional field).
  const phone = rawPhone ? (validatePhone(rawPhone) ?? '') : ''

  // Fetch the original request so we know who to email
  const { data: hangarRequest, error: fetchError } = await supabase
    .from('hangar_requests')
    .select('contact_name, contact_email, airport_code, airport_name')
    .eq('id', requestId)
    .single()

  if (fetchError || !hangarRequest) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 })
  }

  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

  // SECURITY: HTML-escape every user-controlled field before interpolating
  // it into the email body. Both the owner's reply (name/email/phone/
  // message) AND the originating request's stored fields (contact_name,
  // airport_name, airport_code) are end-user controlled, so all of them
  // get escaped. URL contexts use percent-encoding instead.
  const safeOwnerName    = htmlEscape(name)
  const safeOwnerEmail   = htmlEscape(email)
  const safeOwnerPhone   = phone ? htmlEscape(phone) : ''
  const safeMessageHtml  = htmlEscape(message).replace(/\n/g, '<br>')
  const safeReqName      = htmlEscape(hangarRequest.contact_name ?? '')
  const safeAirportName  = htmlEscape(hangarRequest.airport_name ?? '')
  const safeAirportCode  = htmlEscape(hangarRequest.airport_code ?? '')
  const mailtoOwner      = encodeURI(`mailto:${email}`)
  const telOwner         = phone ? encodeURI(`tel:${phone}`) : ''

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
      <div style="background: #1a3a5c; padding: 20px 28px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Someone Has Space for You at ${safeAirportCode}!</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 28px;">
        <p style="margin: 0 0 20px; line-height: 1.6;">
          Hi <strong>${safeReqName}</strong>,<br/>
          A hangar owner at <strong>${safeAirportName} (${safeAirportCode})</strong>
          saw your space request and has something available.
        </p>

        <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Message from ${safeOwnerName}</p>
        <div style="background: #f9fafb; border-left: 3px solid #1a3a5c; padding: 14px 16px; border-radius: 0 6px 6px 0; margin-bottom: 24px;">
          <p style="margin: 0; line-height: 1.6;">${safeMessageHtml}</p>
        </div>

        <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Owner contact info</p>
        <table style="border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 12px 5px 0; color: #6b7280; font-size: 14px;">Name</td>
            <td style="padding: 5px 0; font-size: 14px;">${safeOwnerName}</td>
          </tr>
          <tr>
            <td style="padding: 5px 12px 5px 0; color: #6b7280; font-size: 14px;">Email</td>
            <td style="padding: 5px 0; font-size: 14px;"><a href="${mailtoOwner}" style="color:#6366f1;">${safeOwnerEmail}</a></td>
          </tr>
          ${phone ? `
          <tr>
            <td style="padding: 5px 12px 5px 0; color: #6b7280; font-size: 14px;">Phone</td>
            <td style="padding: 5px 0; font-size: 14px;"><a href="${telOwner}" style="color:#6366f1;">${safeOwnerPhone}</a></td>
          </tr>` : ''}
        </table>

        <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <a href="${mailtoOwner}?subject=Re: Hangar at ${encodeURIComponent(hangarRequest.airport_code ?? '')}"
            style="display:inline-block; background:#111827; color:white; padding:10px 20px;
                   border-radius:6px; text-decoration:none; font-weight:600; font-size:14px;">
            Reply to ${safeOwnerName}
          </a>
        </div>

        <p style="margin-top: 24px; color: #9ca3af; font-size: 12px;">
          Sent via <a href="${siteUrl}" style="color:#9ca3af;">Hangar Marketplace</a>.
          Your request is still live at <a href="${siteUrl}/requests" style="color:#9ca3af;">hangarmarketplace.com/requests</a>.
        </p>
      </div>
    </div>
  `

  const recipient = TEST_TO ?? hangarRequest.contact_email
  const devNote = TEST_TO
    ? `<p style="background:#fef9c3;padding:8px 12px;border-radius:4px;font-size:12px;margin-bottom:16px;">
         <strong>DEV MODE:</strong> Originally to ${hangarRequest.contact_email}, redirected to ${TEST_TO}.
       </p>`
    : ''

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [recipient],
      subject: TEST_TO
        ? `[DEV] Hangar owner replied to your request at ${hangarRequest.airport_code}`
        : `A hangar owner replied to your request at ${hangarRequest.airport_code}`,
      html: devNote + html,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: err.message ?? 'Email failed' }, { status: 500 })
  }

  // Log the reply (non-fatal)
  try {
    await supabase.from('hangar_request_replies').insert([{
      request_id:   requestId,
      owner_name:   name,
      owner_email:  email,
      owner_phone:  phone ?? null,
      message,
    }])
  } catch {
    // table may not exist yet — non-fatal
  }

  return NextResponse.json({ success: true })
}
