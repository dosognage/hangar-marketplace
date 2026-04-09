# Hangar Marketplace — SEO & Marketing Guide

A prioritized playbook for driving organic and referral traffic.

---

## Phase 1: Foundation (Done ✅)

These are already built into the codebase:

- **Dynamic meta titles + descriptions** on every listing page, home, requests
- **Open Graph + Twitter card tags** with listing photos as OG images
- **JSON-LD structured data** (Product + Article schema) on listings and blog posts
- **Sitemap.xml** at `/sitemap.xml` — all approved listings, state pages, airport pages, blog posts
- **Robots.txt** at `/robots.txt` — crawlable pages allowed, admin/API blocked
- **State landing pages** — `/hangars/[state]` for all 50 states (e.g., `/hangars/washington`)
- **Airport landing pages** — `/hangars/airport/[icao]` for every airport with a listing
- **Blog** at `/blog` — 3 starter articles targeting high-volume keywords

---

## Phase 2: Google Search Console & Analytics

### Google Search Console
1. Go to https://search.google.com/search-console
2. Add property: `https://hangarmarketplace.com`
3. Verify via DNS TXT record (add to your domain registrar)
4. Submit sitemap: `https://hangarmarketplace.com/sitemap.xml`
5. Monitor: Coverage errors, Core Web Vitals, top queries

### Google Analytics 4
1. Create a GA4 property at https://analytics.google.com
2. Add the measurement ID to `NEXT_PUBLIC_GA_ID` in Vercel environment variables
3. Add a simple `<Script>` in `app/layout.tsx` for the GA snippet

---

## Phase 3: Google Business Profile

Even though Hangar Marketplace is an online business, a Google Business Profile increases local search visibility and adds credibility.

1. Go to https://business.google.com
2. Create a profile for "Hangar Marketplace"
3. Category: **Online Marketplace** or **Real Estate Agency**
4. Add your phone number (920) 385-8284, website, and description
5. Add photos of hangars (you can use listing photos with permission)
6. Encourage users to leave reviews after successful transactions

---

## Phase 4: Aviation Directory Listings (High-Priority Backlinks)

These are authoritative aviation sites. Getting listed here provides both direct referral traffic AND SEO value through backlinks.

### Free Listings (Do These First)
| Directory | URL | Notes |
|-----------|-----|-------|
| AOPA Airport Directory | aopa.org | Submit as an airport resource |
| FAA Aeronautical Chart Users' Group | faa.gov | List as aviation service |
| AviationIN | aviationin.com | Free business listings |
| AirNav | airnav.com | Airport info — contact to add marketplace link |
| SkyVector | skyvector.com | Link in airport comments |
| FlightAware | flightaware.com | Community/forum links |
| Pilot Workshop | pilotworkshop.com | Blog/resource submission |

### Paid / Partnership Listings (Higher ROI)
| Partner | Type | Notes |
|---------|------|-------|
| AOPA Pilot Magazine | Paid ad | Reaches 300k+ GA pilots |
| EAA Sport Aviation | Paid ad | Reaches 200k+ EAA members |
| AVweb | Sponsored content | Strong Google authority, passionate readers |
| Flying Magazine | Display/content | Broad GA audience |
| General Aviation News | Press release | Free to submit news/announcements |

---

## Phase 5: Community & Forum Presence

These communities have millions of engaged aviation enthusiasts. Be helpful, not spammy.

### Forums to Participate In
| Forum | URL | Strategy |
|-------|-----|----------|
| Pilots of America | pilotsofamerica.com | Answer hangar questions, link when relevant |
| BeechTalk | beechtalk.com | Beechcraft owners often need hangars |
| CessnaOwner | cessnaowner.org | Same — Cessna owners |
| VAF (Van's Air Force) | vansairforce.net | RV builders need hangars |
| Reddit r/flying | reddit.com/r/flying | 290k members, great for content |
| Reddit r/aviation | reddit.com/r/aviation | 1.7M members |
| Facebook: Aviation Hangars | search Facebook | Multiple groups, 10k–50k members |
| Facebook: Airplanes for Sale | search Facebook | Often hangar listings too |

### Engagement Strategy
1. Search for "looking for hangar" or "hangar space" in each forum
2. Reply with genuinely helpful advice, then mention HangarMarketplace.com as a resource
3. Don't post promotional links without answering the question first
4. Share blog articles when they're directly relevant to a discussion

---

## Phase 6: Content Marketing (Ongoing)

### Blog Article Ideas (Ranked by Search Volume)
1. "How to Get Off a Hangar Waiting List" — very high intent
2. "Hangar Insurance: What You Need and What It Costs"
3. "Cost to Build a Private Hangar at Your Airport"
4. "Best States for Aircraft Hangar Availability in 2025"
5. "How to Negotiate a Hangar Lease"
6. "Hangar Space vs. Tiedown: The True Cost Comparison"
7. "[State] Airports with Hangar Availability" — one per high-traffic state
8. "What to Do When Your Hangar Is Condemned or Closed"
9. "Hangar Sharing Agreements: What to Include"
10. "Best Apps and Tools for Finding Hangar Space"

### Publishing Cadence
- 2 blog posts per month is enough to build meaningful search traffic over 6–12 months
- Each post should be 800–1,500 words minimum
- Target a specific keyword phrase in the title and first paragraph

---

## Phase 7: Email & Social

### Email Newsletter
The `/api/cron/newsletter` sends monthly emails to subscribers. To grow the list:
- Add a newsletter signup in blog post footers (currently only on homepage footer)
- Offer "new listing alerts by airport" as a signup incentive (already built as hangar request feature)
- Consider a monthly "Hangars Available This Month" digest email

### Social Media
Focus on **one** platform first rather than spreading thin:

- **Instagram**: Best for photos. Post hangar photos from listings (with owner permission). Tag the airport and state. Good for brand awareness.
- **LinkedIn**: Best for reaching FBO operators, airport managers, and corporate flight departments — potential listers.
- **X (Twitter)**: Aviation community is active. Share blog posts and respond to hangar discussions.

---

## Phase 8: PR & Press

### Press Release Targets
Write a press release for:
- Site launch (if not done)
- Hitting milestones: "100 listings," "500 hangars," "available in all 50 states"
- New features (sponsorship, aircraft fit calculator, broker profiles)

Send to:
- **General Aviation News** (gan.news) — free press release submission
- **AVweb** (avweb.com) — contact editor@avweb.com
- **Flying Magazine** — tip line
- **AOPA Pilot** — letters/news@aopa.org
- Local aviation publications and airport newsletters

---

## Quick Wins Checklist

- [ ] Submit sitemap to Google Search Console
- [ ] Create Google Business Profile
- [ ] List on AviationIN, AirNav, SkyVector
- [ ] Post in r/flying with link to the site
- [ ] Post in 3–5 Facebook aviation groups
- [ ] Write 1 state-specific blog article for your highest-traffic state
- [ ] Submit a press release to General Aviation News
- [ ] Add newsletter signup to blog posts
- [ ] Reach out to AOPA about a directory listing

---

## Tracking SEO Progress

Key metrics to watch monthly:
- Google Search Console: impressions, clicks, average position
- GA4: organic sessions, top landing pages, bounce rate
- Listings: how many new listings are submitted per week
- Requests: how many hangar requests are posted

A realistic timeline: meaningful organic traffic typically starts appearing 3–6 months after indexing for competitive keywords, and 1–3 months for specific airport/state pages.
