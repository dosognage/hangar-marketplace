/**
 * Aircraft fit checker.
 *
 * Compares an aircraft's published dimensions against a hangar's door + depth
 * dimensions and returns whether the aircraft fits, with optional clearance
 * buffers. No machine learning involved — it's a join.
 *
 * The buffers err generous: pilots don't taxi a plane through a 1-inch margin.
 * Defaults match common ramp practice (3 ft of wingspan clearance, 1 ft tail
 * clearance, 3 ft of depth clearance). Tweak per-call if you need stricter
 * or looser thresholds.
 */

export type AircraftDims = {
  wingspan_ft: number
  length_ft:   number
  height_ft:   number
}

export type HangarDims = {
  door_width:   number | null
  door_height:  number | null
  hangar_depth: number | null
}

export type FitVerdict =
  | { fits: 'unknown' }                   // missing dims on the listing
  | { fits: 'no'; reasons: string[] }
  | { fits: 'tight'; reasons: string[] }  // fits but with very little clearance
  | { fits: 'yes' }

const DEFAULT_BUFFERS = {
  wingspan_ft: 3,   // taxi clearance side-to-side
  height_ft:   1,   // tail / rotor clearance
  depth_ft:    3,   // nose-to-back-wall clearance
} as const

const TIGHT_BUFFERS = {
  wingspan_ft: 1,
  height_ft:   0.25,
  depth_ft:    1,
} as const

export function checkFit(
  aircraft: AircraftDims,
  hangar:   HangarDims,
  opts:     { buffers?: typeof DEFAULT_BUFFERS } = {},
): FitVerdict {
  const buf = opts.buffers ?? DEFAULT_BUFFERS

  // If the listing doesn't have door/depth data, we can't make a call.
  // Pass-through default — don't penalize incomplete data.
  if (hangar.door_width == null && hangar.door_height == null && hangar.hangar_depth == null) {
    return { fits: 'unknown' }
  }

  const reasons: string[] = []
  const tightReasons: string[] = []

  if (hangar.door_width != null) {
    const required = aircraft.wingspan_ft + buf.wingspan_ft
    if (aircraft.wingspan_ft > hangar.door_width) {
      reasons.push(
        `wingspan ${aircraft.wingspan_ft.toFixed(1)} ft exceeds door width ${hangar.door_width.toFixed(1)} ft`,
      )
    } else if (required > hangar.door_width) {
      tightReasons.push(`wingspan clears the door but with under ${buf.wingspan_ft} ft of buffer`)
    }
  }

  if (hangar.door_height != null) {
    const required = aircraft.height_ft + buf.height_ft
    if (aircraft.height_ft > hangar.door_height) {
      reasons.push(
        `tail height ${aircraft.height_ft.toFixed(1)} ft exceeds door height ${hangar.door_height.toFixed(1)} ft`,
      )
    } else if (required > hangar.door_height) {
      tightReasons.push(`tail height clears with under ${buf.height_ft} ft of buffer`)
    }
  }

  if (hangar.hangar_depth != null) {
    const required = aircraft.length_ft + buf.depth_ft
    if (aircraft.length_ft > hangar.hangar_depth) {
      reasons.push(
        `length ${aircraft.length_ft.toFixed(1)} ft exceeds hangar depth ${hangar.hangar_depth.toFixed(1)} ft`,
      )
    } else if (required > hangar.hangar_depth) {
      tightReasons.push(`length clears with under ${buf.depth_ft} ft of buffer`)
    }
  }

  if (reasons.length > 0) return { fits: 'no', reasons }
  if (tightReasons.length > 0) return { fits: 'tight', reasons: tightReasons }
  return { fits: 'yes' }
}

/**
 * Convenience wrapper for the homepage filter: "include this listing in
 * results when filter is on?" — tight fits and unknowns are kept; only
 * confirmed nope listings get hidden.
 */
export function listingPassesFitFilter(
  aircraft: AircraftDims | null,
  hangar:   HangarDims,
): boolean {
  if (!aircraft) return true
  const verdict = checkFit(aircraft, hangar)
  return verdict.fits !== 'no'
}
