'use server'

import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

export type SettingsState = {
  success?: string
  error?: string
}

export type ProfileState = {
  success?: string
  error?: string
  field?: string   // which field had a validation error
}

/**
 * Save the user's display name, phone number, and optionally a new email.
 * - Name and phone go into auth user_metadata.
 * - Email change triggers a Supabase confirmation flow (user must click link).
 * - If the user is a verified broker, name and phone are synced to broker_profiles.
 */
export async function saveProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'You must be logged in.' }

  const full_name  = (formData.get('full_name')  as string | null)?.trim() ?? ''
  const phone      = (formData.get('phone')       as string | null)?.trim() ?? ''
  const new_email  = (formData.get('email')       as string | null)?.trim() ?? ''

  // Basic email format check
  if (new_email && new_email !== user.email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(new_email)) {
      return { error: 'Please enter a valid email address.', field: 'email' }
    }
  }

  // Update user_metadata (name + phone)
  const { error: metaError } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      full_name: full_name || null,
      phone:     phone     || null,
    },
  })
  if (metaError) return { error: 'Failed to save profile: ' + metaError.message }

  // If email changed, trigger Supabase confirmation flow
  let emailNote = ''
  if (new_email && new_email !== user.email) {
    const { error: emailError } = await supabase.auth.updateUser({ email: new_email })
    if (emailError) return { error: 'Failed to update email: ' + emailError.message }
    emailNote = ' Check your new inbox to confirm the email change.'
  }

  // Sync name + phone to broker_profiles if user is a verified broker
  const brokerProfileId = user.user_metadata?.broker_profile_id as string | undefined
  if (brokerProfileId) {
    await supabaseAdmin
      .from('broker_profiles')
      .update({
        ...(full_name && { full_name }),
        ...(phone     && { phone }),
      })
      .eq('id', brokerProfileId)
  }

  revalidatePath('/settings')
  return { success: 'Profile saved.' + emailNote }
}

/**
 * Save the user's home airport ICAO code to their Supabase auth metadata.
 * The layout reads this value server-side to pass to HomeAirportWidget.
 */
export async function saveHomeAirport(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const raw = (formData.get('home_airport') as string | null) ?? ''
  const code = raw.trim().toUpperCase()

  // Validate: 3–4 uppercase alphanumeric characters
  if (code && !/^[A-Z0-9]{3,4}$/.test(code)) {
    return { error: 'Enter a valid ICAO code (e.g. KBFI, KSEA, KPAE).' }
  }

  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in to save settings.' }
  }

  const { error } = await supabase.auth.updateUser({
    data: { home_airport: code || null },
  })

  if (error) {
    console.error('[settings] updateUser error:', error.message)
    return { error: 'Failed to save. Please try again.' }
  }

  revalidatePath('/settings')
  revalidatePath('/')   // re-render layout so widget shows immediately

  return {
    success: code
      ? `Home airport set to ${code}.`
      : 'Home airport cleared.',
  }
}
