import { ReactNode } from 'react'

interface CardProps {
  icon: ReactNode
  title: string
  subtitle?: string
  accent: 'violet' | 'teal' | 'pink'
  wide?: boolean
  children: ReactNode
}

export function Card({ icon, title, subtitle, accent, wide, children }: CardProps): JSX.Element {
  return (
    <section className={`card card--${accent}${wide ? ' card--wide' : ''}`}>
      <header className="card__header">
        <div className="card__icon">{icon}</div>
        <div>
          <h2 className="card__title">{title}</h2>
          {subtitle && <p className="card__subtitle">{subtitle}</p>}
        </div>
      </header>
      <div className="card__body">{children}</div>
    </section>
  )
}
