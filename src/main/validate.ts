import { Medicine, Settings } from '../shared/types'

/**
 * Everything the renderer sends over IPC is untrusted input. This turns an
 * arbitrary value into a safe, bounded settings patch: unknown keys (including
 * `stats`) are dropped, numbers are clamped, strings are trimmed and length-capped.
 * The caps also stop a bad value from e.g. locking the screen for hours.
 */

const MAX_MESSAGES = 100
const MAX_MESSAGE_LEN = 200
const MAX_MEDICINES = 50
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/

function int(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.min(max, Math.max(min, Math.round(value)))
}

function bool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function messages(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const list = value
    .filter((m): m is string => typeof m === 'string')
    .map((m) => m.trim().slice(0, MAX_MESSAGE_LEN))
    .filter(Boolean)
    .slice(0, MAX_MESSAGES)
  return list.length > 0 ? list : undefined // never leave a reminder with no message
}

function medicines(value: unknown): Medicine[] | undefined {
  if (!Array.isArray(value)) return undefined
  const seen = new Set<string>()
  const out: Medicine[] = []
  for (const raw of value.slice(0, MAX_MEDICINES)) {
    if (typeof raw !== 'object' || raw === null) continue
    const m = raw as Record<string, unknown>
    if (typeof m.id !== 'string' || !ID_RE.test(m.id) || seen.has(m.id)) continue
    if (typeof m.time !== 'string' || !TIME_RE.test(m.time)) continue
    seen.add(m.id)
    out.push({
      id: m.id,
      name: (typeof m.name === 'string' ? m.name.trim().slice(0, 80) : '') || 'Medicine',
      dose: typeof m.dose === 'string' ? m.dose.trim().slice(0, 200) : '',
      time: m.time,
      enabled: m.enabled !== false
    })
  }
  return out
}

export function sanitizeSettingsPatch(input: unknown): Partial<Settings> {
  if (typeof input !== 'object' || input === null) return {}
  const src = input as Record<string, unknown>
  const patch: Partial<Settings> = {}

  const set = <K extends keyof Settings>(key: K, value: Settings[K] | undefined): void => {
    if (value !== undefined) patch[key] = value
  }

  set('breakEnabled', bool(src.breakEnabled))
  set('breakIntervalMinutes', int(src.breakIntervalMinutes, 5, 1440))
  set('breakDurationSeconds', int(src.breakDurationSeconds, 30, 1800))
  set('breakMessages', messages(src.breakMessages))
  set('waterEnabled', bool(src.waterEnabled))
  set('waterIntervalMinutes', int(src.waterIntervalMinutes, 5, 1440))
  set('waterGoalCount', int(src.waterGoalCount, 1, 50))
  set('waterMessages', messages(src.waterMessages))
  set('medicineEnabled', bool(src.medicineEnabled))
  set('medicines', medicines(src.medicines))
  return patch
}

export function isValidMedicineId(value: unknown): value is string {
  return typeof value === 'string' && ID_RE.test(value)
}
