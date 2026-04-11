'use client'

import NotificationBell from '@/components/NotificationBell'
import { ArrowLeft } from 'lucide-react'

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
            <ArrowLeft size={16} />
            {backLabel ?? 'Zpět'}
          </a>
        )}
        <NotificationBell />
      </div>
    </header>
  )
}
