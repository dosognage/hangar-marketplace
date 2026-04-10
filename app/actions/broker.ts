'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { createServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { sendEmail, brokerApprovedEmail, brokerRejectedEmail } from '@/lib/email'

function isAdmin(email: string | undefined): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())
  return adminEmails.includes((email ?? '').toLowerCase())
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
