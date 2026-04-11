'use client'

import NotificationBell from '@/components/NotificationBell'

interface TopbarProps {
  title: string
  actions?: React.ReactNode
  backHref?: string
  backLabel?: string
}

export default function Topbar({ title, actions, backHref, backLabel }: TopbarProps) {
  return (
    <header className="app-topbar">
      <div>
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
        <NotificationBell />
      </div>
    </header>
  )
}
