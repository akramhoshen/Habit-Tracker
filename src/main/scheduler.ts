import { Settings, TimerStatus } from '../shared/types'

interface Handlers {
  onBreak: () => void
  onWater: () => void
}

export class Scheduler {
  private breakTimer: NodeJS.Timeout | null = null
  private waterTimer: NodeJS.Timeout | null = null
  private nextBreakAt = 0
  private nextWaterAt = 0
  // last applied config, so unrelated settings edits don't restart a countdown
  private breakConfig = ''
  private waterConfig = ''

  constructor(private handlers: Handlers) {}

  applySettings(settings: Settings): void {
    this.setupBreak(settings)
    this.setupWater(settings)
  }

  getStatus(settings: Settings): TimerStatus {
    return {
      breakEnabled: settings.breakEnabled,
      waterEnabled: settings.waterEnabled,
      msUntilNextBreak: this.nextBreakAt ? Math.max(0, this.nextBreakAt - Date.now()) : 0,
      msUntilNextWater: this.nextWaterAt ? Math.max(0, this.nextWaterAt - Date.now()) : 0
    }
  }

  private setupBreak(settings: Settings): void {
    const config = `${settings.breakEnabled}|${settings.breakIntervalMinutes}`
    if (config === this.breakConfig) return
    this.breakConfig = config

    if (this.breakTimer) clearInterval(this.breakTimer)
    if (!settings.breakEnabled) {
      this.breakTimer = null
      this.nextBreakAt = 0
      return
    }
    const ms = Math.max(1, settings.breakIntervalMinutes) * 60 * 1000
    this.nextBreakAt = Date.now() + ms
    this.breakTimer = setInterval(() => {
      this.nextBreakAt = Date.now() + ms
      this.handlers.onBreak()
    }, ms)
  }

  private setupWater(settings: Settings): void {
    const config = `${settings.waterEnabled}|${settings.waterIntervalMinutes}`
    if (config === this.waterConfig) return
    this.waterConfig = config

    if (this.waterTimer) clearInterval(this.waterTimer)
    if (!settings.waterEnabled) {
      this.waterTimer = null
      this.nextWaterAt = 0
      return
    }
    const ms = Math.max(1, settings.waterIntervalMinutes) * 60 * 1000
    this.nextWaterAt = Date.now() + ms
    this.waterTimer = setInterval(() => {
      this.nextWaterAt = Date.now() + ms
      this.handlers.onWater()
    }, ms)
  }
}
