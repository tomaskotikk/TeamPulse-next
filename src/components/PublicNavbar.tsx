'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const NAV_LINKS = [
  { href: '/landing/index.html#platforma', label: 'Platforma' },
  { href: '/landing/index.html#funkce', label: 'Funkce' },
  { href: '/landing/index.html#pribeh', label: 'Jak to funguje' },
  { href: '/landing/index.html#reference', label: 'Reference' },
  { href: '/landing/index.html#kontakt', label: 'Kontakt' },
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
          <Image src="/img/tp logo.png" alt="TeamPulse" width={62} height={62} style={{ height: 'auto' }} priority />
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
