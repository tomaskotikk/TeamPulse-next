import Link from 'next/link'
import Image from 'next/image'
import { ReactNode } from 'react'

type AuthShowcaseLayoutProps = {
  title: string
  subtitle: string
  children: ReactNode
  backHref?: string
  backLabel?: string
}

export default function AuthShowcaseLayout({
  title,
  subtitle,
  children,
  backHref = '/login',
  backLabel = 'Zpět na přihlášení',
}: AuthShowcaseLayoutProps) {
  return (
    <div className="auth-shell">
      <header className="auth-shell-topbar">
        <Link href={backHref} className="auth-shell-back">
          <span aria-hidden="true">&lsaquo;</span>
          {backLabel}
        </Link>
      </header>

      <main className="auth-shell-main">
        <section className="auth-shell-intro">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </section>

        <section className="auth-shell-grid">
          <div className="auth-shell-card">{children}</div>

          <aside className="auth-shell-visual" aria-hidden="true">
            <div className="auth-shell-circle" />
            <Image
              src="/img/mockup.png"
              alt="TeamPulse aplikace"
              width={640}
              height={420}
              className="auth-shell-mockup"
              priority
            />
          </aside>
        </section>
      </main>
    </div>
  )
}
