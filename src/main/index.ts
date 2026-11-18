import { app, Tray, Menu, ipcMain, Notification, session, IpcMainInvokeEvent } from 'electron'
import { sanitizeSettingsPatch, isValidMedicineId } from './validate'
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

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

// Lock down every web contents we ever create (dashboard + overlays): no popups,
// no webviews, and no navigating away from the bundled page.
app.on('web-contents-created', (_e, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
  contents.on('will-attach-webview', (e) => e.preventDefault())
  contents.on('will-navigate', (e, url) => {
    if (url !== contents.getURL()) e.preventDefault() // allow reload, block everything else
  })
})

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

// Only the dashboard window may talk to the main process; the lock overlay only
// listens. Everything arriving here is validated before it touches the store.
function handle<A extends unknown[], R>(
  channel: string,
  fn: (...args: A) => R
): void {
  ipcMain.handle(channel, (e: IpcMainInvokeEvent, ...args: unknown[]) => {
    const dashboard = getDashboardWindow()
    if (!dashboard || e.sender !== dashboard.webContents) {
      throw new Error('Untrusted IPC sender')
    }
    return fn(...(args as A))
  })
}

function registerIpc(): void {
  handle(IPC.GET_SETTINGS, () => getSettings())

  handle(IPC.UPDATE_SETTINGS, (partial: unknown) => {
    const next = updateSettings(sanitizeSettingsPatch(partial))
    scheduler.applySettings(next)
    medicineReminder.recheck()
    broadcastSettings(next)
    return next
  })

  handle(IPC.SET_MEDICINE_TAKEN, (id: unknown, taken: unknown) => {
    if (!isValidMedicineId(id) || typeof taken !== 'boolean') return getSettings()
    const next = setMedicineTaken(id, taken)
    broadcastSettings(next)
    return next
  })

  handle(IPC.GET_STATUS, () => scheduler.getStatus(getSettings()))

  handle(IPC.LOG_WATER, () => {
    const next = incrementWater()
    broadcastSettings(next)
    return next
  })
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
  if (!gotLock) return // a second copy is quitting; don't build a tray/windows
  // This app needs no camera/mic/location/etc. — deny every permission request.
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  session.defaultSession.setPermissionCheckHandler(() => false)
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
