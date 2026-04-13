'use client'

import Sidebar from './Sidebar'
import MobileBottomBar from './MobileBottomBar'
import type { CSSProperties } from 'react'
import { useEffect } from 'react'

interface DashboardLayoutProps {
  children: React.ReactNode
  user: {
    first_name: string
    last_name: string
    role: string
    profile_picture?: string | null
  }
  isManager?: boolean
  themeVars?: Record<string, string>
}

export default function DashboardLayout({ children, user, isManager, themeVars }: DashboardLayoutProps) {
  useEffect(() => {
    if (!themeVars || typeof document === 'undefined') return

    const root = document.documentElement
    const body = document.body

    for (const [key, value] of Object.entries(themeVars)) {
      root.style.setProperty(key, value)
      body.style.setProperty(key, value)
    }
  }, [themeVars])

  return (
    <div className="app-layout" style={themeVars as CSSProperties}>
      <Sidebar user={user} isManager={isManager} />

      <main className="app-main">
        {children}
      </main>

      <MobileBottomBar user={user} />
    </div>
  )
}
