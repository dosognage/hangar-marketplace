'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { createServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { sendEmail, brokerApprovedEmail, brokerRejectedEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'

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

  revalidatePath('/broker/dashboard')
  revalidatePath(`/broker/${brokerProfileId}`)
  return { success: 'Profile updated successfully.' }
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
}): Promise<{ error?: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be logged in to apply.' }

  const { error } = await supabaseAdmin
    .from('broker_applications')
    .insert([{
      user_id:        user.id,
      email:          user.email,
      full_name:      formData.full_name,
      brokerage:      formData.brokerage,
      license_state:  formData.license_state,
      license_number: formData.license_number,
      phone:          formData.phone || null,
      website:        formData.website || null,
      bio:            formData.bio || null,
      status:         'pending',
    }])

  if (error) {
    if (error.code === '23505') return { error: 'You already have a pending or approved broker application.' }
    return { error: error.message }
  }

  return {}
}

/**
 * Approve a broker application.
 * 1. Creates a row in broker_profiles (with license_number)
 * 2. Marks the application as approved
 * 3. Sets is_broker = true in the user's Supabase metadata
 * 4. Sends a VIP welcome email
 */
export async function approveBrokerApplication(applicationId: string, userId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (!isAdmin(user.email)) throw new Error('Not authorized')

  // Fetch the application details
  const { data: app, error: appError } = await supabaseAdmin
    .from('broker_applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  if (appError || !app) throw new Error('Application not found')

  // Create the broker profile (check for duplicate first)
  const { data: existing } = await supabaseAdmin
    .from('broker_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  let profileId: string

  if (existing) {
    profileId = existing.id
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
      }])
      .select('id')
      .single()

    if (profileError || !newProfile) throw new Error(profileError?.message ?? 'Failed to create broker profile')
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
