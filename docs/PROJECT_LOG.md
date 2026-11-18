# Project log

Chronological record of what was built and why. Newest entries at the bottom; append a new dated entry after each meaningful batch of work. See `CLAUDE.md` for the current architecture and rules.

## 2026-10-13 — MVP

- Decided stack: Electron + React + TypeScript (so logic could later be shared with a React Native phone app). Local-only storage; cloud sync and a phone app explicitly deferred.
- Core feature: every hour a full-screen lock overlay for 2 minutes on every monitor, with a cute message and countdown, auto-dismissing. Admin dashboard to configure intervals, durations and messages.
- Water reminders (notification + dashboard toast), daily stats, tray app (closing the window keeps it running).
- Structure: `src/main` (scheduler, tray, store via electron-store v8), `src/preload`, `src/renderer` (dashboard + overlay), `src/shared/types.ts`.
- Note: electron-store v10+ is ESM-only and breaks electron-vite's CJS main bundle, so it stays on v8.

## 2026-11-17 — Medicine reminders, logo, installer

- Added **medicine reminders**: list of medicines (name, dose/note, `HH:MM` time, enabled, mark-taken). `MedicineReminder` fires at the time, repeats every 15 min up to 4 times until taken, skips doses more than 3 h late, "Medicine today" stat tile. Settings gained `medicineEnabled`, `medicines`, and `stats.medicinesTaken` (with a migration for older saved stats).
- Fixed along the way: stats rolled over at UTC midnight (now local); editing any setting restarted both countdowns (scheduler now restarts only when its own config changes); dashboard cards clipped content (page now scrolls).
- Added a **logo**: gradient ring (hourly cycle) with a gap (the break), a pink dot (medicine) and a water droplet. Drawn procedurally (`src/shared/logo.ts`) so there is no image asset; `npm run icons` exports `build/icon.ico` and PNGs; `Logo.tsx` is the SVG version for the dashboard header.
- Built the first **Windows installer** (NSIS, one-click, per-user). Worked around an electron-builder symlink-privilege error on winCodeSign by seeding its cache manually.
- Created the GitHub repo and pushed the first commit.

## 2026-11-18 — Security, ownership, polish

- **Security review.** Upgraded Electron 33 (EOL, known high CVEs) to 45, plus electron-builder 26, electron-vite 6, Vite 8; production `npm audit` is clean. Hardened the app: sandbox + context isolation, IPC restricted to the dashboard window, all input validated/clamped in `validate.ts` (e.g. intervals >= 5 min, lock <= 30 min), removed the unused `break:done` IPC (could end a lock early), `ELECTRON_RENDERER_URL` only trusted when unpackaged, tighter CSP, popups/navigation blocked, permissions denied, Electron fuses set. Verified on the packaged exe over CDP.
- **Ownership.** Author/appId changed to Akram Hoshen / `com.akramhoshen.habittracker`; copyright footer added. Contact is a "✉ Contact" button that opens the mail client via a fixed-address IPC; the address is not shown in the UI (it is still in the public source).
- **Start with Windows**: `startAtLogin` setting (default on) registers the app with `--hidden` so it starts minimized to the tray; toggle in the dashboard header. Packaged-only.
- **Notification name**: set the AppUserModelID (`APP_ID`) so toasts say "Habit Tracker" instead of "electron.app.Habit Tracker".
- **Build reliability**: `electronDist` so builds no longer download from GitHub (intermittent timeout to one CDN IP on the owner's network); restored the missing Electron binary via `node_modules/electron/install.js`.
- **Quit crash fix**: quitting from the tray produced "Object has been destroyed" popups because timers kept sending to destroyed windows. Added `sendToDashboard()` and `stopBackgroundWork()`. Confirmed fixed by the owner on the installed build.
- Wrote `README.md`, `CLAUDE.md` and this log.
- Commits so far: first commit `fa70eb4`, security `e681758`, owner/copyright `4185f07`, login+notification `81dae8a`, contact+electronDist `ca067c4`, quit-crash `040eeac`.
