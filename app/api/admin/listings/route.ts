import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const RESEND_API_KEY = process.env.RESEND_API_KEY!
const TEST_TO        = process.env.RESEND_TEST_TO   // dev override
const SITE_URL       = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Fetch the listing so we can email the seller
    const { data: listing } = await supabaseAdmin
      .from('listings')
      .select('id, title, contact_name, contact_email')
      .eq('id', id)
      .single()

    // Update the status
    const { error } = await supabaseAdmin
      .from('listings')
      .update({ status })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 })
    }

    // Send email to seller if we have their details
    if (listing && RESEND_API_KEY) {
      const sellerEmail = TEST_TO ?? listing.contact_email
      const isApproved  = status === 'approved'
      const listingUrl  = `${SITE_URL}/listing/${listing.id}`

      const subject = isApproved
        ? `Your listing "${listing.title}" is now live!`
        : `Update on your listing "${listing.title}"`

      const html = isApproved
        ? `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#166534">🎉 Your listing is live!</h2>
            <p>Hi ${listing.contact_name},</p>
            <p>Great news — your hangar listing <strong>${listing.title}</strong> has been approved and is now live on Hangar Marketplace.</p>
            <p style="margin:1.5rem 0">
              <a href="${listingUrl}"
                style="background:#111827;color:white;padding:0.65rem 1.25rem;border-radius:6px;text-decoration:none;font-weight:600">
                View your listing →
              </a>
            </p>
            <p style="color:#6b7280;font-size:0.875rem">If you need to make any changes, log in to your dashboard and click Edit.</p>
          </div>
        `
        : `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#991b1b">Listing Not Approved</h2>
            <p>Hi ${listing.contact_name},</p>
            <p>Unfortunately your hangar listing <strong>${listing.title}</strong> was not approved at this time.</p>
            <p>If you have questions or would like to resubmit with changes, please reply to this email or contact us directly.</p>
            <p style="color:#6b7280;font-size:0.875rem">You can log in to your dashboard to edit and resubmit your listing.</p>
          </div>
        `

      // Dev banner when using test override
      const devBanner = TEST_TO
        ? `<div style="background:#fef3c7;border:1px solid #f59e0b;padding:8px 12px;margin-bottom:16px;font-size:12px;border-radius:4px">
            <strong>DEV MODE:</strong> Originally sent to ${listing.contact_email}
           </div>`
        : ''

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Hangar Marketplace <onboarding@resend.dev>',
          to:   [sellerEmail],
          subject,
          html: devBanner + html,
        }),
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
