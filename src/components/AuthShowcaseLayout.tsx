import Link from 'next/link'
import { ReactNode } from 'react'
import PublicNavbar from '@/components/PublicNavbar'

/** Desktop-only product composition (same arrangement as the landing hero). */
export function AuthShowcaseStage() {
  return (
    <div className="auth-stage" aria-hidden="true">
      <div className="auth-stage-circle" />
      <img src="/img/mockup4.png" alt="" className="auth-stage-laptop" />
      <img src="/img/mockup5.png" alt="" className="auth-stage-phone" />
    </div>
  )
}

type AuthShowcaseLayoutProps = {
  title: string
  subtitle: string
  children: ReactNode
  backHref?: string
  backLabel?: string
  variant?: 'default' | 'login'
}

export default function AuthShowcaseLayout({
  title,
  subtitle,
  children,
  backHref = '/login',
  backLabel = 'Zpět na přihlášení',
  variant = 'default',
}: AuthShowcaseLayoutProps) {
  return (
    <div className={`auth-shell auth-shell--${variant}`}>
      <div className="auth-shell-grid-bg" aria-hidden="true" />
      <PublicNavbar />

      {/* desktop only: brand mark above the form (the public navbar is hidden there) */}
      <Link href="/landing/index.html" className="auth-shell-brand" aria-label="TeamPulse domov">
        <img src="/tp-logo.png" alt="" />
        <span>TeamPulse</span>
      </Link>

      <main className="auth-shell-main">
        <div className="auth-shell-back-wrap">
          <Link href={backHref} className="auth-shell-back">
            <span aria-hidden="true">&lsaquo;</span>
            {backLabel}
          </Link>
        </div>

        <section className="auth-shell-intro">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </section>

        <section className="auth-shell-grid">
          <div className="auth-shell-card">{children}</div>

          <aside className="auth-shell-visual" aria-hidden="true">
            <div className="auth-shell-circle" />
            <div className="auth-shell-visual-copy">
              <p className="auth-shell-visual-eyebrow">Správa klubu bez tabulek</p>
              <p className="auth-shell-visual-title">Členové, program a komunikace klubu na jednom místě.</p>
            </div>
            <img src="/img/mockup2.png" alt="" className="auth-shell-mockup" />
            <AuthShowcaseStage />
          </aside>
        </section>
      </main>
    </div>
  )
}
