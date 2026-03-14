'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const NAV_LINKS = [
  { href: '/landing/index.html#platforma', label: 'Platforma' },
  { href: '/landing/index.html#reference', label: 'Reference' },
  { href: '/landing/index.html#proc', label: 'Proč TeamPulse?' },
  { href: '/landing/index.html#o-nas', label: 'O nás' },
  { href: '/landing/index.html#podpora', label: 'Podpora' },
]

export default function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <header className="public-nav-shell">
      <div className="public-nav-bar">
        <Link href="/landing/index.html" className="public-nav-logo" aria-label="TeamPulse domov" onClick={closeMenu}>
          <Image src="/tp-logo.png" alt="TeamPulse" width={114} height={42} priority />
        </Link>

        <nav className="public-nav-links" aria-label="Hlavní navigace">
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="public-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="public-nav-actions">
          <Link href="/login" className="public-nav-btn public-nav-btn-ghost">Přihlášení</Link>
          <Link href="/zalozit-klub" className="public-nav-btn public-nav-btn-primary">Založit klub</Link>
          <Link href="/dashboard" className="public-nav-icon" aria-label="Přejít do dashboardu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 12a4 4 0 100-8 4 4 0 000 8z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 20a8 8 0 1116 0H4z" />
            </svg>
          </Link>
        </div>

        <button
          type="button"
          className={`public-nav-toggle${menuOpen ? ' open' : ''}`}
          aria-label="Otevřít menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`public-nav-mobile${menuOpen ? ' open' : ''}`}>
        <nav className="public-nav-mobile-links" aria-label="Mobilní navigace">
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="public-nav-mobile-link" onClick={closeMenu}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="public-nav-mobile-actions">
          <Link href="/login" className="public-nav-btn public-nav-btn-ghost" onClick={closeMenu}>Přihlášení</Link>
          <Link href="/zalozit-klub" className="public-nav-btn public-nav-btn-primary" onClick={closeMenu}>Založit klub</Link>
        </div>
      </div>
    </header>
  )
}
