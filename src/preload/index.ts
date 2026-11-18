import { contextBridge, ipcRenderer } from 'electron'
import { IPC, MedicineReminderPayload, Settings, TimerStatus } from '../shared/types'

const api = {
  getSettings: (): Promise<Settings> => ipcRenderer.invoke(IPC.GET_SETTINGS),
  updateSettings: (partial: Partial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke(IPC.UPDATE_SETTINGS, partial),
  getStatus: (): Promise<TimerStatus> => ipcRenderer.invoke(IPC.GET_STATUS),
  logWater: (): Promise<Settings> => ipcRenderer.invoke(IPC.LOG_WATER),
  setMedicineTaken: (id: string, taken: boolean): Promise<Settings> =>
    ipcRenderer.invoke(IPC.SET_MEDICINE_TAKEN, id, taken),
  onMedicineReminder: (cb: (payload: MedicineReminderPayload) => void): (() => void) => {
    const listener = (_e: unknown, payload: MedicineReminderPayload): void => cb(payload)
    ipcRenderer.on(IPC.MEDICINE_REMINDER, listener)
    return () => ipcRenderer.removeListener(IPC.MEDICINE_REMINDER, listener)
  },

  onStatusChanged: (cb: (status: TimerStatus) => void): (() => void) => {
    const listener = (_e: unknown, status: TimerStatus): void => cb(status)
    ipcRenderer.on(IPC.STATUS_CHANGED, listener)
    return () => ipcRenderer.removeListener(IPC.STATUS_CHANGED, listener)
  },
  onSettingsChanged: (cb: (settings: Settings) => void): (() => void) => {
    const listener = (_e: unknown, settings: Settings): void => cb(settings)
    ipcRenderer.on(IPC.SETTINGS_CHANGED, listener)
    return () => ipcRenderer.removeListener(IPC.SETTINGS_CHANGED, listener)
  },
  onWaterReminder: (cb: (message: string) => void): (() => void) => {
    const listener = (_e: unknown, message: string): void => cb(message)
    ipcRenderer.on(IPC.WATER_REMINDER, listener)
    return () => ipcRenderer.removeListener(IPC.WATER_REMINDER, listener)
  },
  onShowBreakOverlay: (
    cb: (payload: { message: string; durationSeconds: number }) => void
  ): (() => void) => {
    const listener = (
      _e: unknown,
      payload: { message: string; durationSeconds: number }
    ): void => cb(payload)
    ipcRenderer.on(IPC.SHOW_BREAK_OVERLAY, listener)
    return () => ipcRenderer.removeListener(IPC.SHOW_BREAK_OVERLAY, listener)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
