'use server'

import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail, modernLayout } from '@/lib/email'
import { revalidatePath } from 'next/cache'

export type AircraftSpec = {
  id:             string
  manufacturer:   string
  model:          string
  common_name:    string
  category:       string
  wingspan_ft:    number
  length_ft:      number
  height_ft:      number
  mtow_lbs:       number | null
  is_taildragger: boolean
}

/**
 * Returns every aircraft for picker UIs. ~190 rows; fine to ship the whole
 * list to the client and filter in JS rather than calling the server on
 * every keystroke.
 */
export async function listAircraft(): Promise<AircraftSpec[]> {
  const { data, error } = await supabaseAdmin
    .from('aircraft_specs')
    .select('id, manufacturer, model, common_name, category, wingspan_ft, length_ft, height_ft, mtow_lbs, is_taildragger')
    .order('manufacturer')
    .order('common_name')

  if (error) {
    console.error('[aircraft] list failed:', error.message)
    return []
  }
  return (data ?? []) as AircraftSpec[]
}

/**
 * Returns the current user's saved default aircraft, if any. Custom-entered
 * aircraft (user typed their own dimensions because their plane isn't in our
 * dataset) take precedence over a picked dataset entry — there's only one
 * "active" aircraft slot, and the most recent edit wins.
 */
export async function getDefaultAircraft(): Promise<AircraftSpec | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: prefs } = await supabaseAdmin
    .from('user_preferences')
    .select('default_aircraft_id, custom_aircraft_name, custom_aircraft_wingspan_ft, custom_aircraft_length_ft, custom_aircraft_height_ft')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!prefs) return null

  // Custom aircraft takes precedence. Synthesize an AircraftSpec-shaped object
  // so the rest of the app (pill, fit filter) doesn't have to branch.
  if (prefs.custom_aircraft_name && prefs.custom_aircraft_wingspan_ft != null) {
    return {
      id:             `custom:${user.id}`,
      manufacturer:   'Custom',
      model:          prefs.custom_aircraft_name,
      common_name:    prefs.custom_aircraft_name,
      category:       'custom',
      wingspan_ft:    Number(prefs.custom_aircraft_wingspan_ft),
      length_ft:      Number(prefs.custom_aircraft_length_ft ?? 0),
      height_ft:      Number(prefs.custom_aircraft_height_ft ?? 0),
      mtow_lbs:       null,
      is_taildragger: false,
    }
  }

  const id = prefs.default_aircraft_id
  if (!id) return null

  const { data: ac } = await supabaseAdmin
    .from('aircraft_specs')
    .select('id, manufacturer, model, common_name, category, wingspan_ft, length_ft, height_ft, mtow_lbs, is_taildragger')
    .eq('id', id)
    .maybeSingle()

  return (ac as AircraftSpec) ?? null
}

/**
 * Save (or clear) the user's default aircraft. Pass null to clear.
 * Picking from the dataset clears any custom-entered aircraft so the two
 * never compete for the "active" slot.
 */
export async function saveDefaultAircraft(aircraftId: string | null): Promise<{ error?: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be logged in.' }

  const { error } = await supabaseAdmin
    .from('user_preferences')
    .upsert({
      user_id:                     user.id,
      default_aircraft_id:         aircraftId,
      custom_aircraft_name:        null,
      custom_aircraft_wingspan_ft: null,
      custom_aircraft_length_ft:   null,
      custom_aircraft_height_ft:   null,
      updated_at:                  new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) {
    console.error('[aircraft] save default failed:', error.message)
    return { error: 'Failed to save. Please try again.' }
  }

  revalidatePath('/settings')
  revalidatePath('/')
  return {}
}

/**
 * Save a custom-entered aircraft for users whose plane isn't in our dataset.
 * Stored inline on user_preferences. Setting one clears the picked default
 * so the two slots stay mutually exclusive.
 */
export async function saveCustomAircraft(args: {
  name:        string
  wingspan_ft: number
  length_ft:   number
  height_ft:   number
}): Promise<{ error?: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be logged in.' }

  const name = args.name.trim()
  if (!name) return { error: 'Aircraft name is required.' }
  if (!Number.isFinite(args.wingspan_ft) || args.wingspan_ft <= 0) {
    return { error: 'Wingspan must be a positive number of feet.' }
  }
  if (!Number.isFinite(args.length_ft) || args.length_ft <= 0) {
    return { error: 'Length must be a positive number of feet.' }
  }
  if (!Number.isFinite(args.height_ft) || args.height_ft <= 0) {
    return { error: 'Tail height must be a positive number of feet.' }
  }

  const { error } = await supabaseAdmin
    .from('user_preferences')
    .upsert({
      user_id:                     user.id,
      custom_aircraft_name:        name,
      custom_aircraft_wingspan_ft: args.wingspan_ft,
      custom_aircraft_length_ft:   args.length_ft,
      custom_aircraft_height_ft:   args.height_ft,
      default_aircraft_id:         null,
      updated_at:                  new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) {
    console.error('[aircraft] save custom failed:', error.message)
    return { error: 'Failed to save. Please try again.' }
  }

  revalidatePath('/settings')
  revalidatePath('/')
  return {}
}

/**
 * Inbound queue for users telling us their aircraft is missing from the
 * dataset. Inserts a row to aircraft_requests and emails ADMIN_EMAILS so
 * Andre sees it in his inbox.
 */
export async function reportMissingAircraft(args: {
  manufacturer: string
  model:        string
  notes?:       string
}): Promise<{ error?: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be logged in.' }

  const manufacturer = args.manufacturer.trim()
  const model        = args.model.trim()
  const notes        = (args.notes ?? '').trim()

  if (!model) return { error: 'Aircraft model is required.' }

  const { error: insertErr } = await supabaseAdmin
    .from('aircraft_requests')
    .insert({
      user_id:      user.id,
      user_email:   user.email ?? null,
      manufacturer: manufacturer || null,
      model,
      notes:        notes || null,
      status:       'open',
    })

  if (insertErr) {
    console.error('[aircraft] report missing insert failed:', insertErr.message)
    return { error: 'Failed to send. Please try again.' }
  }

  // Fire-and-forget email to admins. We don't block the user on delivery.
  void notifyAdminsOfAircraftRequest({
    requesterName:  (user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'A user',
    requesterEmail: user.email ?? '(no email)',
    manufacturer,
    model,
    notes,
  }).catch(e => console.error('[aircraft] notify admins failed:', e))

  revalidatePath('/settings')
  return {}
}

async function notifyAdminsOfAircraftRequest(payload: {
  requesterName:  string
  requesterEmail: string
  manufacturer:   string
  model:          string
  notes:          string
}): Promise<void> {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  if (adminEmails.length === 0) return

  const subject = `New aircraft request: ${payload.manufacturer ? payload.manufacturer + ' ' : ''}${payload.model}`

  const rowsHtml = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;font-size:14px;color:#64748b;width:130px;">Requester</td>
          <td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:500;">${escapeHtml(payload.requesterName)} &lt;${escapeHtml(payload.requesterEmail)}&gt;</td></tr>
      ${payload.manufacturer ? `
      <tr><td style="padding:6px 0;font-size:14px;color:#64748b;border-top:1px solid #f1f5f9;">Manufacturer</td>
          <td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:500;border-top:1px solid #f1f5f9;">${escapeHtml(payload.manufacturer)}</td></tr>` : ''}
      <tr><td style="padding:6px 0;font-size:14px;color:#64748b;border-top:1px solid #f1f5f9;">Model</td>
          <td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:500;border-top:1px solid #f1f5f9;">${escapeHtml(payload.model)}</td></tr>
      ${payload.notes ? `
      <tr><td style="padding:6px 0;font-size:14px;color:#64748b;border-top:1px solid #f1f5f9;vertical-align:top;">Notes</td>
          <td style="padding:6px 0;font-size:14px;color:#0f172a;border-top:1px solid #f1f5f9;line-height:1.6;">${escapeHtml(payload.notes)}</td></tr>` : ''}
    </table>`

  const html = modernLayout({
    preheader: `${payload.requesterName} asked us to add ${payload.model} to the aircraft list.`,
    eyebrow:   'Admin inbox',
    title:     'New aircraft request',
    subtitle:  `${payload.requesterName} would like ${payload.manufacturer ? payload.manufacturer + ' ' : ''}${payload.model} added to the Hangar Marketplace aircraft list.`,
    heroCaption: 'REVIEW',
    heroGradient: 'linear-gradient(135deg,#0c4a6e 0%,#2563eb 55%,#93c5fd 100%)',
    sections: [{ title: 'Request', html: rowsHtml }],
    footerIntro: `You're getting this because your email is in ADMIN_EMAILS.`,
  })

  await Promise.all(adminEmails.map(to =>
    sendEmail({ to, subject, html }).catch(e =>
      console.error('[aircraft] admin email to', to, 'failed:', e)
    ),
  ))
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
