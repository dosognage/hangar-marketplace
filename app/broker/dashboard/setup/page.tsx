/**
 * Legacy redirect.
 *
 * The old single-page broker setup checklist used to live here. It was
 * superseded by the multi-step wizard at /broker/setup. We keep this route
 * around as a permanent redirect so bookmarks, old emails, and any cached
 * banner links don't 404.
 */

import { redirect } from 'next/navigation'

export const dynamic = 'force-static'

export default function LegacyBrokerDashboardSetupRedirect() {
  redirect('/broker/setup')
}
