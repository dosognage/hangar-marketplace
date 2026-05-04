/**
 * Lightweight server-side validators for user-submitted strings.
 *
 * Each validator accepts loose user input and either returns a normalised
 * value or null when invalid. Use these BEFORE persisting to the DB or
 * interpolating into emails — they cap blast radius from malformed inputs
 * (oversized payloads, control characters) and provide a consistent
 * checkpoint for what we accept.
 *
 * Why not zod? These are tiny and have no schema relationship — pulling in
 * a parsing library for two regexes adds dependency surface for no win.
 */

/** Loose email validator. RFC-822 is famously hard to regex correctly;
 *  this matches what real users actually type and rejects only the most
 *  obviously broken cases. The real validation is the email arriving. */
export function validateEmail(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim().toLowerCase()
  if (trimmed.length < 6 || trimmed.length > 254) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null
}

/**
 * Phone validator + normaliser. Accepts the formats real users type:
 *   - 555-123-4567
 *   - (555) 123-4567
 *   - 555.123.4567
 *   - +1 555 123 4567
 *   - 5551234567
 *
 * Rules:
 *   - Must contain at least 7 digits (covers landlines without country code).
 *   - Must contain at most 15 digits (E.164 max).
 *   - Total length capped at 30 chars to bound email-template growth.
 *   - Allows digits, +, -, (, ), spaces, periods, and `x`/`ext` for extensions.
 *   - Anything else (HTML, scripts, control chars) rejected.
 *
 * Returns the trimmed input when valid, null otherwise. We deliberately
 * don't normalise to E.164 here because that's lossy (we'd strip
 * extensions) and the consumer can format on render.
 */
export function validatePhone(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (trimmed.length === 0 || trimmed.length > 30) return null

  // Reject control chars and anything outside our allowed set.
  // Allow: digits, +, -, parens, dots, spaces, x, ext
  if (!/^[\d+\-()\s.xext]+$/i.test(trimmed)) return null

  const digitCount = (trimmed.match(/\d/g) ?? []).length
  if (digitCount < 7 || digitCount > 15) return null

  return trimmed
}

/**
 * Trim + length-cap a free-text field (name, message, notes, etc.) and
 * reject empty/oversized values. Doesn't HTML-escape — that's a separate
 * concern. Returns the trimmed value when valid, null otherwise.
 */
export function validateText(
  input: string | null | undefined,
  opts: { min?: number; max?: number } = {},
): string | null {
  if (!input) return null
  const { min = 1, max = 5000 } = opts
  const trimmed = input.trim()
  if (trimmed.length < min || trimmed.length > max) return null
  return trimmed
}
