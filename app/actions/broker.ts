'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { createServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

/**
 * Approve a broker application.
 * 1. Creates a row in broker_profiles
 * 2. Marks the application as approved
 */
export async function approveBrokerApplication(applicationId: string, userId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())
  if (!adminEmails.includes((user.email ?? '').toLowerCase())) {
    throw new Error('Not authorized')
  }

  // Fetch the application details
  const { data: app, error: appError } = await supabaseAdmin
    .from('broker_applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  if (appError || !app) throw new Error('Application not found')

  // Create the broker profile
  const { error: profileError } = await supabaseAdmin
    .from('broker_profiles')
    .insert([{
      user_id:        userId,
      full_name:      app.full_name,
      brokerage:      app.brokerage,
      license_state:  app.license_state,
      phone:          app.phone,
      website:        app.website,
      bio:            app.bio,
    }])

  if (profileError) throw new Error(profileError.message)

  // Mark application approved
  await supabaseAdmin
    .from('broker_applications')
    .update({ status: 'approved' })
    .eq('id', applicationId)

  revalidatePath('/admin')
  revalidatePath('/broker')
}

/**
 * Reject a broker application.
 */
export async function rejectBrokerApplication(applicationId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())
  if (!adminEmails.includes((user.email ?? '').toLowerCase())) {
    throw new Error('Not authorized')
  }

  await supabaseAdmin
    .from('broker_applications')
    .update({ status: 'rejected' })
    .eq('id', applicationId)

  revalidatePath('/admin')
}
