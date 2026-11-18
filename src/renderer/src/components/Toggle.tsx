interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  label?: string
}

export function Toggle({ checked, onChange, label }: ToggleProps): JSX.Element {
  return (
    <label className="toggle">
      <span className="toggle__label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`toggle__track ${checked ? 'toggle__track--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle__thumb" />
      </button>
    </label>
  )
}
