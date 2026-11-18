import { Medicine, Settings, todayKey } from '../shared/types'

const CHECK_EVERY_MS = 15 * 1000
const REPEAT_EVERY_MS = 15 * 60 * 1000 // nag again until it's marked as taken
const MAX_REMINDERS = 4 // initial reminder + 3 repeats
const MAX_LATE_MINUTES = 180 // don't surface a dose that is hours overdue after a late app start

interface FireState {
  lastFiredAt: number
  count: number
}

function minutesOfDay(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/**
 * Fires a reminder when a medicine's time-of-day is reached and repeats it
 * every 15 min (up to 4 times) until the dose is marked as taken. If the app
 * starts after a dose's time (within 3 h), the dose is still reminded.
 */
export class MedicineReminder {
  private timer: NodeJS.Timeout | null = null
  // keyed by `${date}|${id}|${time}` so editing a time re-arms the reminder
  private fired = new Map<string, FireState>()

  constructor(
    private getSettings: () => Settings,
    private onDue: (medicine: Medicine) => void
  ) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => this.check(), CHECK_EVERY_MS)
    this.check()
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  /** Call after settings change so a new/edited dose is evaluated immediately. */
  recheck(): void {
    this.check()
  }

  private check(): void {
    const settings = this.getSettings()
    if (!settings.medicineEnabled) return

    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const today = todayKey()
    const taken = new Set(settings.stats.medicinesTaken)

    // drop state from previous days
    for (const key of this.fired.keys()) {
      if (!key.startsWith(today)) this.fired.delete(key)
    }

    for (const med of settings.medicines) {
      if (!med.enabled || taken.has(med.id)) continue
      const dueMin = minutesOfDay(med.time)
      if (dueMin === null || nowMin < dueMin || nowMin - dueMin > MAX_LATE_MINUTES) continue

      const key = `${today}|${med.id}|${med.time}`
      const state = this.fired.get(key)
      if (state) {
        if (state.count >= MAX_REMINDERS) continue
        if (Date.now() - state.lastFiredAt < REPEAT_EVERY_MS) continue
      }
      this.fired.set(key, { lastFiredAt: Date.now(), count: (state?.count ?? 0) + 1 })
      this.onDue(med)
    }
  }
}
