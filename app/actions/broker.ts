'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { listAllAuthUsers } from '@/lib/authUsers'
import { createServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { sendEmail, brokerApprovedEmail, brokerRejectedEmail, newBrokerApplicationEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { geocodeLocation } from '@/lib/geocode'

function isAdmin(email: string | undefined): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())
  return adminEmails.includes((email ?? '').toLowerCase())
}

export type BrokerProfileState = {
  success?: string
  error?: string
}

/**
 * Save editable fields on a broker's own profile:
 * phone, contact_email, website, and bio.
 * Only the authenticated broker who owns the profile may update it.
 */
export async function saveBrokerProfile(
  _prev: BrokerProfileState,
  formData: FormData,
): Promise<BrokerProfileState> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'You must be logged in.' }

    const isBroker = user.user_metadata?.is_broker === true
    if (!isBroker) return { error: 'Not a verified broker.' }

    const brokerProfileId = user.user_metadata?.broker_profile_id as string | undefined
    if (!brokerProfileId) return { error: 'Broker profile not found.' }

    const brokerage          = (formData.get('brokerage')          as string | null)?.trim() ?? ''
    const phone              = (formData.get('phone')              as string | null)?.trim() ?? ''
    const contact_email      = (formData.get('contact_email')      as string | null)?.trim() ?? ''
    const website            = (formData.get('website')            as string | null)?.trim() ?? ''
    const bio                = (formData.get('bio')                as string | null)?.trim() ?? ''
    const license_number     = (formData.get('license_number')     as string | null)?.trim() ?? ''
    const specialty_airports_raw = (formData.get('specialty_airports') as string | null)?.trim() ?? ''
    const alert_radius_raw   = (formData.get('alert_radius_miles') as string | null)?.trim() ?? ''
    const hide_email         = formData.get('hide_email') === 'on'

    // Parse specialty airports — comma-separated ICAO codes, uppercase, max 10
    const specialty_airports = specialty_airports_raw
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(s => /^[A-Z0-9]{2,5}$/.test(s))
      .slice(0, 10)

    // Basic email format check
    if (contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
      return { error: 'Please enter a valid contact email address.' }
    }

    // ── Core fields (always exist in schema) ─────────────────────────────
    const { error: updateError } = await supabaseAdmin
      .from('broker_profiles')
      .update({
        brokerage:          brokerage          || null,
        phone:              phone              || null,
        contact_email:      contact_email      || null,
        website:            website            || null,
        bio:                bio                || null,
        license_number:     license_number     || null,
        specialty_airports: specialty_airports,
      })
      .eq('id', brokerProfileId)

    if (updateError) return { error: 'Failed to save: ' + updateError.message }

    // ── New columns (added by migration — update separately so a missing
    //    migration doesn't break the core save above) ────────────────────
    if (alert_radius_raw !== '') {
      const alert_radius_miles = Math.max(0, parseInt(alert_radius_raw, 10) || 0)
      await supabaseAdmin
        .from('broker_profiles')
        .update({ alert_radius_miles })
        .eq('id', brokerProfileId)
        // Intentionally ignoring error — column may not exist yet if
        // migration hasn't been applied. Core save already succeeded.
    }

    // hide_email lives in a later migration too — same isolation pattern.
    await supabaseAdmin
      .from('broker_profiles')
      .update({ hide_email })
      .eq('id', brokerProfileId)
      // Intentionally ignoring error if the column hasn't been added yet.

    // Geocode specialty airports in the background and cache their coords.
    if (specialty_airports.length > 0) {
      void cacheAirportCoords(brokerProfileId, specialty_airports)
    }

    revalidatePath('/broker/dashboard')
    revalidatePath(`/broker/${brokerProfileId}`)
    return { success: 'Profile updated successfully.' }

  } catch (err) {
    console.error('[saveBrokerProfile] unexpected error:', err)
    return { error: 'Something went wrong. Please try again.' }
  }
}

/**
 * Geocode each ICAO code in the list and persist the results as a JSONB object
 * on the broker's profile. Respects Nominatim's 1 req/sec rate limit.
 * Called fire-and-forget from saveBrokerProfile.
 */
async function cacheAirportCoords(brokerProfileId: string, icaoCodes: string[]) {
  const coords: Record<string, { lat: number; lng: number }> = {}
  for (const code of icaoCodes) {
    const geo = await geocodeLocation(code)
    if (geo) coords[code] = { lat: geo.lat, lng: geo.lng }
    // Nominatim rate-limit: wait 1.1 seconds between requests
    await new Promise(r => setTimeout(r, 1100))
  }
  if (Object.keys(coords).length === 0) return
  await supabaseAdmin
    .from('broker_profiles')
    .update({ specialty_airports_coords: coords })
    .eq('id', brokerProfileId)
}

/**
 * Submit a broker application.
 * Uses the server-side auth client so the cookie session is always valid.
 */
export async function submitBrokerApplication(formData: {
  full_name: string
  brokerage: string
  license_state: string
  license_number: string
  phone: string
  website: string
  bio: string
  is_unlicensed?: boolean
}): Promise<{ error?: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be logged in to apply.' }

  const isUnlicensed = formData.is_unlicensed === true

  // License fields required unless applicant is an unlicensed hangar specialist
  if (!isUnlicensed && (!formData.license_state?.trim() || !formData.license_number?.trim())) {
    return { error: 'License state and license number are required for licensed brokers.' }
  }

  const { error } = await supabaseAdmin
    .from('broker_applications')
    .insert([{
      user_id:        user.id,
      email:          user.email,
      full_name:      formData.full_name,
      brokerage:      formData.brokerage,
      license_state:  isUnlicensed ? null : formData.license_state,
      license_number: isUnlicensed ? null : formData.license_number,
      phone:          formData.phone || null,
      website:        formData.website || null,
      bio:            formData.bio || null,
      is_unlicensed:  isUnlicensed,
      status:         'pending',
    }])

  if (error) {
    if (error.code === '23505') return { error: 'You already have a pending or approved broker application.' }
    return { error: error.message }
  }

  // ── Notify admins (fire-and-forget) ─────────────────────────────────────
  // Email everyone in ADMIN_EMAILS and drop an in-app notification on each of
  // their bells. Any failure here is logged but does not affect the applicant's
  // success response.
  void notifyAdminsOfNewApplication({
    applicantName:  formData.full_name,
    applicantEmail: user.email ?? '',
    brokerage:      formData.brokerage || null,
    licenseState:   isUnlicensed ? null : formData.license_state,
    licenseNumber:  isUnlicensed ? null : formData.license_number,
    phone:          formData.phone    || null,
    website:        formData.website  || null,
    bio:            formData.bio      || null,
    isUnlicensed,
  }).catch(e => console.error('[applyForBroker] admin notify failed:', e))

  return {}
}

/**
 * Fan-out notification to every admin on file when a new broker application
 * arrives. Sends email to each ADMIN_EMAILS address and, where we can resolve
 * the admin's auth user id, also creates an in-app notification.
 */
async function notifyAdminsOfNewApplication(payload: {
  applicantName:  string
  applicantEmail: string
  brokerage:      string | null
  licenseState:   string | null
  licenseNumber:  string | null
  phone:          string | null
  website:        string | null
  bio:            string | null
  isUnlicensed:   boolean
}): Promise<void> {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  if (adminEmails.length === 0) return

  // Resolve admin user ids so we can hit their notification bell too.
  // Paginating helper handles >1000 user accounts safely.
  const userIdByEmail = new Map<string, string>()
  try {
    const users = await listAllAuthUsers({
      filter: u => adminEmails.includes((u.email ?? '').toLowerCase()),
    })
    for (const u of users) {
      const email = u.email?.toLowerCase()
      if (email) userIdByEmail.set(email, u.id)
    }
  } catch (e) {
    console.warn('[applyForBroker] listAllAuthUsers failed, skipping in-app notifs:', e)
  }

  const { subject, html } = newBrokerApplicationEmail(payload)
  const bodyLine = payload.brokerage
    ? `${payload.applicantName} (${payload.brokerage}) just applied.`
    : `${payload.applicantName} just applied.`

  await Promise.all(adminEmails.map(async email => {
    // Email
    await sendEmail({ to: email, subject, html }).catch(e =>
      console.error('[applyForBroker] email to', email, 'failed:', e)
    )

    // In-app notification
    const uid = userIdByEmail.get(email)
    if (uid) {
      await createNotification({
        userId: uid,
        type:   'broker_application',
        title:  'New broker application',
        body:   bodyLine,
        link:   '/admin',
      }).catch(e => console.error('[applyForBroker] notify to', email, 'failed:', e))
    }
  }))
}

/**
 * Approve a broker application.
 * 1. Creates a row in broker_profiles (with license_number)
 * 2. Marks the application as approved
 * 3. Sets is_broker = true in the user's Supabase metadata
 * 4. Sends a VIP welcome email
 *
 * Sensitive action: requires password re-verification (in addition to the
 * admin-email gate) so a stolen admin session alone can't promote arbitrary
 * users to verified-broker status.
 */
export async function approveBrokerApplication(
  applicationId: string,
  userId: string,
  password?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }
  if (!isAdmin(user.email)) return { ok: false, error: 'Not authorized' }

  // Re-verify the admin's password before doing anything irreversible.
  const { verifyCurrentPassword } = await import('@/lib/reauth')
  const reauth = await verifyCurrentPassword(password)
  if (!reauth.ok) return { ok: false, error: reauth.error }

  // Fetch the application details
  const { data: app, error: appError } = await supabaseAdmin
    .from('broker_applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  if (appError || !app) return { ok: false, error: 'Application not found' }

  // Create the broker profile (check for duplicate first)
  const { data: existing } = await supabaseAdmin
    .from('broker_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  let profileId: string

  if (existing) {
    profileId = existing.id
    // Existing broker_profile row — make sure it's flagged as verified.
    // (Earlier approvals didn't set this, leading to "approved but not
    // showing as broker" reports. Idempotent for already-verified rows.)
    await supabaseAdmin
      .from('broker_profiles')
      .update({ is_verified: true })
      .eq('id', profileId)
  } else {
    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from('broker_profiles')
      .insert([{
        user_id:        userId,
        full_name:      app.full_name,
        brokerage:      app.brokerage,
        license_state:  app.license_state,
        license_number: app.license_number,
        phone:          app.phone,
        website:        app.website,
        bio:            app.bio,
        // Default the public-facing contact email to whatever the broker
        // submitted on their application. They can change it later via the
        // broker dashboard, but this prevents the "no email button on my
        // public profile" surprise immediately after approval.
        contact_email:  app.email,
        is_unlicensed:  app.is_unlicensed ?? false,
        // Approval = verified. The verified-broker badge on listings, the
        // public profile page, and any "verified" gating downstream all
        // depend on this flag being true.
        is_verified:    true,
      }])
      .select('id')
      .single()

    if (profileError || !newProfile) {
      return { ok: false, error: profileError?.message ?? 'Failed to create broker profile' }
    }
    profileId = newProfile.id
  }

  // Mark application approved
  await supabaseAdmin
    .from('broker_applications')
    .update({ status: 'approved' })
    .eq('id', applicationId)

  // Set is_broker = true in user metadata
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { is_broker: true, broker_profile_id: profileId },
  })

  // Send VIP welcome email (fire-and-forget)
  try {
    const brokerEmail = app.email as string
    if (brokerEmail) {
      const { subject, html } = brokerApprovedEmail({ name: app.full_name, profileId })
      await sendEmail({ to: brokerEmail, subject, html })
    }
  } catch (err) {
    console.error('[approveBroker] Welcome email failed:', err)
  }

  // In-app notification
  await createNotification({
    userId: userId,
    type:   'broker_approved',
    title:  'You\'re now a verified broker! 🏅',
    body:   'Your broker profile is live. Listings you submit go live immediately.',
    link:   '/broker/dashboard',
  }).catch(e => console.error('[approveBroker] notification failed:', e))

  revalidatePath('/admin')
  revalidatePath('/broker')
  revalidatePath('/broker/dashboard')
  return { ok: true }
}

/**
 * Re-fire the broker_approved welcome email for a given broker profile.
 * Useful when the original email got eaten by spam, the API key was missing
 * at approval time, or anything else stopped the first send. Returns the
 * actual result (ok / error / Resend id) so the admin sees diagnostics.
 */
export async function resendBrokerWelcomeEmail(
  brokerProfileId: string,
): Promise<{ ok: boolean; error?: string; id?: string; sent_to?: string }> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, error: 'Not authenticated' }
  if (!isAdmin(user.email)) return { ok: false, error: 'Not authorized' }

  const { data: profile } = await supabaseAdmin
    .from('broker_profiles')
    .select('id, full_name, user_id, contact_email')
    .eq('id', brokerProfileId)
    .single()

  if (!profile) return { ok: false, error: 'Broker profile not found' }

  // Prefer the broker's contact_email; fall back to their auth email.
  let to = (profile as { contact_email?: string | null }).contact_email ?? null
  if (!to && profile.user_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabaseAdmin as any).auth.admin.getUserById(profile.user_id)
    to = data?.user?.email ?? null
  }
  if (!to) return { ok: false, error: 'No email on file for this broker' }

  const { subject, html } = brokerApprovedEmail({
    name:      profile.full_name,
    profileId: profile.id,
  })

  const result = await sendEmail({ to, subject, html })
  return { ...result, sent_to: to }
}

/**
 * Reject a broker application.
 * Sends a polite rejection email.
 */
export async function rejectBrokerApplication(applicationId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (!isAdmin(user.email)) throw new Error('Not authorized')

  // Fetch the application so we can email them
  const { data: app } = await supabaseAdmin
    .from('broker_applications')
    .select('full_name, email')
    .eq('id', applicationId)
    .maybeSingle()

  await supabaseAdmin
    .from('broker_applications')
    .update({ status: 'rejected' })
    .eq('id', applicationId)

  // Send rejection email (fire-and-forget)
  try {
    if (app?.email) {
      const { subject, html } = brokerRejectedEmail({ name: app.full_name })
      await sendEmail({ to: app.email as string, subject, html })
    }
  } catch (err) {
    console.error('[rejectBroker] Rejection email failed:', err)
  }

  revalidatePath('/admin')
}
