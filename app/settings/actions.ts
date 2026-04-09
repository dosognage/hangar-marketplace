'use server'

import { createServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export type SettingsState = {
  success?: string
  error?: string
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
