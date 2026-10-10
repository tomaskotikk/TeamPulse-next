'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  CalendarDays,
  ClipboardCheck,
  ChevronLeft,
  Layers,
  LineChart,
  LogOut,
  MessageSquare,
  Settings,
  User,
  UserPlus,
  Users,
  LayoutDashboard,
} from 'lucide-react'

interface SidebarProps {
  user: {
    first_name: string
    last_name: string
    role: string
    profile_picture?: string | null
  }
  isManager?: boolean
}

export default function Sidebar({ user, isManager }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('tp-sidebar-collapsed') === '1'
  })
  const canSeeGraphs = user.role === 'manažer' || user.role === 'trenér'
  const navRef = useRef<HTMLElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)
  const [pendingApplications, setPendingApplications] = useState(0)

  useEffect(() => {
    if (!isManager) return
    let cancelled = false
    fetch('/api/applications?count=1', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { count: 0 }))
      .then((data) => {
        if (!cancelled) setPendingApplications(Number(data.count) || 0)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isManager, pathname])

  useEffect(() => {
    window.localStorage.setItem('tp-sidebar-collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  useEffect(() => {
    const nav = navRef.current
    const pill = pillRef.current
    if (!nav || !pill) return

    const active = nav.querySelector('.nav-item.active') as HTMLElement | null
    if (!active) {
      pill.style.opacity = '0'
      return
    }

    const navRect = nav.getBoundingClientRect()
    const activeRect = active.getBoundingClientRect()
    const y = activeRect.top - navRect.top + nav.scrollTop

    if (firstRender.current) {
      firstRender.current = false
      pill.style.transition = 'none'
      pill.style.transform = `translateY(${y}px)`
      pill.style.height = `${activeRect.height}px`
      pill.style.opacity = '1'
      void pill.offsetHeight
      pill.style.transition = ''
    } else {
      pill.style.transform = `translateY(${y}px)`
      pill.style.height = `${activeRect.height}px`
      pill.style.opacity = '1'
    }
  }, [pathname])

  const initials =
    (user.first_name?.[0] ?? '').toUpperCase() +
    (user.last_name?.[0] ?? '').toUpperCase()
  const fullName = `${user.first_name} ${user.last_name}`

  function navClass(href: string) {
    if (href === '/dashboard') {
      return pathname === '/dashboard' ? 'nav-item active' : 'nav-item'
    }
    return pathname === href || pathname.startsWith(`${href}/`) ? 'nav-item active' : 'nav-item'
  }

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`} id="sidebar">
      <div className="sidebar-brand-row">
        <Link href="/dashboard" className="sidebar-brand" aria-label="TeamPulse dashboard">
          <span className="sidebar-brand-mark" aria-hidden="true">
            <img src="/tp-logo.png" alt="" className="sidebar-brand-logo" />
          </span>
        </Link>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? 'Rozbalit menu' : 'Sbalit menu'}
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <nav className="sidebar-nav" ref={navRef}>
        <div className="nav-active-pill" ref={pillRef} aria-hidden="true" />
        <div className="nav-section">
          <div className="nav-section-title">Hlavní</div>

          <Link href="/dashboard" className={navClass('/dashboard')}>
            <LayoutDashboard className="nav-icon" />
            <span className="nav-label">Dashboard</span>
          </Link>

          <Link href="/events" className={navClass('/events')}>
            <CalendarDays className="nav-icon" />
            <span className="nav-label">Události</span>
          </Link>

          {canSeeGraphs && (
            <Link href="/grafy" className={navClass('/grafy')}>
              <LineChart className="nav-icon" />
              <span className="nav-label">Grafy</span>
            </Link>
          )}

          <Link href="/profile" className={navClass('/profile')}>
            <User className="nav-icon" />
            <span className="nav-label">Profil</span>
          </Link>

          <Link href="/settings" className={navClass('/settings')}>
            <Settings className="nav-icon" />
            <span className="nav-label">Nastavení</span>
          </Link>

          {isManager && (
            <Link href="/invite" className={navClass('/invite')}>
              <UserPlus className="nav-icon" />
              <span className="nav-label">Pozvat členy</span>
            </Link>
          )}
        </div>

        <div className="nav-section">
          <div className="nav-section-title">Správa</div>

          <Link href="/members" className={navClass('/members')}>
            <Users className="nav-icon" />
            <span className="nav-label">Členové</span>
          </Link>

          {isManager && (
            <Link href="/applications" className={navClass('/applications')}>
              <ClipboardCheck className="nav-icon" />
              <span className="nav-label">Přihlášky</span>
              {pendingApplications > 0 && (
                <span className="nav-count" aria-label={`${pendingApplications} čeká na schválení`}>
                  {pendingApplications}
                </span>
              )}
            </Link>
          )}

          {isManager && (
            <Link href="/categories" className={navClass('/categories')}>
              <Layers className="nav-icon" />
              <span className="nav-label">Kategorie</span>
            </Link>
          )}
        </div>

        <div className="nav-section">
          <div className="nav-section-title">Komunikace</div>

          <Link href="/chat" className={navClass('/chat')}>
            <MessageSquare className="nav-icon" />
            <span className="nav-label">Zprávy</span>
          </Link>

          <Link href="/notifications" className={navClass('/notifications')}>
            <Bell className="nav-icon" />
            <span className="nav-label">Notifikace</span>
          </Link>
        </div>
      </nav>

      <div className="sidebar-footer">
        <Link href="/profile" className="user-info">
          {user.profile_picture ? (
            <img
              src={`/uploads/profiles/${user.profile_picture}`}
              alt="Profilový obrázek"
              className="user-avatar-img"
            />
          ) : (
            <div className="user-avatar">{initials}</div>
          )}
          <div className="user-details">
            <div className="user-name">{fullName}</div>
            <div className="user-role">{user.role}</div>
          </div>
        </Link>

        <a href="/api/auth/logout" className="sidebar-logout-btn">
          <span className="sidebar-logout-icon-wrap" aria-hidden="true"><LogOut size={16} /></span>
          <span className="sidebar-logout-texts">
            <span className="sidebar-logout-title">Odhlásit se</span>
          </span>
        </a>
      </div>
    </aside>
  )
}
