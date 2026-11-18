# Habit Tracker

A small, friendly desktop app that keeps you healthy while you work at the computer. It lives in the system tray and:

- **Locks the screen for a short break every hour** (full-screen overlay on every monitor, cute message, countdown) so you actually stand up and move.
- **Reminds you to drink water** with gentle notifications and tracks a daily goal.
- **Reminds you to take your medicine** at set times of the day, and keeps nudging every 15 minutes until you mark it as taken.
- **Starts with Windows**, hidden in the tray, so the reminders are always on.

Everything is stored **locally on your PC**. There is no account, no cloud and no telemetry.

> Windows is the supported platform. The break overlay is intentionally hard to dismiss: it unlocks by itself when the timer ends.

## Features

| | |
|---|---|
| Break reminders | Interval and lock duration configurable, random cute messages you can edit, multi-monitor |
| Water reminders | Interval, daily goal, "log a glass" button (also in the tray menu), editable messages |
| Medicine reminders | Any number of medicines, each with a time, dose/note, on/off switch and a "mark taken" button |
| Daily stats | Breaks completed, water glasses and medicines taken today (reset at local midnight) |
| Tray app | Closing the window keeps it running; pause/resume breaks and log water from the tray menu |
| Start with Windows | On by default, can be switched off in the dashboard header |

## Install (Windows)

Build the installer yourself (see below) and run `dist/Habit Tracker Setup 0.1.0.exe`. It is a one-click, per-user install (no admin rights needed).

The installer is **not code-signed**, so Windows SmartScreen may show "Windows protected your PC". Click **More info → Run anyway**.

If you are replacing a version that was installed under a different app id, uninstall the old one first (and Quit it from the tray).

## Develop

Requirements: **Node.js 22.12 or newer** and npm.

```bash
npm install
npm run dev          # start the app with hot reload
npm run typecheck    # TypeScript checks for main + renderer
npm run build        # production build into ./out
npm run icons        # regenerate build/icon.ico + PNGs from src/shared/logo.ts
npm run dist:win     # build the Windows installer into ./dist
```

If the app opens as a plain Node process when you run `npm run dev` (`electron.app` is undefined), make sure the `ELECTRON_RUN_AS_NODE` environment variable is **not** set.

## Tech stack

Electron 45 · React 18 · TypeScript · electron-vite (Vite 8) · electron-store · electron-builder (NSIS)

## Project layout

```
src/
  main/        Electron main process: tray, windows, schedulers, IPC, settings store, input validation
  preload/     contextBridge API exposed to the UI (window.api)
  renderer/    React UI: dashboard (index.html) and the break overlay (overlay.html)
  shared/      Types, defaults, IPC channel names, the logo renderer, app info
scripts/       Icon export script
build/         Generated installer icons
```

## Privacy and security

- Data (settings, medicines, today's stats) is stored in `%APPDATA%\habit-tracker\config.json` and never leaves your machine.
- The UI runs sandboxed with context isolation; the main process only accepts IPC calls from the dashboard window and validates/clamps every value it receives.
- Electron fuses are set in the packaged app (no `RunAsNode`, load app only from the signed asar, asar integrity validation).

## Contact

Use the **✉ Contact** button in the app's footer, or open a GitHub issue.

---

© 2026 Akram Hoshen. All rights reserved.
