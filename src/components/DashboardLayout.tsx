'use client'

import Sidebar from './Sidebar'
import MobileBottomBar from './MobileBottomBar'
import type { CSSProperties } from 'react'
import { useEffect, useLayoutEffect, useState } from 'react'

interface UserData {
  first_name: string
  last_name: string
  role: string
  profile_picture?: string | null
}

interface DashboardLayoutProps {
  children: React.ReactNode
  user: UserData
  isManager?: boolean
  themeVars?: Record<string, string>
}

const USER_CACHE_KEY = 'tp-layout-user'
const THEME_CACHE_KEY = 'tp-layout-theme'

function readUserCache(): (UserData & { isManager: boolean }) | null {
  try {
    const raw = window.sessionStorage.getItem(USER_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeUserCache(user: UserData, isManager: boolean) {
  try {
    window.sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify({ ...user, isManager }))
  } catch {}
}

function readThemeCache(): Record<string, string> | null {
  try {
    const raw = window.sessionStorage.getItem(THEME_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeThemeCache(vars: Record<string, string>) {
  try {
    window.sessionStorage.setItem(THEME_CACHE_KEY, JSON.stringify(vars))
  } catch {}
}

function applyThemeToDocument(vars: Record<string, string>) {
  const root = document.documentElement
  const body = document.body
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
    body.style.setProperty(key, value)
  }
}

export default function DashboardLayout({ children, user, isManager, themeVars }: DashboardLayoutProps) {
  const [effectiveUser, setEffectiveUser] = useState<UserData>(() => {
    if (typeof window === 'undefined' || user.first_name) return user
    return readUserCache() ?? user
  })
  const [effectiveIsManager, setEffectiveIsManager] = useState<boolean>(() => {
    if (typeof window === 'undefined' || user.first_name) return isManager ?? false
    return readUserCache()?.isManager ?? isManager ?? false
  })
  const [effectiveThemeVars, setEffectiveThemeVars] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return themeVars ?? {}
    if (themeVars && Object.keys(themeVars).length > 0) return themeVars
    return readThemeCache() ?? {}
  })

  useEffect(() => {
    if (!user.first_name) return
    setEffectiveUser(user)
    setEffectiveIsManager(isManager ?? false)
    writeUserCache(user, isManager ?? false)
  }, [user, isManager])

  useEffect(() => {
    if (!themeVars || Object.keys(themeVars).length === 0) return
    setEffectiveThemeVars(themeVars)
    writeThemeCache(themeVars)
  }, [themeVars])

  // useLayoutEffect runs synchronously before browser paint — eliminates theme color flash
  useLayoutEffect(() => {
    if (Object.keys(effectiveThemeVars).length === 0) return
    applyThemeToDocument(effectiveThemeVars)
  }, [effectiveThemeVars])

  return (
    <div className="app-layout" style={effectiveThemeVars as CSSProperties}>
      <Sidebar user={effectiveUser} isManager={effectiveIsManager} />
      <main className="app-main">
        {children}
      </main>
      <MobileBottomBar user={effectiveUser} />
    </div>
  )
}
