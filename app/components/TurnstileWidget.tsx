'use client'

/**
 * Turnstile widget — drop-in for forms that need bot protection.
 *
 * When this component renders inside a <form>, Cloudflare injects a hidden
 * input named `cf-turnstile-response` containing the challenge token after
 * the user passes verification. The server action then reads that field and
 * calls verifyTurnstileToken() from lib/turnstile.ts.
 *
 * If NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset (e.g. local dev with no Cloudflare
 * keys), the widget renders nothing — paired with the dev no-op in lib/turnstile.ts
 * this means local development just works.
 */
import { Turnstile } from '@marsidev/react-turnstile'

export default function TurnstileWidget() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  if (!siteKey) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
      <Turnstile
        siteKey={siteKey}
        options={{
          theme: 'light',
          // 'managed' is the default (Cloudflare picks invisible/non-interactive/
          // interactive based on signal). Most real users see nothing.
        }}
      />
    </div>
  )
}
