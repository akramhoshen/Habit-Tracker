import { useEffect, useState } from 'react'
import './styles/global.css'
import './styles/overlay.css'

interface BreakPayload {
  message: string
  durationSeconds: number
}

function Overlay(): JSX.Element {
  const [payload, setPayload] = useState<BreakPayload | null>(null)
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    return window.api.onShowBreakOverlay((p) => {
      setPayload(p)
      setRemaining(p.durationSeconds)
    })
  }, [])

  useEffect(() => {
    if (!payload) return
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [payload])

  const total = payload?.durationSeconds ?? 1
  const progress = payload ? 1 - remaining / total : 0
  const mm = Math.floor(remaining / 60)
    .toString()
    .padStart(2, '0')
  const ss = (remaining % 60).toString().padStart(2, '0')

  return (
    <div className="overlay">
      <div className="overlay__blob overlay__blob--a" />
      <div className="overlay__blob overlay__blob--b" />
      <div className="overlay__content">
        <span className="overlay__eyebrow">BREAK TIME</span>
        <p className="overlay__message">
          {payload?.message ?? 'Time to stand up and stretch!'}
        </p>
        <div className="overlay__timer">
          {mm}:{ss}
        </div>
        <div className="overlay__progress">
          <div className="overlay__progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="overlay__hint">
          Screen unlocks automatically &mdash; go walk a little {'\u{1F6B6}'}
        </span>
      </div>
    </div>
  )
}

export default Overlay
