export interface DailyStats {
  date: string // YYYY-MM-DD
  breaksCompleted: number
  waterCount: number
  medicinesTaken: string[] // ids of medicines marked as taken today
}

export interface Medicine {
  id: string
  name: string
  dose: string // free text, e.g. "1 tablet after lunch"
  time: string // HH:MM, 24h local time
  enabled: boolean
}

export interface Settings {
  breakEnabled: boolean
  breakIntervalMinutes: number
  breakDurationSeconds: number
  breakMessages: string[]
  waterEnabled: boolean
  waterIntervalMinutes: number
  waterGoalCount: number
  waterMessages: string[]
  medicineEnabled: boolean
  medicines: Medicine[]
  stats: DailyStats
}

export const DEFAULT_BREAK_MESSAGES = [
  "Time to stretch! Your spine will thank you ✨",
  "Get up and walk for 2 minutes — you've earned it 🌟",
  "Little break, big difference. Stand up! 🌸",
  "Your back called — it wants a 2 minute walk 🚶",
  "Screen break time! Shake those legs 💃"
]

export const DEFAULT_WATER_MESSAGES = [
  "Sip o'clock! Grab some water 💧",
  "Hydration check — drink a glass of water 🌊",
  "Water break! Your body needs it 💙"
]

// Local calendar date (not UTC) so stats roll over at the user's midnight.
export function todayKey(): string {
  const d = new Date()
  const pad = (n: number): string => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function emptyStats(): DailyStats {
  return { date: todayKey(), breaksCompleted: 0, waterCount: 0, medicinesTaken: [] }
}

export function defaultSettings(): Settings {
  return {
    breakEnabled: true,
    breakIntervalMinutes: 60,
    breakDurationSeconds: 120,
    breakMessages: DEFAULT_BREAK_MESSAGES,
    waterEnabled: true,
    waterIntervalMinutes: 45,
    waterGoalCount: 8,
    waterMessages: DEFAULT_WATER_MESSAGES,
    medicineEnabled: true,
    medicines: [],
    stats: emptyStats()
  }
}

export interface MedicineReminderPayload {
  id: string
  name: string
  dose: string
  message: string
}

export const MEDICINE_MESSAGES = [
  'Medicine time! Take it now, future you says thanks 💊',
  'Gentle nudge: time for your medicine 🌿',
  'Health first — grab your medicine 💜'
]

export interface TimerStatus {
  breakEnabled: boolean
  waterEnabled: boolean
  msUntilNextBreak: number
  msUntilNextWater: number
}

export const IPC = {
  GET_SETTINGS: 'settings:get',
  UPDATE_SETTINGS: 'settings:update',
  GET_STATUS: 'status:get',
  LOG_WATER: 'water:log',
  SET_MEDICINE_TAKEN: 'medicine:setTaken',
  MEDICINE_REMINDER: 'medicine:reminder',
  BREAK_DONE: 'break:done',
  SNOOZE_PAUSE_TOGGLE: 'break:pauseToggle',
  STATUS_CHANGED: 'status:changed',
  SETTINGS_CHANGED: 'settings:changed',
  SHOW_BREAK_OVERLAY: 'overlay:show',
  WATER_REMINDER: 'water:reminder'
} as const
