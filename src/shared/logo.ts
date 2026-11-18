/**
 * Habit Tracker logo, drawn procedurally on a 100x100 design grid.
 *
 * Meaning:
 *  - the gradient ring is the hourly cycle; its small gap is "your break"
 *  - the pink dot sitting in that gap is the medicine pill
 *  - the droplet in the middle is hydration / health
 *
 * Keep the geometry in sync with src/renderer/src/components/Logo.tsx (SVG version).
 */

type RGB = [number, number, number]

const VIOLET: RGB = [139, 92, 246]
const TEAL: RGB = [45, 212, 191]
const PINK: RGB = [244, 114, 182]
const BG_TOP: RGB = [30, 30, 54]
const BG_BOTTOM: RGB = [12, 12, 24]
const DROP_TOP: RGB = [125, 211, 252]
const DROP_BOTTOM: RGB = [45, 212, 191]

const RING_R = 34
const RING_HALF = 4 // half of the 8-unit stroke
const ARC_DEG = 300 // sweep of the bright arc, starting at 12 o'clock going clockwise
const BG_RADIUS = 22

const E1 = [50, 16] as const // arc start (top)
const E2 = [20.56, 33] as const // arc end (upper left)
const PILL = [33, 20.56, 5] as const // x, y, r — sits in the middle of the gap

const DROP_C = [50, 57, 13] as const // bottom circle
const DROP_TIP = [50, 32] as const
const DROP_T1 = [61.1, 50.2] as const
const DROP_T2 = [38.9, 50.2] as const

const mix = (a: RGB, b: RGB, t: number): RGB => {
  const k = Math.min(1, Math.max(0, t))
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
}

function inRoundedRect(x: number, y: number): boolean {
  const r = BG_RADIUS
  if (x < 0 || y < 0 || x > 100 || y > 100) return false
  const cx = x < r ? r : x > 100 - r ? 100 - r : x
  const cy = y < r ? r : y > 100 - r ? 100 - r : y
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

function inCircle(x: number, y: number, cx: number, cy: number, r: number): boolean {
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

function inTriangle(
  x: number,
  y: number,
  a: readonly [number, number],
  b: readonly [number, number],
  c: readonly [number, number]
): boolean {
  const s = (p: readonly [number, number], q: readonly [number, number]): number =>
    (x - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (y - q[1])
  const d1 = s(a, b)
  const d2 = s(b, c)
  const d3 = s(c, a)
  const neg = d1 < 0 || d2 < 0 || d3 < 0
  const pos = d1 > 0 || d2 > 0 || d3 > 0
  return !(neg && pos)
}

/** Shade a single point of the design grid; returns RGBA (0-255) or null if transparent. */
function shade(x: number, y: number): [number, number, number, number] | null {
  if (!inRoundedRect(x, y)) return null

  let color: RGB = mix(BG_TOP, BG_BOTTOM, y / 100)
  const over = (c: RGB, alpha: number): void => {
    color = mix(color, c, alpha)
  }

  const dx = x - 50
  const dy = y - 50
  const dist = Math.hypot(dx, dy)

  // faint full ring "track"
  if (Math.abs(dist - RING_R) <= RING_HALF) over([255, 255, 255], 0.1)

  // bright gradient arc with round caps
  let inArc = inCircle(x, y, E1[0], E1[1], RING_HALF) || inCircle(x, y, E2[0], E2[1], RING_HALF)
  if (!inArc && Math.abs(dist - RING_R) <= RING_HALF) {
    const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360
    inArc = deg <= ARC_DEG
  }
  if (inArc) over(mix(VIOLET, TEAL, (x - 16) / 68), 1)

  // medicine pill dot in the gap
  if (inCircle(x, y, PILL[0], PILL[1], PILL[2])) over(PINK, 1)

  // droplet
  const inDrop =
    inCircle(x, y, DROP_C[0], DROP_C[1], DROP_C[2]) ||
    inTriangle(x, y, DROP_TIP, DROP_T1, DROP_T2)
  if (inDrop) {
    over(mix(DROP_TOP, DROP_BOTTOM, (y - 32) / 38), 1)
    if (inCircle(x, y, 45.5, 55, 3.6)) over([255, 255, 255], 0.55) // shine
  }

  return [color[0], color[1], color[2], 255]
}

/** Renders the logo to a straight-alpha RGBA buffer (size*size*4), 4x4 supersampled. */
export function renderLogoRGBA(size: number): Uint8Array {
  const out = new Uint8Array(size * size * 4)
  const SS = 4
  const scale = 100 / size
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = shade((px + (sx + 0.5) / SS) * scale, (py + (sy + 0.5) / SS) * scale)
          if (c) {
            r += c[0]
            g += c[1]
            b += c[2]
            a += 1
          }
        }
      }
      const i = (py * size + px) * 4
      if (a > 0) {
        out[i] = Math.round(r / a)
        out[i + 1] = Math.round(g / a)
        out[i + 2] = Math.round(b / a)
        out[i + 3] = Math.round((a / (SS * SS)) * 255)
      }
    }
  }
  return out
}
