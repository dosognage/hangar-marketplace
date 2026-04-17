/**
 * Utility functions for feet/inches dimension formatting and conversion.
 * Pure functions — safe to import in both server and client components.
 */

/** Parse decimal feet into whole feet + whole inches */
export function decimalToFtIn(decimal: number | string | null | undefined): { ft: string; ins: string } {
  const num = (decimal !== null && decimal !== undefined && decimal !== '') ? Number(decimal) : null
  if (num === null || isNaN(num) || num <= 0) return { ft: '', ins: '' }
  const ft = Math.floor(num)
  let inches = Math.round((num - ft) * 12)
  if (inches === 12) return { ft: String(ft + 1), ins: '' }
  return { ft: String(ft), ins: inches > 0 ? String(inches) : '' }
}

/** Convert feet + inches strings to a decimal-feet string (for form state / hidden inputs) */
export function ftInToDecimal(ft: string, ins: string): string {
  const f = parseFloat(ft) || 0
  const i = parseFloat(ins) || 0
  if (!ft && !ins) return ''
  return String(f + i / 12)
}

/** Format a decimal-feet number as e.g. "40′ 6″" or "40′" for display */
export function formatFtIn(decimal: number | null | undefined): string {
  if (decimal == null || decimal <= 0) return '?'
  const ft = Math.floor(decimal)
  let inches = Math.round((decimal - ft) * 12)
  if (inches === 12) return `${ft + 1}′`
  if (inches === 0) return `${ft}′`
  return `${ft}′ ${inches}″`
}
