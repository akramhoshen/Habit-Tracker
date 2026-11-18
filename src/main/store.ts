import Store from 'electron-store'
import { Settings, defaultSettings, emptyStats, todayKey } from '../shared/types'

const store = new Store<Settings>({
  defaults: defaultSettings()
})

export function getSettings(): Settings {
  const settings = store.store
  // roll stats over to a fresh day automatically
  if (settings.stats.date !== todayKey()) {
    settings.stats = emptyStats()
    store.store = settings
  } else if (!Array.isArray(settings.stats.medicinesTaken)) {
    // stats saved by an older version predate medicine tracking
    settings.stats.medicinesTaken = []
    store.store = settings
  }
  return settings
}

export function updateSettings(partial: Partial<Settings>): Settings {
  const current = getSettings()
  const next = { ...current, ...partial }
  store.store = next
  return next
}

export function incrementBreakCompleted(): Settings {
  const current = getSettings()
  current.stats.breaksCompleted += 1
  store.store = current
  return current
}

export function setMedicineTaken(id: string, taken: boolean): Settings {
  const current = getSettings()
  const set = new Set(current.stats.medicinesTaken)
  if (taken) set.add(id)
  else set.delete(id)
  current.stats.medicinesTaken = [...set]
  store.store = current
  return current
}

export function incrementWater(): Settings {
  const current = getSettings()
  current.stats.waterCount += 1
  store.store = current
  return current
}
