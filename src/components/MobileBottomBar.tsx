'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface MobileBottomBarProps {
  user: {
    first_name: string
    last_name: string
    profile_picture?: string | null
  }
}

function navItemClass(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === '/dashboard' ? 'mobile-bottom-item active' : 'mobile-bottom-item'
  }

  return pathname === href || pathname.startsWith(`${href}/`)
    ? 'mobile-bottom-item active'
    : 'mobile-bottom-item'
}

export default function MobileBottomBar({ user }: MobileBottomBarProps) {
  const pathname = usePathname()
  const initials =
    (user.first_name?.[0] ?? '').toUpperCase() +
    (user.last_name?.[0] ?? '').toUpperCase()

  return (
    <nav className="mobile-bottom-nav" aria-label="Spodní navigace">
      <Link href="/dashboard" className={navItemClass(pathname, '/dashboard')}>
        <svg className="mobile-bottom-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span>Přehled</span>
      </Link>

      <Link href="/members" className={navItemClass(pathname, '/members')}>
        <svg className="mobile-bottom-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <span>Lidé</span>
      </Link>

      <Link href="/chat" className={navItemClass(pathname, '/chat')}>
        <svg className="mobile-bottom-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <span>Zdi</span>
      </Link>

      <Link href="/notifications" className={navItemClass(pathname, '/notifications')}>
        <svg className="mobile-bottom-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span>Inbox</span>
      </Link>

      <Link href="/profile" className={navItemClass(pathname, '/profile')}>
        {user.profile_picture ? (
          <img
            src={`/uploads/profiles/${user.profile_picture}`}
            alt="Profil"
            className="mobile-bottom-profile-avatar"
          />
        ) : (
          <span className="mobile-bottom-profile-fallback">{initials || 'U'}</span>
        )}
        <span>Profil</span>
      </Link>
    </nav>
  )
}
