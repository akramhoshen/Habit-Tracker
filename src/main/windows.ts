import { join } from 'path'
import { BrowserWindow, screen } from 'electron'
import { buildAppIcon } from './icon'

const isDev = !!process.env['ELECTRON_RENDERER_URL']

function rendererUrl(page: 'index' | 'overlay'): string {
  if (isDev) {
    return `${process.env['ELECTRON_RENDERER_URL']}/${page}.html`
  }
  return join(__dirname, `../renderer/${page}.html`)
}

let dashboardWindow: BrowserWindow | null = null

export function createDashboardWindow(): BrowserWindow {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.show()
    dashboardWindow.focus()
    return dashboardWindow
  }

  dashboardWindow = new BrowserWindow({
    width: 980,
    height: 700,
    minWidth: 760,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#12121c',
    icon: buildAppIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  dashboardWindow.on('ready-to-show', () => dashboardWindow?.show())

  dashboardWindow.on('close', (e) => {
    // Keep the app alive in the tray instead of fully quitting on window close
    e.preventDefault()
    dashboardWindow?.hide()
  })

  const url = rendererUrl('index')
  if (isDev) {
    dashboardWindow.loadURL(url)
  } else {
    dashboardWindow.loadFile(url)
  }

  return dashboardWindow
}

export function getDashboardWindow(): BrowserWindow | null {
  return dashboardWindow
}

let overlayWindows: BrowserWindow[] = []

export function createOverlayWindows(): BrowserWindow[] {
  closeOverlayWindows()

  const displays = screen.getAllDisplays()
  overlayWindows = displays.map((display) => {
    const win = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      frame: false,
      fullscreenable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      closable: false,
      minimizable: false,
      maximizable: false,
      backgroundColor: '#0b0b14',
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    win.setAlwaysOnTop(true, 'screen-saver')
    win.on('ready-to-show', () => {
      // re-assert bounds right before showing: on Windows, native fullscreen/
      // maximize transitions can otherwise snap the window back to the
      // primary display instead of the target monitor
      win.setBounds(display.bounds)
      win.show()
    })
    win.on('close', (e) => e.preventDefault())

    const url = rendererUrl('overlay')
    if (isDev) {
      win.loadURL(url)
    } else {
      win.loadFile(url)
    }

    return win
  })

  return overlayWindows
}

export function closeOverlayWindows(): void {
  for (const win of overlayWindows) {
    if (!win.isDestroyed()) {
      win.destroy()
    }
  }
  overlayWindows = []
}

export function getOverlayWindows(): BrowserWindow[] {
  return overlayWindows
}
