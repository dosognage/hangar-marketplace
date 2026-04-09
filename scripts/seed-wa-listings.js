/**
 * Seed Script: 20 Sample Hangar Listings — Greater Seattle / Washington State
 *
 * Run from your project root:
 *   node scripts/seed-wa-listings.js
 *
 * Requires: node 18+, .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *
 * What it does:
 *   1. Downloads real aviation/hangar photos from Unsplash
 *   2. Uploads them to your Supabase 'listing-photos' storage bucket
 *   3. Inserts 20 listings (status: approved, is_sample: true)
 *   4. Links photos to listings in listing_photos table
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'

// ── Load .env.local ──────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env.local')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Photo sources (Unsplash direct CDN — works from local machine) ───────────
// Each "look" is a set of 2-3 photos for one listing
const PHOTO_SETS = [
  // Set A: T-hangar exterior + interior
  [
    'https://images.unsplash.com/photo-1474302771451-23e2d51ef8b6?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1436891620584-47fd0e565afb?w=1200&q=80&auto=format&fit=crop',
  ],
  // Set B: Box hangar exterior + ramp view
  [
    'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=1200&q=80&auto=format&fit=crop',
  ],
  // Set C: Ramp/apron + hangar doors
  [
    'https://images.unsplash.com/photo-1583500782926-71a4b9bc14af?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1579829366248-204fe8413f31?w=1200&q=80&auto=format&fit=crop',
  ],
  // Set D: Aerial / wide shots
  [
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1474302771451-23e2d51ef8b6?w=1200&q=80&auto=format&fit=crop',
  ],
  // Set E: Interior / aircraft stored
  [
    'https://images.unsplash.com/photo-1436891620584-47fd0e565afb?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=80&auto=format&fit=crop',
  ],
  // Set F: Modern executive hangar
  [
    'https://images.unsplash.com/photo-1579829366248-204fe8413f31?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1583500782926-71a4b9bc14af?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=80&auto=format&fit=crop',
  ],
]

// ── Listing data ─────────────────────────────────────────────────────────────
const LISTINGS = [
  {
    title: 'T-Hangar Unit 12 at Boeing Field',
    airport_code: 'KBFI', airport_name: 'Boeing Field/King County International Airport',
    city: 'Seattle', state: 'WA', latitude: 47.5300, longitude: -122.3020,
    listing_type: 'lease', ownership_type: 'Private',
    monthly_lease: 485, asking_price: null,
    square_feet: 1100, door_width: 42, door_height: 11, hangar_depth: 38,
    description: 'Clean T-hangar unit on the south end of Boeing Field. Electric door, 110V outlets, and LED lighting throughout. Great location with direct ramp access. Available month to month with a 30-day notice. Fits most single-engine and light twin aircraft.',
    contact_name: 'Mark Hendricks', contact_email: 'mark.hendricks@example.com', contact_phone: '(206) 555-0142',
    photo_set: 0,
  },
  {
    title: '40x60 Box Hangar at Boeing Field',
    airport_code: 'KBFI', airport_name: 'Boeing Field/King County International Airport',
    city: 'Seattle', state: 'WA', latitude: 47.5305, longitude: -122.3025,
    listing_type: 'sale', ownership_type: 'Private',
    monthly_lease: null, asking_price: 295000,
    square_feet: 2400, door_width: 40, door_height: 12, hangar_depth: 60,
    description: 'Solid 40x60 box hangar on the north ramp at KBFI. Concrete floor with drain, full electrical panel, separate office/pilot lounge (14x12) with heat. 40-foot bi-fold door in good condition. This is fee-simple land ownership — no lease complications. Inspection welcome.',
    contact_name: 'Susan Park', contact_email: 'susan.park@example.com', contact_phone: '(206) 555-0189',
    photo_set: 1,
  },
  {
    title: 'T-Hangar at Renton Municipal',
    airport_code: 'KRNT', airport_name: 'Renton Municipal Airport',
    city: 'Renton', state: 'WA', latitude: 47.4930, longitude: -122.2160,
    listing_type: 'lease', ownership_type: 'Private',
    monthly_lease: 375, asking_price: null,
    square_feet: 950, door_width: 38, door_height: 10, hangar_depth: 35,
    description: 'Well-maintained T-hangar at Renton Municipal. Electric door opener included. Located near the terminal with easy fuel access. Month-to-month lease available. Great option if you want to keep your aircraft near Seattle without the higher costs at KSEA.',
    contact_name: 'Tom Reilly', contact_email: 'tom.reilly@example.com', contact_phone: '(425) 555-0103',
    photo_set: 0,
  },
  {
    title: 'Corporate Hangar at Renton Municipal',
    airport_code: 'KRNT', airport_name: 'Renton Municipal Airport',
    city: 'Renton', state: 'WA', latitude: 47.4935, longitude: -122.2155,
    listing_type: 'sale', ownership_type: 'LLC',
    monthly_lease: null, asking_price: 1150000,
    square_feet: 7500, door_width: 60, door_height: 18, hangar_depth: 80,
    description: 'Rare opportunity to acquire a large corporate hangar at Renton Municipal. Fully insulated with radiant floor heat. 60-foot hydraulic door. Includes a 600 sqft office suite with kitchenette, 3 restrooms, and a parts storage room. Currently leased to a local charter operator — call for income details. 400-amp electrical service.',
    contact_name: 'James Vance', contact_email: 'james.vance@example.com', contact_phone: '(425) 555-0217',
    photo_set: 5,
  },
  {
    title: 'Hangar Condo at Paine Field',
    airport_code: 'KPAE', airport_name: 'Paine Field',
    city: 'Everett', state: 'WA', latitude: 47.9060, longitude: -122.2820,
    listing_type: 'sale', ownership_type: 'Condo Association',
    monthly_lease: null, asking_price: 189000,
    square_feet: 1440, door_width: 42, door_height: 12, hangar_depth: 40,
    description: 'Hangar condo unit in a well-managed HOA at Paine Field. Monthly HOA covers water, landscaping, and common area maintenance. Unit has epoxy floor coating, LED lighting, and a Tesla wall charger rough-in. Paine Field has commercial service from Alaska Airlines — convenient if you travel for work.',
    contact_name: 'Linda Sato', contact_email: 'linda.sato@example.com', contact_phone: '(425) 555-0334',
    photo_set: 2,
  },
  {
    title: 'T-Hangar Lease at Paine Field',
    airport_code: 'KPAE', airport_name: 'Paine Field',
    city: 'Everett', state: 'WA', latitude: 47.9062, longitude: -122.2815,
    listing_type: 'lease', ownership_type: 'Private',
    monthly_lease: 415, asking_price: null,
    square_feet: 1000, door_width: 40, door_height: 11, hangar_depth: 38,
    description: 'T-hangar unit available at Paine Field. Close to the FBO with fueling right on the ramp. Electric bi-fold door, one 20-amp outlet. 12-month lease preferred. Airport ground lease is held by the owner — no ground rent passed through. Great location for Snohomish County pilots.',
    contact_name: 'Chris Olson', contact_email: 'chris.olson@example.com', contact_phone: '(425) 555-0471',
    photo_set: 0,
  },
  {
    title: 'Executive Hangar at Paine Field',
    airport_code: 'KPAE', airport_name: 'Paine Field',
    city: 'Everett', state: 'WA', latitude: 47.9058, longitude: -122.2825,
    listing_type: 'sale', ownership_type: 'LLC',
    monthly_lease: null, asking_price: 625000,
    square_feet: 5400, door_width: 60, door_height: 20, hangar_depth: 75,
    description: 'Impressive executive hangar on the east side of Paine Field. Meticulously maintained with polished concrete floors and custom LED shop lighting. Includes a fully finished office (300 sqft), pilot lounge with mini-split AC/heat, and exterior wash bay. Large hydraulic door rated for wide-body aircraft entry. The Boeing delivery center is a short drive — this is a premium address for any aviation business.',
    contact_name: 'Robert Hagen', contact_email: 'robert.hagen@example.com', contact_phone: '(425) 555-0582',
    photo_set: 5,
  },
  {
    title: 'T-Hangar at Arlington Municipal',
    airport_code: 'KAWO', airport_name: 'Arlington Municipal Airport',
    city: 'Arlington', state: 'WA', latitude: 48.1610, longitude: -122.1590,
    listing_type: 'lease', ownership_type: 'Private',
    monthly_lease: 310, asking_price: null,
    square_feet: 800, door_width: 36, door_height: 10, hangar_depth: 32,
    description: 'Affordable T-hangar at Arlington Municipal. One of the lowest hangar lease rates in Snohomish County. Electric door, one 20-amp circuit. Arlington has a great pilot community — monthly fly-ins and the annual Arlington Fly-In event. Perfect for a Cessna, Piper, or light sport aircraft.',
    contact_name: 'Dave Ferris', contact_email: 'dave.ferris@example.com', contact_phone: '(360) 555-0128',
    photo_set: 0,
  },
  {
    title: '40x40 Box Hangar at Arlington Municipal',
    airport_code: 'KAWO', airport_name: 'Arlington Municipal Airport',
    city: 'Arlington', state: 'WA', latitude: 48.1615, longitude: -122.1595,
    listing_type: 'sale', ownership_type: 'Private',
    monthly_lease: null, asking_price: 165000,
    square_feet: 1600, door_width: 40, door_height: 12, hangar_depth: 40,
    description: 'Solid 40x40 box hangar at Arlington. Concrete block construction with metal roof replaced in 2019. Hinged door in good shape. One man door on the side. Power panel with 100-amp service. No frills, but well built and priced to sell. Ground lease is month-to-month with the city.',
    contact_name: 'Karen Wu', contact_email: 'karen.wu@example.com', contact_phone: '(360) 555-0261',
    photo_set: 1,
  },
  {
    title: 'T-Hangar at Tacoma Narrows',
    airport_code: 'KTIW', airport_name: 'Tacoma Narrows Airport',
    city: 'Tacoma', state: 'WA', latitude: 47.2680, longitude: -122.5780,
    listing_type: 'lease', ownership_type: 'Private',
    monthly_lease: 345, asking_price: null,
    square_feet: 900, door_width: 38, door_height: 10, hangar_depth: 34,
    description: 'T-hangar at Tacoma Narrows with views of the Narrows Bridge from the ramp. Electric door, 110V power, overhead lighting. Tacoma Narrows is a well-run Pierce County airport with a good FBO and fuel. This unit has been used to store a Bonanza for the past 8 years — clean and dry throughout.',
    contact_name: 'Phil Danvers', contact_email: 'phil.danvers@example.com', contact_phone: '(253) 555-0394',
    photo_set: 2,
  },
  {
    title: '46x60 Hangar at Tacoma Narrows',
    airport_code: 'KTIW', airport_name: 'Tacoma Narrows Airport',
    city: 'Tacoma', state: 'WA', latitude: 47.2685, longitude: -122.5785,
    listing_type: 'sale', ownership_type: 'Private',
    monthly_lease: null, asking_price: 325000,
    square_feet: 3600, door_width: 46, door_height: 14, hangar_depth: 60,
    description: 'Mid-size box hangar at Tacoma Narrows in excellent condition. Insulated walls, 200-amp electrical service, and a finished shop area in the rear. 46-foot bi-fold door opens cleanly with no adjustment needed. Small office (10x12) with sink. This building sits on a long-term ground lease with Pierce County — ask for details.',
    contact_name: 'Nancy Kim', contact_email: 'nancy.kim@example.com', contact_phone: '(253) 555-0447',
    photo_set: 3,
  },
  {
    title: 'Partial Hangar Space at Olympia Regional',
    airport_code: 'KOLM', airport_name: 'Olympia Regional Airport',
    city: 'Olympia', state: 'WA', latitude: 46.9700, longitude: -122.9030,
    listing_type: 'space', ownership_type: 'Private',
    monthly_lease: 275, asking_price: null,
    square_feet: 800, door_width: null, door_height: null, hangar_depth: null,
    description: 'Sharing space in a large heated hangar at Olympia Regional. Dedicated section for one small single-engine aircraft. Access 24/7 with coded entry. Wi-Fi included. I use the other half for my Cirrus — looking for a clean, respectful co-tenant. No helicopters or ultralights.',
    contact_name: 'Greg Stern', contact_email: 'greg.stern@example.com', contact_phone: '(360) 555-0519',
    photo_set: 4,
  },
  {
    title: '50x60 Hangar at Olympia Regional',
    airport_code: 'KOLM', airport_name: 'Olympia Regional Airport',
    city: 'Olympia', state: 'WA', latitude: 46.9705, longitude: -122.9035,
    listing_type: 'sale', ownership_type: 'LLC',
    monthly_lease: null, asking_price: 215000,
    square_feet: 3000, door_width: 50, door_height: 14, hangar_depth: 60,
    description: 'Well-maintained 50x60 box hangar at Olympia Regional. New roof in 2021. Insulated, LED lighting, 200-amp service. Separate 12x14 office with heat. Overhead bi-fold door operates smoothly. Ground lease through the Port of Olympia — transferable. Olympia is growing fast and hangar availability here is getting tight.',
    contact_name: 'Amy Powell', contact_email: 'amy.powell@example.com', contact_phone: '(360) 555-0637',
    photo_set: 1,
  },
  {
    title: 'T-Hangar at Bremerton National',
    airport_code: 'KPWT', airport_name: 'Bremerton National Airport',
    city: 'Bremerton', state: 'WA', latitude: 47.4900, longitude: -122.7650,
    listing_type: 'lease', ownership_type: 'Private',
    monthly_lease: 290, asking_price: null,
    square_feet: 900, door_width: 38, door_height: 10, hangar_depth: 34,
    description: 'T-hangar at Bremerton National on the Kitsap Peninsula. Electric door, basic power, good lighting. This is a quiet airport with a friendly atmosphere and low traffic. Ferry or Narrows Bridge access from the Seattle side. One of the most affordable hangars in the greater Puget Sound area.',
    contact_name: 'Hank Torres', contact_email: 'hank.torres@example.com', contact_phone: '(360) 555-0712',
    photo_set: 0,
  },
  {
    title: 'Private Hangar at Harvey Field',
    airport_code: 'S43', airport_name: 'Harvey Field',
    city: 'Snohomish', state: 'WA', latitude: 47.9120, longitude: -122.1020,
    listing_type: 'lease', ownership_type: 'Private',
    monthly_lease: 250, asking_price: null,
    square_feet: 750, door_width: 36, door_height: 10, hangar_depth: 30,
    description: 'Small private hangar at Harvey Field in Snohomish. This is a turf runway airport with a great local community — fly-ins, warbirds, and ultralights are common. Manual door. Power included. Great for a lighter single or aerobatic aircraft. Snohomish is a short drive from Everett and Bothell.',
    contact_name: 'Bill Swanson', contact_email: 'bill.swanson@example.com', contact_phone: '(360) 555-0831',
    photo_set: 4,
  },
  {
    title: 'Box Hangar at Sanderson Field',
    airport_code: 'KSHN', airport_name: 'Sanderson Field',
    city: 'Shelton', state: 'WA', latitude: 47.2330, longitude: -123.1480,
    listing_type: 'sale', ownership_type: 'Private',
    monthly_lease: null, asking_price: 139000,
    square_feet: 1600, door_width: 40, door_height: 12, hangar_depth: 40,
    description: 'Concrete-block box hangar at Sanderson Field near Shelton. Well priced and in solid shape. Power panel updated in 2020. Bi-fold door works great. Small but functional — a good buy if you want to own your own hangar in Mason County without breaking the bank. Ground lease with the city is current and transferable.',
    contact_name: 'Pam Nichols', contact_email: 'pam.nichols@example.com', contact_phone: '(360) 555-0955',
    photo_set: 1,
  },
  {
    title: 'Hangar at Orcas Island Airport',
    airport_code: 'KORS', airport_name: 'Orcas Island Airport',
    city: 'Eastsound', state: 'WA', latitude: 48.7080, longitude: -122.9100,
    listing_type: 'lease', ownership_type: 'Private',
    monthly_lease: 545, asking_price: null,
    square_feet: 1200, door_width: 44, door_height: 12, hangar_depth: 42,
    description: 'Hangar at Orcas Island Airport — one of the most scenic airports in Washington. Electric door, 110V and 220V outlets. This hangar is a great base for island hopping in the San Juans. Whale watching, hiking, and kayaking all minutes from the airport. Year-round access via seaplane, ferry, or fly-in.',
    contact_name: 'Carol Mack', contact_email: 'carol.mack@example.com', contact_phone: '(360) 555-1024',
    photo_set: 3,
  },
  {
    title: 'Hangar for Sale at Friday Harbor Airport',
    airport_code: 'KFHR', airport_name: 'Friday Harbor Airport',
    city: 'Friday Harbor', state: 'WA', latitude: 48.5220, longitude: -123.0240,
    listing_type: 'sale', ownership_type: 'Private',
    monthly_lease: null, asking_price: 449000,
    square_feet: 2400, door_width: 48, door_height: 14, hangar_depth: 50,
    description: 'A rare chance to own a hangar on San Juan Island at Friday Harbor Airport. This well-built 48x50 hangar has a finished loft storage area, insulated walls, and radiant heat. The airport sits just above downtown Friday Harbor with views of the water. Island life is best experienced with your own aircraft — and your own hangar.',
    contact_name: 'Ron Eads', contact_email: 'ron.eads@example.com', contact_phone: '(360) 555-1138',
    photo_set: 5,
  },
  {
    title: 'Shared Space Available at Boeing Field',
    airport_code: 'KBFI', airport_name: 'Boeing Field/King County International Airport',
    city: 'Seattle', state: 'WA', latitude: 47.5298, longitude: -122.3018,
    listing_type: 'space', ownership_type: 'Private',
    monthly_lease: 245, asking_price: null,
    square_feet: 600, door_width: null, door_height: null, hangar_depth: null,
    description: 'Half of a large T-hangar available at Boeing Field. I have a Cessna 172 and there is room for one more small single-engine aircraft. Good lighting, 110V power, and electric door shared access. KBFI ramp access included. Looking for a clean airplane and a responsible co-tenant. Short-term OK.',
    contact_name: 'Eric Strand', contact_email: 'eric.strand@example.com', contact_phone: '(206) 555-1247',
    photo_set: 4,
  },
  {
    title: '60x80 Corporate Hangar at Paine Field',
    airport_code: 'KPAE', airport_name: 'Paine Field',
    city: 'Everett', state: 'WA', latitude: 47.9055, longitude: -122.2830,
    listing_type: 'sale', ownership_type: 'LLC',
    monthly_lease: null, asking_price: 2650000,
    square_feet: 16000, door_width: 80, door_height: 24, hangar_depth: 100,
    description: 'Landmark corporate hangar at Paine Field — one of the largest private hangars on the field. 60x80 main bay with a 20-foot clearance across the full width. Includes a 1,200 sqft executive suite (2 offices, conference room, pilot lounge, full kitchen, 2 restrooms), a separate maintenance shop with 400-amp service, and a wash bay with hot water. 80-foot Swiss-style door. Backup generator. Located adjacent to the FBO with a fuel agreement in place. This is a full aviation campus.',
    contact_name: 'Sandra Blake', contact_email: 'sandra.blake@example.com', contact_phone: '(425) 555-1362',
    photo_set: 5,
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
async function downloadPhoto(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      'Referer': 'https://unsplash.com/',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const buf = await res.arrayBuffer()
  return Buffer.from(buf)
}

async function uploadPhoto(listingId, photoIndex, url) {
  const path = `${listingId}/${Date.now()}-${photoIndex}.jpg`
  let data
  try {
    data = await downloadPhoto(url)
  } catch (e) {
    console.warn(`    ⚠ Photo download failed (${url}): ${e.message} — skipping`)
    return null
  }

  const { error } = await supabase.storage
    .from('listing-photos')
    .upload(path, data, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false })

  if (error) {
    console.warn(`    ⚠ Photo upload failed: ${error.message} — skipping`)
    return null
  }
  return path
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🛫  Seeding 20 Washington hangar listings into ${SUPABASE_URL}\n`)

  let inserted = 0
  let photoCount = 0

  for (let i = 0; i < LISTINGS.length; i++) {
    const l = LISTINGS[i]
    const listingId = randomUUID()
    console.log(`[${i + 1}/20] ${l.title} (${l.airport_code})`)

    // Insert the listing
    const { error: listingError } = await supabase.from('listings').insert({
      id:            listingId,
      title:         l.title,
      airport_code:  l.airport_code,
      airport_name:  l.airport_name,
      city:          l.city,
      state:         l.state,
      latitude:      l.latitude,
      longitude:     l.longitude,
      listing_type:  l.listing_type,
      ownership_type: l.ownership_type,
      asking_price:  l.asking_price,
      monthly_lease: l.monthly_lease,
      square_feet:   l.square_feet,
      door_width:    l.door_width,
      door_height:   l.door_height,
      hangar_depth:  l.hangar_depth,
      description:   l.description,
      contact_name:  l.contact_name,
      contact_email: l.contact_email,
      contact_phone: l.contact_phone,
      status:        'approved',
      is_sample:     true,
      is_featured:   false,
      is_sponsored:  false,
      view_count:    0,
    })

    if (listingError) {
      console.error(`  ✗ Failed to insert listing: ${listingError.message}`)
      continue
    }
    inserted++

    // Upload photos
    const photoUrls = PHOTO_SETS[l.photo_set]
    const photoRecords = []

    for (let p = 0; p < photoUrls.length; p++) {
      process.stdout.write(`    Uploading photo ${p + 1}/${photoUrls.length}... `)
      const path = await uploadPhoto(listingId, p, photoUrls[p])
      if (path) {
        photoRecords.push({ listing_id: listingId, storage_path: path, display_order: p })
        photoCount++
        process.stdout.write('✓\n')
      }
    }

    if (photoRecords.length > 0) {
      const { error: photoError } = await supabase.from('listing_photos').insert(photoRecords)
      if (photoError) console.warn(`    ⚠ Photo records insert failed: ${photoError.message}`)
    }
  }

  console.log(`\n✅  Done: ${inserted}/20 listings inserted, ${photoCount} photos uploaded.`)
  console.log(`\nAll listings are marked is_sample=true and status=approved.`)
  console.log(`Visit /admin to manage them.\n`)
}

main().catch(e => { console.error(e); process.exit(1) })
