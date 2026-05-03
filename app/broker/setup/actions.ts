'use server'

/**
 * Setup wizard server actions. Each step writes a small slice of the
 * broker_profile (and occasionally email_subscribers) and redirects to
 * the next step on success.
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase-server'
import { resolveBrokerProfileId } from '@/lib/auth-broker'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { nextStep, type SetupStepId } from './steps'

async function requireBrokerProfile(): Promise<{ brokerProfileId: string; email: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // SECURITY: derive broker_profile_id from broker_profiles.user_id, not
  // from JWT user_metadata. The latter is end-user-editable so an attacker
  // could otherwise run setup steps against any broker's profile.
  const brokerProfileId = await resolveBrokerProfileId(user)
  if (!brokerProfileId) throw new Error('No broker profile')
  return { brokerProfileId, email: user.email ?? '' }
}

/** Generic next-step navigation used by step pages after they've saved. */
function goToNext(currentId: SetupStepId): never {
  const next = nextStep(currentId)
  redirect(next?.path ?? '/broker/dashboard')
}

// ── Step: Profile ────────────────────────────────────────────────────────
export async function saveProfileStep(_prev: unknown, formData: FormData): Promise<{ error?: string }> {
  try {
    const { brokerProfileId } = await requireBrokerProfile()

    const brokerage     = String(formData.get('brokerage')     ?? '').trim()
    const phone         = String(formData.get('phone')         ?? '').trim()
    const contact_email = String(formData.get('contact_email') ?? '').trim()
    const bio           = String(formData.get('bio')           ?? '').trim()
    const website       = String(formData.get('website')       ?? '').trim()

    if (!brokerage)      return { error: 'Brokerage name is required.' }
    if (!phone)          return { error: 'Phone number is required.' }
    if (!contact_email)  return { error: 'Contact email is required.' }
    if (bio.length < 10) return { error: 'Bio should be at least 10 characters. Pilots want to know who they are working with.' }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) return { error: 'Please enter a valid contact email.' }

    const { error } = await supabaseAdmin
      .from('broker_profiles')
      .update({
        brokerage,
        phone,
        contact_email,
        bio,
        website: website || null,
      })
      .eq('id', brokerProfileId)

    if (error) return { error: error.message }
    revalidatePath('/broker/dashboard')
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Save failed.' }
  }
  goToNext('profile')
}

// ── Step: Specialty airports ─────────────────────────────────────────────
export async function saveSpecialtyStep(_prev: unknown, formData: FormData): Promise<{ error?: string }> {
  try {
    const { brokerProfileId } = await requireBrokerProfile()

    // Comma-separated ICAO codes from the input. Normalise to upper, dedupe,
    // limit to 10 to match the existing dashboard convention.
    const raw = String(formData.get('airports') ?? '')
    const airports = Array.from(new Set(
      raw.split(/[\s,]+/).map(s => s.trim().toUpperCase()).filter(s => /^[A-Z0-9]{3,5}$/.test(s)),
    )).slice(0, 10)

    const { error } = await supabaseAdmin
      .from('broker_profiles')
      .update({ specialty_airports: airports })
      .eq('id', brokerProfileId)
    if (error) return { error: error.message }
    revalidatePath('/broker/dashboard')
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Save failed.' }
  }
  goToNext('specialty')
}

// ── Step: Preferences (alert radius, email visibility, newsletter) ───────
// Note: this is the LAST data-collection step in the wizard. We stamp
// setup_completed_at here too so the done page has nothing to write during
// render (calling revalidatePath inside a render is unsupported in Next.js).
export async function savePreferencesStep(_prev: unknown, formData: FormData): Promise<{ error?: string }> {
  try {
    const { brokerProfileId, email } = await requireBrokerProfile()

    const alertRadius = Math.max(10, Math.min(1000, Number(formData.get('alert_radius_miles') ?? 100)))
    const hideEmail   = formData.get('hide_email') === 'on'
    const subscribe   = formData.get('subscribe_market_scan') === 'on'

    const { error } = await supabaseAdmin
      .from('broker_profiles')
      .update({
        alert_radius_miles: alertRadius,
        hide_email:         hideEmail,
        setup_completed_at: new Date().toISOString(),
      })
      .eq('id', brokerProfileId)
    if (error) return { error: error.message }

    // Newsletter opt-in writes to email_subscribers (same table the public
    // marketing list uses). Source = 'broker_setup' so we can fan out the
    // weekly market-scan to brokers separately if desired.
    if (subscribe && email) {
      await supabaseAdmin.from('email_subscribers').upsert({
        email:             email.toLowerCase(),
        marketing_consent: true,
        consent_timestamp: new Date().toISOString(),
        consent_source:    'broker_setup',
        unsubscribed_at:   null,
      }, { onConflict: 'email' })
    }

    revalidatePath('/broker/dashboard')
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Save failed.' }
  }
  goToNext('preferences')
}

// ── Final completion: stamp setup_completed_at ───────────────────────────
export async function completeSetup(): Promise<void> {
  const { brokerProfileId } = await requireBrokerProfile()
  await supabaseAdmin
    .from('broker_profiles')
    .update({ setup_completed_at: new Date().toISOString() })
    .eq('id', brokerProfileId)
  revalidatePath('/broker/dashboard')
}

// ── Skip helpers (advance without changing data) ─────────────────────────
export async function skipStep(currentId: SetupStepId): Promise<void> {
  goToNext(currentId)
}
