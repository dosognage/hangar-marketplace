/**
 * POST /api/bug-report
 *
 * Receives a bug report payload from the client and sends a rich
 * HTML email to the site admin. The email includes:
 *   - User's description
 *   - Page URL, browser, screen size
 *   - Full log trail (last 5 minutes)
 *
 * This route does NOT use RESEND_TEST_TO — reports always go to the
 * admin regardless of dev mode.
 */

import { NextRequest, NextResponse } from 'next/server'
import type { BugReportPayload, LogEntry } from '@/lib/bug-report-types'

const RESEND_API    = 'https://api.resend.com/emails'
const ADMIN_EMAIL   = process.env.ADMIN_REPORT_EMAIL ?? 'hello@hangarmarketplace.com'
const SITE_URL      = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

// Rate-limit: track recent submissions by IP (in-memory, resets on restart)
const recentSubmissions = new Map<string, number>()
const RATE_LIMIT_MS = 60_000   // 1 report per IP per minute

function parseIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

// ── Email builder ──────────────────────────────────────────────────────────

function logTypeColor(type: string): string {
  switch (type) {
    case 'js_error':      return '#dc2626'
    case 'console_error': return '#ef4444'
    case 'fetch_fail':    return '#ea580c'
    case 'console_warn':  return '#d97706'
    case 'nav':           return '#6b7280'
    default:              return '#374151'
  }
}

function logTypeBg(type: string): string {
  switch (type) {
    case 'js_error':      return '#fef2f2'
    case 'console_error': return '#fff5f5'
    case 'fetch_fail':    return '#fff7ed'
    case 'console_warn':  return '#fffbeb'
    case 'nav':           return '#f9fafb'
    default:              return '#f9fafb'
  }
}

function buildEmail(payload: BugReportPayload): { subject: string; html: string } {
  const {
    description, userEmail, pageUrl, userAgent,
    screen, logs, submittedAt,
  } = payload

  const reportTime = new Date(submittedAt).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    dateStyle: 'medium',
    timeStyle: 'medium',
  })

  // Parse user agent for a friendlier display
  const isChrome  = userAgent.includes('Chrome') && !userAgent.includes('Edg')
  const isFirefox = userAgent.includes('Firefox')
  const isSafari  = userAgent.includes('Safari') && !userAgent.includes('Chrome')
  const isEdge    = userAgent.includes('Edg')
  const isMobile  = /iPhone|iPad|Android|Mobile/.test(userAgent)
  const isWindows = userAgent.includes('Windows')
  const isMac     = userAgent.includes('Macintosh')
  const isIOS     = /iPhone|iPad/.test(userAgent)

  const browser = isEdge ? 'Edge' : isChrome ? 'Chrome' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : 'Unknown browser'
  const os      = isIOS ? 'iOS' : isWindows ? 'Windows' : isMac ? 'macOS' : isMobile ? 'Android' : 'Unknown OS'
  const device  = isMobile ? 'Mobile' : 'Desktop'

  // Separate log types for summary
  const errors   = logs.filter(l => l.type === 'js_error' || l.type === 'console_error' || l.type === 'fetch_fail')
  const warnings = logs.filter(l => l.type === 'console_warn')
  const navs     = logs.filter(l => l.type === 'nav')

  const severityColor = errors.length > 0 ? '#dc2626' : warnings.length > 0 ? '#d97706' : '#16a34a'
  const severityLabel = errors.length > 0 ? `${errors.length} error${errors.length !== 1 ? 's' : ''} captured` : warnings.length > 0 ? 'Warnings only' : 'No errors captured'

  // Build the log table rows
  const logRows = logs.length === 0
    ? `<tr><td colspan="3" style="padding:12px;text-align:center;color:#9ca3af;font-size:13px;">No activity captured in the 5 minutes before this report.</td></tr>`
    : logs.map(entry => {
        const time = new Date(entry.ts).toLocaleTimeString('en-US', {
          timeZone: 'America/Chicago',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
        const detail = entry.detail
          ? `<div style="margin-top:3px;font-size:11px;color:#9ca3af;font-family:monospace;word-break:break-all;">${entry.detail.split('\n')[0]}</div>`
          : ''

        return `
          <tr style="background:${logTypeBg(entry.type)}">
            <td style="padding:7px 10px;font-family:monospace;font-size:12px;color:#6b7280;white-space:nowrap;border-bottom:1px solid #f3f4f6;">
              ${time}
            </td>
            <td style="padding:7px 10px;white-space:nowrap;border-bottom:1px solid #f3f4f6;">
              <span style="display:inline-block;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:700;
                           background:${logTypeBg(entry.type)};color:${logTypeColor(entry.type)};border:1px solid ${logTypeColor(entry.type)}40;">
                ${entry.type}
              </span>
            </td>
            <td style="padding:7px 10px;font-size:12px;color:#374151;word-break:break-word;border-bottom:1px solid #f3f4f6;">
              ${entry.message}${detail}
            </td>
          </tr>`
      }).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0"
               style="background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background:#1a3a5c;padding:20px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;color:white;font-size:18px;font-weight:700;">⚠ Bug Report</p>
                    <p style="margin:3px 0 0;color:#93c5fd;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">
                      Hangar Marketplace: Technical Issue
                    </p>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;padding:4px 12px;border-radius:999px;
                                 background:${severityColor}22;border:1px solid ${severityColor}55;
                                 color:${severityColor};font-size:12px;font-weight:700;">
                      ${severityLabel}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 32px;">

              <!-- Description -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#9ca3af;
                               text-transform:uppercase;letter-spacing:0.06em;">
                      User Description
                    </p>
                    <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;
                                padding:14px 16px;font-size:15px;color:#111827;line-height:1.6;">
                      ${description.replace(/\n/g, '<br/>')}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Context grid -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#9ca3af;
                               text-transform:uppercase;letter-spacing:0.06em;">
                      Report Context
                    </p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;font-size:13px;">
                ${[
                  ['Reported', reportTime],
                  ['Page', `<a href="${pageUrl}" style="color:#6366f1;word-break:break-all;">${pageUrl}</a>`],
                  ['Browser', `${browser} on ${os} (${device})`],
                  ['Screen', `${screen.width} × ${screen.height}`],
                  ['Contact', userEmail ? `<a href="mailto:${userEmail}" style="color:#6366f1;">${userEmail}</a>` : '<span style="color:#9ca3af;">Not provided</span>'],
                  ['Log window', `${logs.length} event${logs.length !== 1 ? 's' : ''} · ${errors.length} error${errors.length !== 1 ? 's' : ''} · ${warnings.length} warning${warnings.length !== 1 ? 's' : ''} · ${navs.length} nav${navs.length !== 1 ? 's' : ''}`],
                ].map(([label, value], i) => `
                  <tr style="background:${i % 2 === 0 ? 'white' : '#fafafa'}">
                    <td style="padding:9px 14px;font-weight:700;color:#374151;white-space:nowrap;
                               border-bottom:1px solid #f3f4f6;width:130px;">
                      ${label}
                    </td>
                    <td style="padding:9px 14px;color:#111827;border-bottom:1px solid #f3f4f6;">
                      ${value}
                    </td>
                  </tr>
                `).join('')}
              </table>

              <!-- Activity log -->
              <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#9ca3af;
                         text-transform:uppercase;letter-spacing:0.06em;">
                Activity Log (last 5 minutes)
              </p>
              <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:8px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <thead>
                    <tr style="background:#f9fafb;">
                      <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:700;border-bottom:1px solid #e5e7eb;white-space:nowrap;">Time (CT)</th>
                      <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:700;border-bottom:1px solid #e5e7eb;">Type</th>
                      <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:700;border-bottom:1px solid #e5e7eb;">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${logRows}
                  </tbody>
                </table>
              </div>
              <p style="margin:0;font-size:11px;color:#9ca3af;">
                Times shown in US Central. Full user agent: <code style="font-size:10px;">${userAgent.slice(0, 100)}…</code>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">
                Sent automatically from
                <a href="${SITE_URL}" style="color:#9ca3af;">${SITE_URL}</a>
                · Do not reply to this email directly${userEmail ? ` · Reply to reporter: <a href="mailto:${userEmail}" style="color:#6b7280;">${userEmail}</a>` : ''}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const errorSummary = errors.length > 0
    ? ` [${errors.length} error${errors.length !== 1 ? 's' : ''}]`
    : ''

  return {
    subject: `[Bug Report]${errorSummary} ${description.slice(0, 60)}${description.length > 60 ? '…' : ''}`,
    html,
  }
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = parseIp(req)
  const lastSubmit = recentSubmissions.get(ip) ?? 0
  if (Date.now() - lastSubmit < RATE_LIMIT_MS) {
    return NextResponse.json({ error: 'Please wait a moment before sending another report.' }, { status: 429 })
  }

  // Parse payload
  let payload: BugReportPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Basic validation
  if (!payload.description?.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 })
  }
  if (!payload.pageUrl || !payload.userAgent || !payload.submittedAt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Sanitize: cap log entries
  if (Array.isArray(payload.logs)) {
    payload.logs = payload.logs.slice(-250)
  } else {
    payload.logs = []
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[bug-report] RESEND_API_KEY not set')
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  const { subject, html } = buildEmail(payload)

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    `Hangar Marketplace <notify@hangarmarketplace.com>`,
      to:      [ADMIN_EMAIL],
      subject,
      html,
      // If user provided email, set reply-to so you can respond directly
      ...(payload.userEmail ? { reply_to: [payload.userEmail] } : {}),
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[bug-report] Resend error:', err)
    return NextResponse.json({ error: 'Failed to send report' }, { status: 500 })
  }

  // Record submission for rate limiting
  recentSubmissions.set(ip, Date.now())

  // Clean up old rate limit entries periodically
  if (recentSubmissions.size > 500) {
    const cutoff = Date.now() - RATE_LIMIT_MS * 10
    for (const [key, ts] of recentSubmissions) {
      if (ts < cutoff) recentSubmissions.delete(key)
    }
  }

  console.log(`[bug-report] Report sent from ${ip}: "${payload.description.slice(0, 60)}"`)
  return NextResponse.json({ ok: true })
}
