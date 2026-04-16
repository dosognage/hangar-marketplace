/**
 * GET /listing/[id]/print
 * Returns a standalone HTML page — no Next.js layout wrapper.
 * Brokers open this, Cmd+P, and hand the PDF to a client.
 */
import { supabase } from '@/lib/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SITE_URL     = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

type Params = { params: Promise<{ id: string }> }

function photoUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/listing-photos/${path}`
}

function row(label: string, value: string | number | null | undefined): string {
  if (value == null || value === '') return ''
  return `
    <tr>
      <td class="label">${label}</td>
      <td class="value">${value}</td>
    </tr>`
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params

  const { data: listing } = await supabase
    .from('listings')
    .select('*, listing_photos(storage_path, display_order)')
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (!listing) {
    return new Response('<h1>Listing not found</h1>', {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const photos = [...(listing.listing_photos ?? [])].sort(
    (a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order
  )
  const cover = photos[0]?.storage_path

  const price = listing.asking_price
    ? `$${Number(listing.asking_price).toLocaleString()}`
    : listing.monthly_lease
      ? `$${Number(listing.monthly_lease).toLocaleString()}/month`
      : 'Contact for price'

  const listingUrl = `${SITE_URL}/listing/${id}`
  const typeLabel  = listing.listing_type === 'sale'  ? 'For Sale'
                   : listing.listing_type === 'space' ? 'Space Available'
                   : 'For Lease'

  const extraPhotos = photos.slice(1, 4)
    .map((p: { storage_path: string }) =>
      `<img src="${photoUrl(p.storage_path)}" alt="" class="extra-photo" />`)
    .join('')

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${listing.title} — Hangar Marketplace</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      background: white;
      color: #111827;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    .no-print { margin-bottom: 1.5rem; display: flex; gap: 0.75rem; }
    .btn-print {
      padding: 0.5rem 1.25rem; background: #1a3a5c; color: white;
      border: none; border-radius: 6px; font-weight: 600;
      cursor: pointer; font-size: 14px;
    }
    .btn-back {
      padding: 0.5rem 1.25rem; border: 1px solid #d1d5db;
      border-radius: 6px; font-size: 14px; color: #374151;
      text-decoration: none; display: inline-block;
    }
    .header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 1.5rem; padding-bottom: 1rem;
      border-bottom: 2px solid #1a3a5c;
    }
    .eyebrow { font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
    h1 { font-size: 22px; font-weight: 800; line-height: 1.2; margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: #6b7280; }
    .price { font-size: 22px; font-weight: 800; color: #1a3a5c; text-align: right; }
    .type  { font-size: 11px; color: #9ca3af; text-align: right; margin-top: 2px; }
    .cover { width: 100%; max-height: 320px; object-fit: cover; display: block; border-radius: 8px; margin-bottom: 1rem; }
    .extra-photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-bottom: 1.5rem; }
    .extra-photo  { width: 100%; height: 140px; object-fit: cover; border-radius: 6px; display: block; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
    .section-label { font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
    td { padding: 6px 12px; font-size: 13px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    td.label { font-weight: 600; color: #374151; width: 130px; }
    td.value { color: #111827; }
    .description { margin-bottom: 1.5rem; }
    .description p { font-size: 13px; color: #374151; line-height: 1.7; white-space: pre-wrap; }
    .footer { padding-top: 1rem; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
    .footer-left  { font-size: 11px; color: #9ca3af; }
    .footer-right { font-size: 11px; color: #2563eb; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
      @page { margin: 0.75in; }
    }
  </style>
</head>
<body>

  <div class="no-print">
    <button class="btn-print" onclick="window.print()">🖨 Print / Save as PDF</button>
    <a class="btn-back" href="/listing/${id}">← Back to listing</a>
  </div>

  <div class="header">
    <div>
      <p class="eyebrow">✈ Hangar Marketplace · Aviation Properties</p>
      <h1>${listing.title}</h1>
      <p class="subtitle">${listing.airport_name} (${listing.airport_code}) · ${listing.city}, ${listing.state}</p>
    </div>
    <div>
      <p class="price">${price}</p>
      <p class="type">${typeLabel}</p>
    </div>
  </div>

  ${cover ? `<img src="${photoUrl(cover)}" alt="${listing.title}" class="cover" />` : ''}

  ${extraPhotos ? `<div class="extra-photos">${extraPhotos}</div>` : ''}

  <div class="grid">
    <div>
      <p class="section-label">Hangar Details</p>
      <table><tbody>
        ${row('Square Footage', listing.square_feet ? `${Number(listing.square_feet).toLocaleString()} sq ft` : null)}
        ${row('Door Width',     listing.door_width  ? `${listing.door_width} ft`  : null)}
        ${row('Door Height',    listing.door_height ? `${listing.door_height} ft` : null)}
        ${row('Hangar Depth',   listing.hangar_depth ? `${listing.hangar_depth} ft` : null)}
        ${row('Runway Length',  listing.runway_length_ft ? `${Number(listing.runway_length_ft).toLocaleString()} ft` : null)}
        ${row('Runway Surface', listing.runway_surface)}
        ${row('Ownership',      listing.ownership_type)}
      </tbody></table>
    </div>
    <div>
      <p class="section-label">Contact</p>
      <table><tbody>
        ${row('Name',  listing.contact_name)}
        ${row('Email', listing.contact_email)}
        ${row('Phone', listing.contact_phone)}
      </tbody></table>
      <p class="section-label" style="margin-top:1rem">Location</p>
      <table><tbody>
        ${row('Airport',    `${listing.airport_name} (${listing.airport_code})`)}
        ${row('City/State', `${listing.city}, ${listing.state}`)}
        ${row('Address',    listing.address)}
      </tbody></table>
    </div>
  </div>

  ${listing.description ? `
  <div class="description">
    <p class="section-label">Description</p>
    <p>${listing.description}</p>
  </div>` : ''}

  <div class="footer">
    <span class="footer-left">Listed on Hangar Marketplace · ${today}</span>
    <span class="footer-right">${listingUrl}</span>
  </div>

</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
