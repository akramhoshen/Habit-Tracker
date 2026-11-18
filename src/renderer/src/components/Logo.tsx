/**
 * SVG version of the app logo (same geometry as src/shared/logo.ts).
 * Ring = hourly cycle, gap = your break, pink dot = medicine, droplet = hydration.
 */
export function Logo({ size = 44 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Habit Tracker">
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e1e36" />
          <stop offset="1" stopColor="#0c0c18" />
        </linearGradient>
        <linearGradient id="logo-ring" gradientUnits="userSpaceOnUse" x1="16" y1="0" x2="84" y2="0">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#2dd4bf" />
        </linearGradient>
        <linearGradient id="logo-drop" gradientUnits="userSpaceOnUse" x1="0" y1="32" x2="0" y2="70">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#logo-bg)" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="8" />
      <path
        d="M50 16 A34 34 0 1 1 20.56 33"
        fill="none"
        stroke="url(#logo-ring)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <circle cx="33" cy="20.56" r="5" fill="#f472b6" />
      <path d="M50 32 L61.1 50.2 A13 13 0 1 1 38.9 50.2 Z" fill="url(#logo-drop)" />
      <circle cx="45.5" cy="55" r="3.6" fill="#fff" fillOpacity="0.55" />
    </svg>
  )
}
