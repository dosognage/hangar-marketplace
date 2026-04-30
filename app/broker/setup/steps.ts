/**
 * Broker setup wizard — step definitions + completion detection.
 *
 * Single source of truth for the wizard's structure. The layout renders the
 * progress indicator from this list, each step page reads its own metadata
 * here, and the "next" / "back" navigation is computed from the array order.
 *
 * Adding a step means editing this file and dropping a new page.tsx in the
 * matching subfolder. Nothing else needs to change.
 */

export type SetupStepId =
  | 'welcome'
  | 'profile'
  | 'avatar'
  | 'specialty'
  | 'preferences'
  | 'done'

export type SetupStep = {
  id:        SetupStepId
  index:     number          // 1-based step number for display
  path:      string          // route path
  title:     string          // shown in the progress indicator and page header
  subtitle:  string          // shown under the header on the page itself
  required:  boolean         // false = "Skip for now" button shown
  isComplete: (profile: BrokerProfileLike) => boolean
}

export type BrokerProfileLike = {
  brokerage:        string | null
  phone:            string | null
  contact_email:    string | null
  bio:              string | null
  avatar_url:       string | null
  specialty_airports: string[] | null
  alert_radius_miles: number | null
  setup_completed_at: string | null
}

export const SETUP_STEPS: SetupStep[] = [
  {
    id:       'welcome',
    index:    1,
    path:     '/broker/setup',
    title:    'Welcome',
    subtitle: 'About 3 minutes total.',
    required: true,
    isComplete: () => true, // welcome is always "complete" (just an intro)
  },
  {
    id:       'profile',
    index:    2,
    path:     '/broker/setup/profile',
    title:    'Profile',
    subtitle: 'Make sure buyers can find you and reach you.',
    required: true,
    isComplete: (p) => !!(p.brokerage && p.phone && p.contact_email && (p.bio?.trim().length ?? 0) >= 10),
  },
  {
    id:       'avatar',
    index:    3,
    path:     '/broker/setup/avatar',
    title:    'Photo',
    subtitle: 'A real headshot meaningfully increases buyer trust.',
    required: false,
    isComplete: (p) => !!p.avatar_url,
  },
  {
    id:       'specialty',
    index:    4,
    path:     '/broker/setup/specialty',
    title:    'Coverage',
    subtitle: 'Which airports do you primarily work? This powers your alerts and showcases your market.',
    required: false,
    isComplete: (p) => (p.specialty_airports?.length ?? 0) > 0,
  },
  {
    id:       'preferences',
    index:    5,
    path:     '/broker/setup/preferences',
    title:    'Preferences',
    subtitle: 'Email visibility, alert radius, and our weekly market intelligence newsletter.',
    required: true,
    isComplete: (p) => p.alert_radius_miles !== null && p.alert_radius_miles > 0,
  },
  {
    id:       'done',
    index:    6,
    path:     '/broker/setup/done',
    title:    'Done',
    subtitle: 'You are ready to list.',
    required: true,
    isComplete: (p) => p.setup_completed_at !== null,
  },
]

export function getStep(id: SetupStepId): SetupStep {
  const s = SETUP_STEPS.find(s => s.id === id)
  if (!s) throw new Error(`[setup] Unknown step: ${id}`)
  return s
}

export function nextStep(id: SetupStepId): SetupStep | null {
  const i = SETUP_STEPS.findIndex(s => s.id === id)
  return i < 0 || i === SETUP_STEPS.length - 1 ? null : SETUP_STEPS[i + 1]
}

export function prevStep(id: SetupStepId): SetupStep | null {
  const i = SETUP_STEPS.findIndex(s => s.id === id)
  return i <= 0 ? null : SETUP_STEPS[i - 1]
}

export function progressPct(profile: BrokerProfileLike): number {
  const completed = SETUP_STEPS.filter(s => s.isComplete(profile)).length
  return Math.round((completed / SETUP_STEPS.length) * 100)
}
