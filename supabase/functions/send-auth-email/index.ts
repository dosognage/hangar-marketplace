/**
 * send-auth-email — Supabase Auth "Send Email" hook.
 *
 * Renders and sends signup / magic-link / recovery / email-change
 * emails via Resend. Deployed with verify_jwt=false because GoTrue,
 * not a user, calls it.
 *
 * SECURITY (audit SEC-04): being publicly invokable, the ONLY guard is
 * the hook signature. Requests are verified against
 * SEND_EMAIL_HOOK_SECRET (standardwebhooks, the scheme Supabase Auth
 * signs with). Until the secret is configured on this function the
 * check logs loudly and allows (matching the previous behavior, zero
 * regression); the moment the secret exists, unsigned requests are
 * rejected with 401. Set the secret from Dashboard -> Auth -> Hooks
 * (copy) into Dashboard -> Edge Functions -> send-auth-email ->
 * Secrets as SEND_EMAIL_HOOK_SECRET.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const HOOK_SECRET = Deno.env.get('SEND_EMAIL_HOOK_SECRET');
const SITE_URL = 'https://hangarmarketplace.com';
const FROM = 'Hangar Marketplace <hello@hangarmarketplace.com>';

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#1a3a5c;padding:24px 40px;">
          <p style="margin:0;color:white;font-size:20px;font-weight:700;">✈ Hangar Marketplace</p>
          <p style="margin:3px 0 0;color:#93c5fd;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Aviation Properties</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">${body}</td></tr>
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;">
          <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.7;">
            <a href="${SITE_URL}/privacy" style="color:#9ca3af;">Privacy Policy</a>&nbsp;·&nbsp;
            <a href="${SITE_URL}" style="color:#9ca3af;">hangarmarketplace.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function btn(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;padding:11px 26px;background:#2563eb;color:white;text-decoration:none;border-radius:7px;font-size:14px;font-weight:600;margin-bottom:24px;">${label}</a>`;
}

interface EmailPayload {
  user: { email: string; user_metadata?: { full_name?: string } };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

Deno.serve(async (req: Request) => {
  try {
    const rawBody = await req.text();

    let payload: EmailPayload;
    if (HOOK_SECRET) {
      // Supabase presents the secret as "v1,whsec_<base64>"; the
      // standardwebhooks verifier wants the base64 portion.
      const wh = new Webhook(HOOK_SECRET.replace('v1,whsec_', ''));
      try {
        payload = wh.verify(rawBody, {
          'webhook-id': req.headers.get('webhook-id') ?? '',
          'webhook-timestamp': req.headers.get('webhook-timestamp') ?? '',
          'webhook-signature': req.headers.get('webhook-signature') ?? '',
        }) as EmailPayload;
      } catch (_err) {
        console.error('[send-auth-email] rejected request with missing/invalid hook signature');
        return jsonResponse({ error: 'Invalid signature' }, 401);
      }
    } else {
      console.error('[send-auth-email] SEND_EMAIL_HOOK_SECRET is not set — requests are NOT authenticated. Configure the secret to close audit finding SEC-04.');
      payload = JSON.parse(rawBody) as EmailPayload;
    }

    const { user, email_data } = payload;
    const { email_action_type, token_hash, redirect_to } = email_data;

    const params = new URLSearchParams({ token: token_hash, type: email_action_type, redirect_to });
    const confirmUrl = `${SUPABASE_URL}/auth/v1/verify?${params}`;

    let subject: string;
    let html: string;

    switch (email_action_type) {
      case 'signup':
        subject = 'Confirm your email — Hangar Marketplace';
        html = layout(`
          <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">Confirm your email address</h1>
          <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">
            Thanks for signing up for Hangar Marketplace. Click the button below to verify your email address and activate your account.
          </p>
          ${btn('Confirm my email →', confirmUrl)}
          <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:20px 0 0;">
            If you didn't create an account, you can safely ignore this email.<br/>This link expires in 24 hours.
          </p>
        `);
        break;

      case 'magiclink':
        subject = 'Your sign-in link — Hangar Marketplace';
        html = layout(`
          <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">Your sign-in link</h1>
          <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">
            Click the button below to sign in to Hangar Marketplace. No password needed.
          </p>
          ${btn('Sign in to Hangar Marketplace →', confirmUrl)}
          <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:20px 0 0;">
            If you didn't request this link, you can safely ignore this email.<br/>This link expires in 1 hour and can only be used once.
          </p>
        `);
        break;

      case 'recovery':
        subject = 'Reset your password — Hangar Marketplace';
        html = layout(`
          <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">Reset your password</h1>
          <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">
            We received a request to reset the password for your Hangar Marketplace account. Click the button below to choose a new one.
          </p>
          ${btn('Reset my password →', confirmUrl)}
          <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:20px 0 0;">
            If you didn't request a password reset, you can safely ignore this email — your password will not change.<br/>This link expires in 1 hour.
          </p>
        `);
        break;

      case 'email_change':
        subject = 'Confirm your new email — Hangar Marketplace';
        html = layout(`
          <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">Confirm your new email</h1>
          <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">
            Click the button below to confirm your new email address for Hangar Marketplace.
          </p>
          ${btn('Confirm new email →', confirmUrl)}
          <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:20px 0 0;">
            If you didn't request this change, please contact us at hello@hangarmarketplace.com.
          </p>
        `);
        break;

      default:
        return jsonResponse({ error: 'Unknown email type' }, 400);
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: [user.email], subject, html }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[send-auth-email] Resend error:', err);
      return jsonResponse({ error: err }, 500);
    }

    return jsonResponse({});
  } catch (err) {
    console.error('[send-auth-email] Unexpected error:', err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
