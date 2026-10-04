import type { CSSProperties, ReactNode } from 'react'
import Avatar from './Avatar'
import ThemeToggle from './ThemeToggle'

const SAMPLES = [
  { name: 'Netflix', price: '$15.99', when: 'Renews in 4 days' },
  { name: 'Spotify', price: '$5.99', when: 'Renews tomorrow' },
  { name: 'iCloud+', price: '$2.99', when: 'Renews in 10 days' },
  { name: 'Xbox Game Pass', price: '$44.99', when: 'Renews in 25 days' },
]

/** The frame around every signed-out page: an animated brand panel beside the form. */
export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="auth-page">
      <aside className="auth-showcase" aria-hidden="true">
        <div className="blob blob-a" />
        <div className="blob blob-b" />
        <div className="showcase-copy">
          <div className="brand light">Subtrack</div>
          <h2>Every subscription. One calm place.</h2>
          <p>See what you pay each month, what renews next, and get a nudge before it does.</p>
        </div>
        <div className="showcase-cards">
          {SAMPLES.map((sample, index) => (
            <div className="showcase-card" key={sample.name} style={{ '--i': index } as CSSProperties}>
              <Avatar name={sample.name} size={36} />
              <div>
                <strong>{sample.name}</strong>
                <span>{sample.when}</span>
              </div>
              <b>{sample.price}</b>
            </div>
          ))}
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-theme">
          <ThemeToggle />
        </div>
        <div className="auth-card page">
          <div className="brand">Subtrack</div>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  )
}
