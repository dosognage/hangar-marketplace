#!/usr/bin/env node
/**
 * One-time setup: creates the HangarMarketplace host tier Stripe Products
 * and recurring monthly Prices. Idempotent — re-running is safe; if the
 * Products already exist (by name match) it reuses them and only adds
 * Prices that don't already exist.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-tier-products.mjs
 *
 * Output: prints the Price IDs to add to .env / .env.local /
 * Vercel env, then exits.
 *
 * Run this ONCE per environment (test mode locally, live mode in
 * production). Use sk_test_ for local development; switch to sk_live_
 * after you're ready to bill real money.
 */

import Stripe from 'stripe'

const TIERS = [
  {
    productName: 'HangarMarketplace Featured',
    description: 'Boosted search placement, 5 listings, 15 photos per listing, Featured badge.',
    priceCents:  9900,    // $99/month
    envVar:      'STRIPE_PRICE_FEATURED',
  },
  {
    productName: 'HangarMarketplace Pro',
    description: 'Unlimited listings + photos, top placement, analytics, team accounts, priority support.',
    priceCents:  29900,   // $299/month
    envVar:      'STRIPE_PRICE_PRO',
  },
]

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('Missing STRIPE_SECRET_KEY env var. Set it inline:')
  console.error('  STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-tier-products.mjs')
  process.exit(1)
}

const stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' })
const mode = key.startsWith('sk_live_') ? 'LIVE' : 'TEST'

console.log(`\nSetting up HM host tier products in ${mode} mode…\n`)

const results = []

for (const t of TIERS) {
  // 1. Find or create Product. Search by exact name match across active
  // products so re-running doesn't duplicate.
  let product
  const existing = await stripe.products.search({
    query: `active:'true' AND name:'${t.productName}'`,
  })
  if (existing.data.length > 0) {
    product = existing.data[0]
    console.log(`✓ Product exists: ${product.id} (${t.productName})`)
  } else {
    product = await stripe.products.create({
      name:        t.productName,
      description: t.description,
    })
    console.log(`+ Product created: ${product.id} (${t.productName})`)
  }

  // 2. Find or create the recurring monthly Price for that product.
  // We match by unit_amount + recurring interval since Stripe Prices
  // don't have a nice "name" field to search by.
  const prices = await stripe.prices.list({
    product: product.id,
    active:  true,
    limit:   100,
  })
  let price = prices.data.find(p =>
    p.unit_amount === t.priceCents &&
    p.currency === 'usd' &&
    p.recurring?.interval === 'month'
  )
  if (price) {
    console.log(`✓ Price exists:   ${price.id} ($${(t.priceCents / 100).toFixed(2)}/month)`)
  } else {
    price = await stripe.prices.create({
      product:     product.id,
      unit_amount: t.priceCents,
      currency:    'usd',
      recurring:   { interval: 'month' },
    })
    console.log(`+ Price created:  ${price.id} ($${(t.priceCents / 100).toFixed(2)}/month)`)
  }

  results.push({ envVar: t.envVar, priceId: price.id })
}

console.log('\n──────────────────────────────────────────────────────────────────')
console.log('Add these to your .env.local AND to Vercel env vars:')
console.log('──────────────────────────────────────────────────────────────────\n')
for (const r of results) {
  console.log(`${r.envVar}=${r.priceId}`)
}
console.log()
