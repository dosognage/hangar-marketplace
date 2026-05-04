/**
 * Image-format sniffer used by every server-side upload endpoint.
 *
 * BACKGROUND
 *
 * Browser-supplied `Content-Type` and filename extensions are user-
 * controlled — they can claim anything. Without server-side validation
 * an attacker can upload `evil.html` or `payload.svg` (with embedded
 * <script>) declaring `image/jpeg`, store it in our public bucket,
 * and trigger XSS when anyone fetches the URL (the storage layer
 * happily serves files with whatever Content-Type the client supplied).
 *
 * The fix is to read the first few bytes of the upload and verify they
 * match a known image-format header ("magic number"). Then we both:
 *   - Reject anything that doesn't sniff as an allowlisted image type.
 *   - Re-derive the Content-Type and file extension from the sniffed
 *     value, never from the request, so the storage layer always serves
 *     it as the format we verified.
 *
 * SVG is intentionally NOT in the allowlist. SVG is XML and can embed
 * <script> tags that execute when the file is rendered in a browser
 * context. Real users post photos, not vector art.
 */

/**
 * Allowlisted image formats and the leading bytes that identify each.
 * Add a new format only after verifying it can't carry executable
 * content when served as `image/*`.
 */
const SIGNATURES: Array<{ mime: string; ext: string; magic: number[] }> = [
  { mime: 'image/jpeg', ext: 'jpg',  magic: [0xff, 0xd8, 0xff] },
  { mime: 'image/png',  ext: 'png',  magic: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/webp', ext: 'webp', magic: [0x52, 0x49, 0x46, 0x46] }, // RIFF — secondary check below
  { mime: 'image/gif',  ext: 'gif',  magic: [0x47, 0x49, 0x46, 0x38] },
]

export type SniffedImage = { mime: string; ext: string }

/**
 * Verify a buffer is one of our allowlisted image formats and return
 * the canonical MIME + extension. Returns null when the bytes don't
 * match any allowed signature.
 */
export function sniffImage(buf: Buffer): SniffedImage | null {
  for (const { mime, ext, magic } of SIGNATURES) {
    if (buf.length < magic.length) continue
    let matches = true
    for (let i = 0; i < magic.length; i++) {
      if (buf[i] !== magic[i]) { matches = false; break }
    }
    if (!matches) continue

    // WebP needs a secondary check — the leading "RIFF" header is shared
    // with WAV and AVI containers. Bytes 8..11 must be ASCII "WEBP" for
    // it to be a real WebP image.
    if (mime === 'image/webp') {
      if (buf.length < 12) return null
      if (buf[8] !== 0x57 || buf[9] !== 0x45 || buf[10] !== 0x42 || buf[11] !== 0x50) continue
    }
    return { mime, ext }
  }
  return null
}

/**
 * Comma-separated MIME list, useful as a user-facing error message
 * ("Upload a JPG, PNG, WebP, or GIF.").
 */
export const ALLOWED_IMAGE_MIMES = SIGNATURES.map(s => s.mime)
