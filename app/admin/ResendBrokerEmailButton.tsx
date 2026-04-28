'use client'

/**
 * Small admin-only button next to each verified broker that re-fires the
 * broker_approved welcome email. Surfaces the actual Resend result inline
 * (✓ Sent · last4_of_id, or the literal error message) so the admin can
 * tell deliverability issues apart from "the welcome was sent but landed
 * in spam."
 */

import { useState, useTransition } from 'react'
import { resendBrokerWelcomeEmail } from '@/app/actions/broker'

export default function ResendBrokerEmailButton({
  brokerProfileId,
}: {
  brokerProfileId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<
    | null
    | { ok: true;  sent_to: string; id?: string }
    | { ok: false; error: string }
  >(null)

  function run() {
    setResult(null)
    startTransition(async () => {
      const res = await resendBrokerWelcomeEmail(brokerProfileId)
      if (res.ok) {
        setResult({ ok: true, sent_to: res.sent_to ?? '', id: res.id })
      } else {
        setResult({ ok: false, error: res.error ?? 'Unknown error' })
      }
      // Keep the result visible long enough to read.
      setTimeout(() => setResult(null), 8000)
    })
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={run}
        disabled={isPending}
        style={{
          padding: '0.3rem 0.7rem',
          borderRadius: '6px',
          border: '1px solid #c7d2fe',
          backgroundColor: '#eef2ff',
          color: '#4338ca',
          fontSize: '0.78rem',
          fontWeight: 600,
          cursor: isPending ? 'wait' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {isPending ? 'Sending…' : '✉️ Resend welcome'}
      </button>
      {result?.ok && (
        <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>
          ✓ Sent to {result.sent_to}
          {result.id ? ` · ${result.id.slice(0, 8)}…` : ''}
        </span>
      )}
      {result && !result.ok && (
        <span style={{ fontSize: '0.75rem', color: '#dc2626', maxWidth: '420px' }}>
          ✗ {result.error}
        </span>
      )}
    </span>
  )
}
