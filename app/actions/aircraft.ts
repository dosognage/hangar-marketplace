'use server'

import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
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
 * Returns the current user's saved default aircraft, if any. Used by the
 * homepage pill and the listing-detail fit widget to pre-fill the choice.
 */
export async function getDefaultAircraft(): Promise<AircraftSpec | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: prefs } = await supabaseAdmin
    .from('user_preferences')
    .select('default_aircraft_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const id = prefs?.default_aircraft_id
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
 */
export async function saveDefaultAircraft(aircraftId: string | null): Promise<{ error?: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be logged in.' }

  const { error } = await supabaseAdmin
    .from('user_preferences')
    .upsert({
      user_id:             user.id,
      default_aircraft_id: aircraftId,
      updated_at:          new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) {
    console.error('[aircraft] save default failed:', error.message)
    return { error: 'Failed to save. Please try again.' }
  }

  revalidatePath('/settings')
  revalidatePath('/')
  return {}
}
