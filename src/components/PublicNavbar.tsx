'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const NAV_LINKS = [
  { href: '/landing/index.html#funkce', label: 'Funkce' },
  { href: '/landing/index.html#ukazka', label: 'Ukázka' },
  { href: '/landing/index.html#reference', label: 'Reference' },
  { href: '/landing/index.html#kontakt', label: 'Kontakt' },
]

export default function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  function closeMenu() {
    setMenuOpen(false)
  }

  useEffect(() => {
    const updateHeader = () => setIsScrolled(window.scrollY > 8)
    updateHeader()
    window.addEventListener('scroll', updateHeader, { passive: true })
    return () => window.removeEventListener('scroll', updateHeader)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <header className={`site-header${isScrolled ? ' scrolled' : ''}`} id="top">
      <div className="nav-wrap">
        <Link className="brand" href="/landing/index.html#top" aria-label="TeamPulse domov" onClick={closeMenu}>
          <Image
            src="/img/tp logo.png"
            alt="TeamPulse logo"
            width={378}
            height={162}
            className="brand-logo"
            priority
          />
        </Link>

        <nav className="desktop-nav" aria-label="Hlavní navigace">
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          <Link className="btn ghost" href="/login">Přihlášení</Link>
          <Link className="btn solid" href="/zalozit-klub">Začít zdarma</Link>
        </div>

        <button
          type="button"
          className={`menu-toggle${menuOpen ? ' open' : ''}`}
          aria-label="Otevřít menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span />
          <span />
        </button>
      </div>

      <div className={`mobile-nav${menuOpen ? ' open' : ''}`} aria-label="Mobilní menu">
        {NAV_LINKS.map((item) => (
          <Link key={item.href} href={item.href} onClick={closeMenu}>
            {item.label}
          </Link>
        ))}
        <div className="mobile-nav-actions">
          <Link className="btn ghost" href="/login" onClick={closeMenu}>Přihlášení</Link>
          <Link className="btn solid" href="/zalozit-klub" onClick={closeMenu}>Začít zdarma</Link>
        </div>
      </div>
    </header>
  )
}
