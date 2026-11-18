# CLAUDE.md — read this first

Orientation for Claude Code (or any new contributor) opening this project on a fresh device. Read this file, then `docs/PROJECT_LOG.md` for history and decisions. `README.md` is the public-facing description.

## What this is

**Habit Tracker**: an Electron + React + TypeScript **Windows desktop app** that lives in the tray. Core purpose: force a short break every hour (full-screen lock overlay), plus water reminders and medicine reminders. Local-only data, no backend, no telemetry. Owner: **Akram Hoshen**. Public repo: https://github.com/akramhoshen/Habit-Tracker (branch `main`).

Design direction: "tech but cute" (dark UI, violet/teal/pink accents, friendly emoji messages). Scope rule from the owner: build what is asked, don't over-build (no cloud sync / phone app unless asked; a phone app was once discussed as a *future* idea).

## Commands (PowerShell or bash)

```
npm install
npm run dev          # needs ELECTRON_RUN_AS_NODE to be UNSET, otherwise electron.app is undefined
npm run typecheck    # tsc for main (tsconfig.node.json) and renderer (tsconfig.web.json)
npm run build        # electron-vite build -> out/
npm run icons        # export build/icon.ico/png + resources/logo.png from src/shared/logo.ts
npm run dist:win     # icons + build + electron-builder -> dist/Habit Tracker Setup <version>.exe
```

Node must be >= 22.12 (Vite 8 / electron-vite 6). After a fresh `npm install` check that `node_modules/electron/dist` exists; if not run `node node_modules/electron/install.js` (the Electron postinstall sometimes doesn't run). Python is not installed on the owner's machine; use Node/bash for scripts.

## Architecture map

| Path | Role |
|---|---|
| `src/main/index.ts` | App entry: single-instance lock, tray, IPC registration (`handle()` wrapper), break/water/medicine triggers, quit handling (`stopBackgroundWork`), login item, AppUserModelID |
| `src/main/scheduler.ts` | Break + water interval timers. `applySettings` only restarts a timer when *its own* config changed |
| `src/main/medicine.ts` | `MedicineReminder`: checks every 15 s; fires at a dose's time, repeats every 15 min (max 4) until taken; skips doses > 3 h late |
| `src/main/windows.ts` | Dashboard window (hides on close), one overlay window per monitor, `sendToDashboard()` (safe send), shared secure `webPreferences` |
| `src/main/store.ts` | electron-store v8 wrapper, daily stats rollover (local date), migrations for older saved data |
| `src/main/validate.ts` | `sanitizeSettingsPatch()` — all renderer input is untrusted; clamps/whitelists. Update it whenever `Settings` gains a field |
| `src/main/icon.ts` | Builds the app/tray icon at runtime from `src/shared/logo.ts` |
| `src/preload/index.ts` | `window.api` (contextBridge). Types in `index.d.ts` |
| `src/renderer/src/App.tsx` | Dashboard UI (stat tiles, break/water/medicine cards, footer) |
| `src/renderer/src/Overlay.tsx` | The lock-screen overlay |
| `src/shared/types.ts` | `Settings`, defaults, `IPC` channel names, shared types |
| `src/shared/logo.ts` | Procedural logo renderer (SDF, 100x100 grid). `components/Logo.tsx` is the SVG twin — keep geometry in sync |
| `src/shared/about.ts` | Author, contact email, `APP_ID`, copyright text (single source of truth) |

Settings are stored at `%APPDATA%\habit-tracker\config.json`.

## Adding a setting (checklist)

1. Add the field + default in `src/shared/types.ts`.
2. Add validation in `src/main/validate.ts` (`sanitizeSettingsPatch`) — otherwise the renderer's value is silently dropped.
3. Use it in main (scheduler/index) and/or the UI (`App.tsx`). New top-level keys get their default automatically from electron-store; nested data (like `stats`) needs a migration in `store.ts`.

## Security rules already in force (don't regress)

Sandboxed renderer + context isolation; IPC only from the dashboard `webContents`; input sanitised in `validate.ts`; CSP in both HTML files; popups/webviews/navigation blocked; all permission requests denied; `ELECTRON_RENDERER_URL` honoured only when `!app.isPackaged`; Electron fuses set via `build.electronFuses`; no unlock/"break done" IPC exists on purpose.

## Gotchas learned the hard way

- **Quit must stop timers first** (`stopBackgroundWork()`), otherwise the 1 s status timer sends to destroyed windows -> "Object has been destroyed" crash dialog.
- **`electronDist`** in `package.json` points at `node_modules/electron/dist` so `npm run dist:win` does not download anything from GitHub (one GitHub CDN IP intermittently times out on the owner's network).
- **Changing `appId`** makes Windows treat the installer as a different app; uninstall the old one first. The appId must match `APP_ID` in `src/shared/about.ts` (it names the notifications; without it toasts say "electron.app.Habit Tracker").
- Start-with-Windows registers `--hidden`; it is skipped when unpackaged so dev never registers `electron.exe`. Smoke-testing the packaged exe writes a Run-key entry named after the appId — delete it afterwards.
- Windows symlink privilege can break electron-builder's winCodeSign extraction on older versions; with electron-builder 26 it worked. Enabling Developer Mode is the clean fix if it returns.
- electron-store must stay on **v8.x** (v10+ is ESM-only and breaks the CJS main bundle).
- `scripts/make-icons.cjs` bundles `src/shared/logo.ts` with esbuild on the fly and uses `zlib.crc32` (Node 22+).

## Verification approach that works here

Build the packaged app (`npm run dist:win` or `npx electron-builder --win --dir`), launch `dist/win-unpacked/Habit Tracker.exe` with `--user-data-dir=<temp> --remote-debugging-port=9333` (separate profile so the owner's real data and single-instance lock are untouched), and drive the dashboard over the Chrome DevTools protocol (Node 22 has a global `WebSocket`). Check window visibility with `(Get-Process).MainWindowHandle`. Prefer functional proof over screenshots.

## Working agreements with the owner

- The owner writes in **Banglish** (Bengali in Latin script); reply in the same style, keep answers short and concrete.
- **Ask before committing/pushing**; they usually approve per batch. Commit identity: `Akram Hoshen <74672921+akramhoshen@users.noreply.github.com>` (set in local git config only, never global). Commit messages end with the Claude co-author trailer.
- **The repo is public**: never commit personal/medical details, real medicine names, or put the contact email in UI text. The email lives only in `src/shared/about.ts` and is opened via a fixed-address IPC (`OPEN_CONTACT`).
- After changes, rebuild the installer (`npm run dist:win`) so the owner can reinstall; tell them to Quit the tray app and uninstall the old version if the appId changed.

## Open items / ideas

- Water reminders can still fire while the break overlay is showing (not yet suppressed).
- Installer is unsigned (SmartScreen warning); needs a code-signing certificate to fix.
- `npm audit` shows only dev-tooling ReDoS (`picomatch` & friends, no patched version yet); production dependencies are clean.
- Possible features if asked: snooze for medicine, weekly stats/history, sound, auto-update, README screenshots.
