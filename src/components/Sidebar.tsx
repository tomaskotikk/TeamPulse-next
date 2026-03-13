'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
  const initials =
    (user.first_name?.[0] ?? '').toUpperCase() +
    (user.last_name?.[0] ?? '').toUpperCase()
  const fullName = `${user.first_name} ${user.last_name}`

  function navClass(href: string) {
    return pathname === href ? 'nav-item active' : 'nav-item'
  }

  return (
    <aside className="app-sidebar" id="sidebar">
      <div className="sidebar-header" />

      <nav className="sidebar-nav">
        {/* HLAVNÍ */}
        <div className="nav-section">
          <div className="nav-section-title">Hlavní</div>

          <Link href="/dashboard" className={navClass('/dashboard')}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Dashboard</span>
          </Link>

          <Link href="/profile" className={navClass('/profile')}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Profil</span>
          </Link>

          <Link href="/settings" className={navClass('/settings')}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Nastavení</span>
          </Link>

          {isManager && (
            <Link href="/invite" className={navClass('/invite')}>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span>Pozvat členy</span>
            </Link>
          )}
        </div>

        {/* SPRÁVA */}
        <div className="nav-section">
          <div className="nav-section-title">Správa</div>

          <Link href="/members" className={navClass('/members')}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Členové</span>
          </Link>

          <a href="#" className="nav-item">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Docházka</span>
            <span className="nav-badge">Brzy</span>
          </a>

          <a href="#" className="nav-item">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Nominace</span>
            <span className="nav-badge">Brzy</span>
          </a>
        </div>

        {/* KOMUNIKACE */}
        <div className="nav-section">
          <div className="nav-section-title">Komunikace</div>

          <Link href="/chat" className={navClass('/chat')}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span>Zprávy</span>
          </Link>
        </div>
      </nav>

      {/* FOOTER */}
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
      </div>
    </aside>
  )
}
