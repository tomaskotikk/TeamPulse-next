'use client'

import Sidebar from './Sidebar'
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
      {/* Sidebar overlay pro mobile */}
      <div
        className="sidebar-overlay"
        id="sidebarOverlay"
        onClick={() => {
          const sidebar = document.getElementById('sidebar')
          const overlay = document.getElementById('sidebarOverlay')
          const btn = document.querySelector('.mobile-menu-btn')
          sidebar?.classList.remove('mobile-open')
          overlay?.classList.remove('active')
          btn?.classList.remove('active')
          document.body.style.overflow = ''
        }}
      />

      <Sidebar user={user} isManager={isManager} />

      <main className="app-main">
        {children}
      </main>
    </div>
  )
}
