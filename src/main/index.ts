import { app, Tray, Menu, ipcMain, Notification } from 'electron'
import {
  createDashboardWindow,
  getDashboardWindow,
  createOverlayWindows,
  closeOverlayWindows
} from './windows'
import {
  getSettings,
  updateSettings,
  incrementBreakCompleted,
  incrementWater,
  setMedicineTaken
} from './store'
import { Scheduler } from './scheduler'
import { MedicineReminder } from './medicine'
import { buildAppIcon } from './icon'
import {
  IPC,
  MEDICINE_MESSAGES,
  Medicine,
  MedicineReminderPayload,
  Settings
} from '../shared/types'

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

let tray: Tray | null = null
let breakActiveTimeout: NodeJS.Timeout | null = null

const scheduler = new Scheduler({
  onBreak: triggerBreak,
  onWater: triggerWater
})

const medicineReminder = new MedicineReminder(getSettings, triggerMedicine)
// hold references so Windows toast click handlers aren't garbage-collected
const liveNotifications = new Set<Notification>()

function pickRandom(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)] ?? 'Time for a break!'
}

function broadcastStatus(): void {
  const status = scheduler.getStatus(getSettings())
  getDashboardWindow()?.webContents.send(IPC.STATUS_CHANGED, status)
}

function broadcastSettings(settings: Settings): void {
  getDashboardWindow()?.webContents.send(IPC.SETTINGS_CHANGED, settings)
}

function triggerBreak(): void {
  const settings = getSettings()
  if (!settings.breakEnabled) return

  const message = pickRandom(settings.breakMessages)
  const windows = createOverlayWindows()
  for (const win of windows) {
    win.webContents.once('did-finish-load', () => {
      win.webContents.send(IPC.SHOW_BREAK_OVERLAY, {
        message,
        durationSeconds: settings.breakDurationSeconds
      })
    })
  }

  if (breakActiveTimeout) clearTimeout(breakActiveTimeout)
  breakActiveTimeout = setTimeout(() => {
    finishBreak()
  }, settings.breakDurationSeconds * 1000)
}

function finishBreak(): void {
  if (breakActiveTimeout) {
    clearTimeout(breakActiveTimeout)
    breakActiveTimeout = null
  }
  closeOverlayWindows()
  const next = incrementBreakCompleted()
  broadcastSettings(next)
}

function triggerWater(): void {
  const settings = getSettings()
  if (!settings.waterEnabled) return

  const message = pickRandom(settings.waterMessages)
  if (Notification.isSupported()) {
    new Notification({
      title: 'Hydration time 💧',
      body: message,
      icon: buildAppIcon()
    }).show()
  }
  getDashboardWindow()?.webContents.send(IPC.WATER_REMINDER, message)
}

function triggerMedicine(medicine: Medicine): void {
  const label = medicine.dose ? `${medicine.name} — ${medicine.dose}` : medicine.name
  const payload: MedicineReminderPayload = {
    id: medicine.id,
    name: medicine.name,
    dose: medicine.dose,
    message: pickRandom(MEDICINE_MESSAGES)
  }

  if (Notification.isSupported()) {
    const n = new Notification({
      title: `Medicine time 💊 ${medicine.name}`,
      body: `${payload.message}\n${label}`,
      icon: buildAppIcon(),
      urgency: 'critical'
    })
    liveNotifications.add(n)
    n.on('click', () => createDashboardWindow())
    n.on('close', () => liveNotifications.delete(n))
    n.show()
  }
  getDashboardWindow()?.webContents.send(IPC.MEDICINE_REMINDER, payload)
}

function registerIpc(): void {
  ipcMain.handle(IPC.GET_SETTINGS, () => getSettings())

  ipcMain.handle(IPC.UPDATE_SETTINGS, (_e, partial: Partial<Settings>) => {
    const next = updateSettings(partial)
    scheduler.applySettings(next)
    medicineReminder.recheck()
    broadcastSettings(next)
    return next
  })

  ipcMain.handle(IPC.SET_MEDICINE_TAKEN, (_e, id: string, taken: boolean) => {
    const next = setMedicineTaken(id, taken)
    broadcastSettings(next)
    return next
  })

  ipcMain.handle(IPC.GET_STATUS, () => scheduler.getStatus(getSettings()))

  ipcMain.handle(IPC.LOG_WATER, () => {
    const next = incrementWater()
    broadcastSettings(next)
    return next
  })

  ipcMain.on(IPC.BREAK_DONE, () => finishBreak())
}

function createTray(): void {
  tray = new Tray(buildAppIcon(32))
  tray.setToolTip('Habit Tracker')

  const refreshMenu = (): void => {
    const settings = getSettings()
    const menu = Menu.buildFromTemplate([
      { label: 'Open Dashboard', click: () => createDashboardWindow() },
      { type: 'separator' },
      {
        label: settings.breakEnabled ? 'Pause break reminders' : 'Resume break reminders',
        click: () => {
          const next = updateSettings({ breakEnabled: !settings.breakEnabled })
          scheduler.applySettings(next)
          broadcastSettings(next)
          refreshMenu()
        }
      },
      {
        label: 'Log a glass of water now',
        click: () => broadcastSettings(incrementWater())
      },
      { type: 'separator' },
      { label: 'Quit Habit Tracker', click: () => app.exit(0) }
    ])
    tray?.setContextMenu(menu)
  }

  refreshMenu()
  tray.on('click', () => createDashboardWindow())
}

app.whenReady().then(() => {
  registerIpc()
  createTray()
  createDashboardWindow()
  scheduler.applySettings(getSettings())
  medicineReminder.start()
  setInterval(broadcastStatus, 1000)

  app.on('activate', () => createDashboardWindow())
})

app.on('second-instance', () => createDashboardWindow())

app.on('window-all-closed', () => {
  // The app lives in the tray; only the tray's Quit action should end it.
})

app.on('before-quit', () => closeOverlayWindows())
