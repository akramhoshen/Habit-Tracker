import { useEffect, useRef, useState } from 'react'
import { Medicine, Settings, TimerStatus } from '../../shared/types'
import { Card } from './components/Card'
import { Toggle } from './components/Toggle'
import { Logo } from './components/Logo'
import { COPYRIGHT_TEXT, CONTACT_EMAIL } from '../../shared/about'
import { formatCountdown } from './utils/format'
import './styles/global.css'
import './styles/app.css'

function App(): JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [status, setStatus] = useState<TimerStatus | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    window.api.getSettings().then(setSettings)
    window.api.getStatus().then(setStatus)

    const offSettings = window.api.onSettingsChanged(setSettings)
    const offStatus = window.api.onStatusChanged(setStatus)
    const offWater = window.api.onWaterReminder((message) => showToast(message))
    const offMedicine = window.api.onMedicineReminder((p) =>
      showToast(`💊 ${p.name}${p.dose ? ` — ${p.dose}` : ''}: ${p.message}`)
    )

    return () => {
      offSettings()
      offStatus()
      offWater()
      offMedicine()
    }
  }, [])

  function showToast(message: string): void {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  async function patch(partial: Partial<Settings>): Promise<void> {
    const next = await window.api.updateSettings(partial)
    setSettings(next)
  }

  async function logWater(): Promise<void> {
    const next = await window.api.logWater()
    setSettings(next)
    showToast('Nice! Water logged 💧')
  }

  function editMedicine(id: string, change: Partial<Medicine>, persist: boolean): void {
    if (!settings) return
    const medicines = settings.medicines.map((m) => (m.id === id ? { ...m, ...change } : m))
    if (persist) void patch({ medicines })
    else setSettings({ ...settings, medicines })
  }

  function addMedicine(): void {
    if (!settings) return
    const med: Medicine = {
      id: `med-${Date.now().toString(36)}`,
      name: 'New medicine',
      dose: '',
      time: '09:00',
      enabled: true
    }
    void patch({ medicines: [...settings.medicines, med] })
  }

  function removeMedicine(id: string): void {
    if (!settings) return
    void patch({ medicines: settings.medicines.filter((m) => m.id !== id) })
  }

  async function toggleTaken(id: string, taken: boolean): Promise<void> {
    const next = await window.api.setMedicineTaken(id, taken)
    setSettings(next)
    if (taken) showToast('Well done! Medicine logged 💜')
  }

  if (!settings) {
    return (
      <div className="app">
        <p>Loading...</p>
      </div>
    )
  }

  const activeMedicines = settings.medicines.filter((m) => m.enabled)
  const takenCount = activeMedicines.filter((m) =>
    settings.stats.medicinesTaken.includes(m.id)
  ).length

  return (
    <div className="app">
      <header className="header">
        <Logo size={46} />
        <div>
          <h1 className="header__title">
            Habit <span className="gradient-text">Tracker</span>
          </h1>
          <p className="header__subtitle">Stay sharp. Stay hydrated. Stand up every hour.</p>
        </div>
        <div className="header__right">
          <Toggle
            label="Start with Windows"
            checked={settings.startAtLogin}
            onChange={(v) => patch({ startAtLogin: v })}
          />
        </div>
      </header>

      <div className="stat-row">
        <div className="stat-tile">
          <span className="stat-tile__label">Breaks today</span>
          <span className="stat-tile__value stat-tile__value--violet">
            {settings.stats.breaksCompleted}
          </span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__label">Water today</span>
          <span className="stat-tile__value stat-tile__value--teal">
            {settings.stats.waterCount} / {settings.waterGoalCount}
          </span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__label">Medicine today</span>
          <span className="stat-tile__value stat-tile__value--pink">
            {takenCount} / {activeMedicines.length}
          </span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__label">Next break in</span>
          <span className="stat-tile__value stat-tile__value--amber">
            {status && settings.breakEnabled ? formatCountdown(status.msUntilNextBreak) : '--:--'}
          </span>
        </div>
      </div>

      <div className="grid">
        <Card
          icon={'🪻'}
          title="Break Reminders"
          subtitle="Full-screen 2 min stand-up lock"
          accent="violet"
        >
          <Toggle
            label="Enabled"
            checked={settings.breakEnabled}
            onChange={(v) => patch({ breakEnabled: v })}
          />

          <div className="field-row">
            <span className="field-row__label">Every (minutes)</span>
            <input
              type="number"
              min={5}
              value={settings.breakIntervalMinutes}
              onChange={(e) =>
                setSettings({ ...settings, breakIntervalMinutes: Number(e.target.value) })
              }
              onBlur={(e) => patch({ breakIntervalMinutes: Number(e.target.value) })}
            />
          </div>

          <div className="field-row">
            <span className="field-row__label">Lock duration (seconds)</span>
            <input
              type="number"
              min={30}
              value={settings.breakDurationSeconds}
              onChange={(e) =>
                setSettings({ ...settings, breakDurationSeconds: Number(e.target.value) })
              }
              onBlur={(e) => patch({ breakDurationSeconds: Number(e.target.value) })}
            />
          </div>

          <span className="messages-label">Cute messages (one per line)</span>
          <textarea
            className="messages"
            value={settings.breakMessages.join('\n')}
            onChange={(e) =>
              setSettings({ ...settings, breakMessages: e.target.value.split('\n') })
            }
            onBlur={(e) =>
              patch({ breakMessages: e.target.value.split('\n').filter((m) => m.trim()) })
            }
          />

          {status && (
            <span className="countdown-pill">
              Next lock: {settings.breakEnabled ? formatCountdown(status.msUntilNextBreak) : 'paused'}
            </span>
          )}
        </Card>

        <Card icon={'💧'} title="Water Reminders" subtitle="Gentle hydration nudges" accent="teal">
          <Toggle
            label="Enabled"
            checked={settings.waterEnabled}
            onChange={(v) => patch({ waterEnabled: v })}
          />

          <div className="field-row">
            <span className="field-row__label">Every (minutes)</span>
            <input
              type="number"
              min={5}
              value={settings.waterIntervalMinutes}
              onChange={(e) =>
                setSettings({ ...settings, waterIntervalMinutes: Number(e.target.value) })
              }
              onBlur={(e) => patch({ waterIntervalMinutes: Number(e.target.value) })}
            />
          </div>

          <div className="field-row">
            <span className="field-row__label">Daily goal (glasses)</span>
            <input
              type="number"
              min={1}
              value={settings.waterGoalCount}
              onChange={(e) =>
                setSettings({ ...settings, waterGoalCount: Number(e.target.value) })
              }
              onBlur={(e) => patch({ waterGoalCount: Number(e.target.value) })}
            />
          </div>

          <span className="messages-label">Cute messages (one per line)</span>
          <textarea
            className="messages"
            value={settings.waterMessages.join('\n')}
            onChange={(e) =>
              setSettings({ ...settings, waterMessages: e.target.value.split('\n') })
            }
            onBlur={(e) =>
              patch({ waterMessages: e.target.value.split('\n').filter((m) => m.trim()) })
            }
          />

          <button className="primary-btn" onClick={logWater}>
            Log a glass of water now
          </button>
        </Card>

        <Card
          icon={'💊'}
          title="Medicine Reminders"
          subtitle="Daily doses at set times — reminds every 15 min until you mark it taken"
          accent="pink"
          wide
        >
          <Toggle
            label="Enabled"
            checked={settings.medicineEnabled}
            onChange={(v) => patch({ medicineEnabled: v })}
          />

          {settings.medicines.length === 0 && (
            <p className="empty-note">No medicines yet — add one below.</p>
          )}

          {settings.medicines.map((m) => {
            const taken = settings.stats.medicinesTaken.includes(m.id)
            return (
              <div className={`med-row ${m.enabled ? '' : 'med-row--off'}`} key={m.id}>
                <input
                  type="time"
                  className="med-row__time"
                  value={m.time}
                  onChange={(e) => e.target.value && editMedicine(m.id, { time: e.target.value }, true)}
                />
                <input
                  type="text"
                  className="med-row__name"
                  placeholder="Medicine name"
                  value={m.name}
                  onChange={(e) => editMedicine(m.id, { name: e.target.value }, false)}
                  onBlur={(e) => editMedicine(m.id, { name: e.target.value.trim() || 'Medicine' }, true)}
                />
                <input
                  type="text"
                  className="med-row__dose"
                  placeholder="Dose / note (e.g. 1 tablet after lunch)"
                  value={m.dose}
                  onChange={(e) => editMedicine(m.id, { dose: e.target.value }, false)}
                  onBlur={(e) => editMedicine(m.id, { dose: e.target.value.trim() }, true)}
                />
                <Toggle
                  checked={m.enabled}
                  onChange={(v) => editMedicine(m.id, { enabled: v }, true)}
                />
                <button
                  className={`taken-btn ${taken ? 'taken-btn--done' : ''}`}
                  onClick={() => toggleTaken(m.id, !taken)}
                  title={taken ? 'Undo' : 'Mark as taken today'}
                >
                  {taken ? '✓ Taken' : 'Mark taken'}
                </button>
                <button
                  className="icon-btn"
                  onClick={() => removeMedicine(m.id)}
                  title="Delete medicine"
                  aria-label={`Delete ${m.name}`}
                >
                  ✕
                </button>
              </div>
            )
          })}

          <button className="primary-btn" onClick={addMedicine}>
            + Add medicine
          </button>
        </Card>
      </div>

      <p className="footer-note">Minimized to the tray &mdash; the app keeps running in the background.</p>
      <p className="footer-note footer-note--tight">
        {COPYRIGHT_TEXT} &middot; Contact:{' '}
        <button className="link-btn" onClick={() => void window.api.openContact()}>
          {CONTACT_EMAIL}
        </button>
      </p>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

export default App
