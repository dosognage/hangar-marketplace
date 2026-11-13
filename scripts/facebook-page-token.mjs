#!/usr/bin/env node
/**
 * One-time setup for the Facebook Page autopost.
 *
 *   node scripts/facebook-page-token.mjs
 *
 * Asks for the Meta app's ID and secret and a short-lived user token from
 * the Graph API Explorer, trades them for a Page token that never expires,
 * checks it can post, and saves FACEBOOK_PAGE_ID and
 * FACEBOOK_PAGE_ACCESS_TOKEN to the Vercel production environment.
 *
 * Secrets are typed with echo off and are never printed.
 */

import { createInterface } from 'node:readline'
import { Writable } from 'node:stream'
import { spawnSync } from 'node:child_process'

const GRAPH   = 'https://graph.facebook.com/v26.0'
const TEAM    = 'team_4PeT4vaPp7z18Nu7lQrQDKbU'
const PROJECT = 'hangar-marketplace-kpuo'
const NEEDED  = ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list']

function ask(question, { hidden = false } = {}) {
  return new Promise(resolve => {
    let muted = false
    const output = new Writable({
      write(chunk, enc, cb) { if (!muted) process.stdout.write(chunk, enc); cb() },
    })
    const rl = createInterface({ input: process.stdin, output, terminal: true })
    rl.question(question, answer => {
      rl.close()
      if (hidden) process.stdout.write('  (hidden)\n')
      resolve(answer.trim())
    })
    muted = hidden
  })
}

async function graph(path, params) {
  const url = `${GRAPH}${path}?${new URLSearchParams(params)}`
  const res = await fetch(url)
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `HTTP ${res.status} from ${path}`)
  }
  return json
}

function fail(msg) {
  console.error(`\nStopped: ${msg}`)
  process.exit(1)
}

console.log('Facebook Page autopost setup for Hangar Marketplace\n')

const appId      = await ask('Meta App ID: ')
const appSecret  = await ask('Meta App Secret: ', { hidden: true })
const shortToken = await ask('User access token from Graph API Explorer: ', { hidden: true })
if (!appId || !appSecret || !shortToken) fail('all three values are required.')

// 1. Short-lived user token -> 60-day user token.
let longUserToken
try {
  const r = await graph('/oauth/access_token', {
    grant_type:        'fb_exchange_token',
    client_id:         appId,
    client_secret:     appSecret,
    fb_exchange_token: shortToken,
  })
  longUserToken = r.access_token
} catch (e) {
  fail(`could not extend the user token (${e.message}). Generate a fresh token in the Graph API Explorer and run this again.`)
}

// 2. A Page token fetched with a long-lived user token does not expire.
let pages
try {
  const r = await graph('/me/accounts', { fields: 'id,name,access_token', access_token: longUserToken, limit: '100' })
  pages = r.data ?? []
} catch (e) {
  fail(`could not list your Pages (${e.message}).`)
}
if (pages.length === 0) fail('the token sees no Pages. When generating it, make sure you ticked the Hangar Marketplace Page.')

let page = pages.find(p => /hangar\s*marketplace/i.test(p.name))
if (!page) {
  console.log('\nPages this token can manage:')
  pages.forEach((p, i) => console.log(`  ${i + 1}. ${p.name}`))
  const pick = Number(await ask('Which number is the Hangar Marketplace Page? '))
  page = pages[pick - 1]
  if (!page) fail('no Page selected.')
}

// 3. Check the Page token: permissions and expiry.
let info
try {
  const r = await graph('/debug_token', { input_token: page.access_token, access_token: `${appId}|${appSecret}` })
  info = r.data ?? {}
} catch (e) {
  fail(`could not inspect the Page token (${e.message}).`)
}
const missing = NEEDED.filter(s => !(info.scopes ?? []).includes(s))
if (missing.length) fail(`the token is missing ${missing.join(', ')}. Add them in the Graph API Explorer, regenerate, and run this again.`)

console.log(`\nPage:        ${page.name}`)
console.log(`Page ID:     ${page.id}`)
console.log(`Token valid: ${info.is_valid ? 'yes' : 'no'}`)
console.log(`Expires:     ${info.expires_at === 0 ? 'never' : new Date(info.expires_at * 1000).toISOString()}`)
if (!info.is_valid) fail('Facebook says the Page token is not valid.')

const go = (await ask('\nSave FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN to Vercel production? (y/n) ')).toLowerCase()
if (go !== 'y' && go !== 'yes') {
  console.log('Nothing saved.')
  process.exit(0)
}

// 4. Hand the values to the Vercel CLI on stdin so they never hit argv or the screen.
for (const [name, value, sensitive] of [
  ['FACEBOOK_PAGE_ID', page.id, false],
  ['FACEBOOK_PAGE_ACCESS_TOKEN', page.access_token, true],
]) {
  const args = ['--yes', 'vercel@latest', 'env', 'add', name, '--environment', 'production',
    '--scope', TEAM, '--project', PROJECT, '--force', '--yes', sensitive ? '--sensitive' : '--no-sensitive']
  const r = spawnSync('npx', args, { input: value, stdio: ['pipe', 'inherit', 'inherit'] })
  if (r.status !== 0) fail(`vercel env add ${name} failed. Nothing about the token was printed; run the script again after fixing the Vercel login.`)
}

console.log('\nSaved. The autopost goes live with the next production deploy (git push).')
