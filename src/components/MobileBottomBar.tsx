'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Home, MessageSquare, Users, User } from 'lucide-react'

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
        <Home className="mobile-bottom-icon" aria-hidden="true" />
        <span>Přehled</span>
      </Link>

      <Link href="/members" className={navItemClass(pathname, '/members')}>
        <Users className="mobile-bottom-icon" aria-hidden="true" />
        <span>Lidé</span>
      </Link>

      <Link href="/chat" className={navItemClass(pathname, '/chat')}>
        <MessageSquare className="mobile-bottom-icon" aria-hidden="true" />
        <span>Chat</span>
      </Link>

      <Link href="/notifications" className={navItemClass(pathname, '/notifications')}>
        <Bell className="mobile-bottom-icon" aria-hidden="true" />
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
          <span className="mobile-bottom-profile-fallback"><User size={16} />{initials || 'U'}</span>
        )}
        <span>Profil</span>
      </Link>
    </nav>
  )
}
