import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createNotification } from '@/lib/notifications'
import { htmlEscape } from '@/lib/email'

const RESEND_API = 'https://api.resend.com/emails'

// Use Resend's shared "from" address for testing.
// Once you verify your own domain in Resend, change this to:
// "Hangar Marketplace <noreply@yourdomain.com>"
const FROM_ADDRESS = 'Hangar Marketplace <notify@hangarmarketplace.com>'

// IMPORTANT: Without a verified domain, Resend only allows sending to
// your own Resend account email address. Set RESEND_TEST_TO in .env.local
// to your Resend account email and all emails will be redirected there
// during development. Remove this variable once you have a verified domain.
const TEST_TO = process.env.RESEND_TEST_TO

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Email service not configured. Add RESEND_API_KEY to .env.local.' },
      { status: 500 }
    )
  }

  let body: {
    buyerName: string
    buyerEmail: string
    buyerPhone?: string
    message: string
    listingId: string
    listingTitle: string
    sellerName: string
    sellerEmail: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { buyerName, buyerEmail, buyerPhone, message, listingTitle, sellerName, sellerEmail, listingId } = body

  if (!buyerName || !buyerEmail || !message || !sellerEmail) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const listingUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/listing/${listingId}`

  // SECURITY: HTML-escape every user-controlled field before interpolating
  // it into the email body. Without this, a buyer can fill in
  //   buyerName: <script>alert(1)</script>
  //   message:   <a href="https://evil.com/phishing">Click for $1000</a>
  // and the email rendered in the seller's inbox shows that markup verbatim
  // in clients that render HTML (Outlook, Gmail web in some configs). Worse,
  // an unescaped `"` in buyerEmail can break out of the `mailto:` href and
  // inject arbitrary anchor attributes.
  //
  // Note: the message body's newlines-to-<br> happens AFTER escape, since
  // \n is not affected by HTML escaping.
  const safeBuyerName    = htmlEscape(buyerName)
  const safeBuyerEmail   = htmlEscape(buyerEmail)
  const safeBuyerPhone   = buyerPhone ? htmlEscape(buyerPhone) : ''
  const safeListingTitle = htmlEscape(listingTitle)
  const safeSellerName   = htmlEscape(sellerName)
  const safeMessageHtml  = htmlEscape(message).replace(/\n/g, '<br>')
  // For URL contexts (mailto:, tel:, href) use percent-encoding rather than
  // HTML escape — different escape rules entirely.
  const mailtoBuyer      = encodeURI(`mailto:${buyerEmail}`)
  const telBuyer         = buyerPhone ? encodeURI(`tel:${buyerPhone}`) : ''

  // ── Email 1: Notify the seller ─────────────────────────────────────────
  const sellerHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
      <div style="background: #111827; padding: 20px 28px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">New Inquiry on Your Listing</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 28px;">
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">LISTING</p>
        <p style="margin: 0 0 24px; font-weight: 600; font-size: 16px;">
          <a href="${listingUrl}" style="color: #6366f1; text-decoration: none;">${safeListingTitle}</a>
        </p>

        <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">MESSAGE FROM BUYER</p>
        <div style="background: #f9fafb; border-left: 3px solid #6366f1; padding: 14px 16px; border-radius: 0 6px 6px 0; margin-bottom: 24px;">
          <p style="margin: 0; line-height: 1.6;">${safeMessageHtml}</p>
        </div>

        <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">BUYER CONTACT INFO</p>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 80px;">Name</td>
            <td style="padding: 6px 0; font-size: 14px;">${safeBuyerName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Email</td>
            <td style="padding: 6px 0; font-size: 14px;">
              <a href="${mailtoBuyer}" style="color: #6366f1;">${safeBuyerEmail}</a>
            </td>
          </tr>
          ${buyerPhone ? `
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Phone</td>
            <td style="padding: 6px 0; font-size: 14px;">
              <a href="${telBuyer}" style="color: #6366f1;">${safeBuyerPhone}</a>
            </td>
          </tr>` : ''}
        </table>

        <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <a href="${mailtoBuyer}?subject=Re: ${encodeURIComponent(listingTitle)}"
            style="display: inline-block; background: #111827; color: white; padding: 10px 20px;
                    border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Reply to ${safeBuyerName}
          </a>
        </div>

        <p style="margin-top: 24px; color: #9ca3af; font-size: 12px;">
          This message was sent via <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}" style="color: #9ca3af;">Hangar Marketplace</a>.
        </p>
      </div>
    </div>
  `

  // ── Email 2: Confirm to the buyer ──────────────────────────────────────
  const buyerHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
      <div style="background: #111827; padding: 20px 28px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Message Sent!</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 28px;">
        <p style="margin: 0 0 16px;">Hi ${safeBuyerName},</p>
        <p style="margin: 0 0 16px; line-height: 1.6;">
          Your message has been sent to <strong>${safeSellerName}</strong> about their listing:
        </p>
        <p style="margin: 0 0 24px;">
          <a href="${listingUrl}" style="color: #6366f1; font-weight: 600; text-decoration: none;">${safeListingTitle}</a>
        </p>

        <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">YOUR MESSAGE</p>
        <div style="background: #f9fafb; border-left: 3px solid #e5e7eb; padding: 14px 16px; border-radius: 0 6px 6px 0; margin-bottom: 24px;">
          <p style="margin: 0; line-height: 1.6; color: #374151;">${safeMessageHtml}</p>
        </div>

        <p style="margin: 0; line-height: 1.6; color: #6b7280; font-size: 14px;">
          The seller will reply directly to your email address (${safeBuyerEmail}).
          Keep an eye on your inbox, and check your spam folder if you don't hear back within a day or two.
        </p>

        <p style="margin-top: 24px; color: #9ca3af; font-size: 12px;">
          Sent via <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}" style="color: #9ca3af;">Hangar Marketplace</a>.
        </p>
      </div>
    </div>
  `

  // ── Send both emails ───────────────────────────────────────────────────
  // If RESEND_TEST_TO is set, redirect all emails there (dev mode without
  // a verified domain — Resend only allows sending to your own account email).
  const send = (to: string, subject: string, html: string) => {
    const recipient = TEST_TO ?? to
    const devNote = TEST_TO
      ? `<p style="background:#fef9c3;padding:8px 12px;border-radius:4px;font-size:12px;margin-bottom:16px;">
           <strong>DEV MODE:</strong> This email was originally addressed to <strong>${to}</strong>
           but redirected to <strong>${TEST_TO}</strong> because RESEND_TEST_TO is set.
         </p>`
      : ''
    return fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [recipient],
        subject: TEST_TO ? `[DEV] ${subject}` : subject,
        html: devNote + html,
      }),
    })
  }

  const [sellerRes, buyerRes] = await Promise.all([
    send(sellerEmail, `New inquiry about: ${listingTitle}`, sellerHtml),
    send(buyerEmail, `Your message was sent: ${listingTitle}`, buyerHtml),
  ])

  if (!sellerRes.ok) {
    const err = await sellerRes.json().catch(() => ({}))
    console.error('Resend error (seller):', JSON.stringify(err))
    const msg = err?.message ?? err?.name ?? JSON.stringify(err)
    return NextResponse.json(
      { error: `Email failed: ${msg}` },
      { status: 500 }
    )
  }

  // Buyer confirmation failure is non-fatal — log but don't block
  if (!buyerRes.ok) {
    const err = await buyerRes.json().catch(() => ({}))
    console.warn('Buyer confirmation email failed (non-fatal):', JSON.stringify(err))
  }

  // ── Log inquiry to database (non-fatal if table doesn't exist yet) ─────
  try {
    await supabase.from('inquiries').insert([{
      listing_id:   listingId,
      buyer_name:   buyerName,
      buyer_email:  buyerEmail,
      buyer_phone:  buyerPhone ?? null,
      message,
    }])
  } catch {
    console.warn('Inquiry logging skipped — run the SQL migration to enable it.')
  }

  // ── In-app notification to listing owner ────────────────────────────────
  try {
    const { data: listingRow } = await supabaseAdmin
      .from('listings')
      .select('user_id')
      .eq('id', listingId)
      .maybeSingle()

    if (listingRow?.user_id) {
      await createNotification({
        userId: listingRow.user_id,
        type:   'inquiry',
        title:  `New inquiry on "${listingTitle}"`,
        body:   `${buyerName}: ${message.slice(0, 80)}${message.length > 80 ? '…' : ''}`,
        link:   `/dashboard`,
      })
    }
  } catch {
    // non-fatal
  }

  return NextResponse.json({ success: true })
}
