/**
 * GET /newsletter/sample
 *
 * Public sample of the monthly market intelligence newsletter. Renders the
 * exact same HTML that subscribers receive so prospective brokers can see
 * the actual product before opting in.
 *
 * No subscriber list reveal, no auth required. The unsubscribe link in the
 * sample is a noop so anyone clicking on it from this preview won't break.
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { newsletterEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
// 5 minute edge cache — the listings inside the digest don't change often.
export const revalidate = 300

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

  // Same query as the cron / admin preview — keep these in sync.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { data: rawListings } = await supabaseAdmin
    .from('listings')
    .select('id, title, airport_name, airport_code, listing_type, asking_price, monthly_lease, view_count, is_sponsored')
    .eq('status', 'approved')
    .eq('is_sample', false)
    .gte('created_at', thirtyDaysAgo)
    .order('is_sponsored', { ascending: false })
    .order('view_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(6)

  const recentListings = (rawListings ?? []).map(l => ({
    id:           l.id,
    title:        l.title,
    airport_name: l.airport_name,
    airport_code: l.airport_code,
    listing_type: l.listing_type,
    price:        l.listing_type === 'lease' ? l.monthly_lease : l.asking_price,
  }))

  const now   = new Date()
  const month = now.toLocaleString('en-US', { month: 'long' })
  const year  = now.getFullYear()

  // Sample-specific unsubscribe URL — clicks land on a benign explainer.
  const unsubUrl = `${siteUrl}/about#newsletter`
  const { html } = newsletterEmail({ unsubUrl, recentListings, month, year })

  // Wrap with a thin "this is a sample" banner so visitors know what they
  // are looking at and have a path back to setup.
  const banner = `
    <div style="position:sticky;top:0;z-index:50;padding:0.75rem 1.25rem;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:white;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:0.85rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
      <span><strong>Sample newsletter.</strong> This is exactly what subscribers received this month.</span>
      <a href="${siteUrl}/broker/setup/preferences" style="color:white;text-decoration:underline;font-weight:600;">Subscribe (free for verified brokers) →</a>
    </div>
  `

  // Inject the banner right after <body> if present, otherwise prepend it.
  const wrapped = html.includes('<body')
    ? html.replace(/<body([^>]*)>/, `<body$1>${banner}`)
    : banner + html

  return new NextResponse(wrapped, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
