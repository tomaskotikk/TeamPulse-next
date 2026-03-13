'use client'

import { useEffect, useRef } from 'react'

interface TopbarProps {
  title: string
  actions?: React.ReactNode
  backHref?: string
  backLabel?: string
}

export default function Topbar({ title, actions, backHref, backLabel }: TopbarProps) {
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const btn = btnRef.current
    if (!btn) return

    function toggleSidebar() {
      const sidebar = document.getElementById('sidebar')
      const overlay = document.getElementById('sidebarOverlay')
      if (!sidebar || !overlay) return
      const isOpen = sidebar.classList.toggle('mobile-open')
      overlay.classList.toggle('active', isOpen)
      btn!.classList.toggle('active', isOpen)
      document.body.style.overflow = isOpen ? 'hidden' : ''
    }

    btn.addEventListener('click', toggleSidebar)
    return () => btn.removeEventListener('click', toggleSidebar)
  }, [])

  return (
    <header className="app-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="mobile-menu-btn" ref={btnRef} aria-label="Otevřít menu">
          <div className="hamburger">
            <span />
            <span />
            <span />
          </div>
        </button>
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className="topbar-actions">
        {actions}
        {backHref && (
          <a href={backHref} className="topbar-btn">
            <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {backLabel ?? 'Zpět'}
          </a>
        )}
        <a href="/api/auth/logout" className="topbar-btn">
          <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Odhlásit
        </a>
      </div>
    </header>
  )
}
