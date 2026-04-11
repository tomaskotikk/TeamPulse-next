'use client'

import Sidebar from './Sidebar'
import MobileBottomBar from './MobileBottomBar'
import type { CSSProperties } from 'react'

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
