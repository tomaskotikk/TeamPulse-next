'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Topbar from '@/components/Topbar'
import { createClient } from '@/lib/supabase/client'

type Notification = {
  id: number
  user_id: number
  type: string
  title: string
  body: string | null
  actor_id: number | null
  read_at: string | null
  created_at: string
}

type AppUser = {
  id: number
  first_name: string
  last_name: string
  role: string
  organization: string | null
  profile_picture: string | null
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'Právě teď'
  if (diff < 3600) return `${Math.floor(diff / 60)} min`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hod`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d`
  return new Date(iso).toLocaleDateString('cs-CZ')
}

function typeLabel(type: string) {
  if (type === 'new_message') return 'Nová zpráva'
  if (type === 'member_joined') return 'Nový člen'
  return 'Notifikace'
}

function typeIcon(type: string) {
  if (type === 'new_message') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

export default function NotificationsPage() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [themeVars, setThemeVars] = useState<Record<string, string>>({})
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [userId, setUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const supabaseClient = useRef(createClient())

  function upsertNotification(row: Notification) {
    setNotifications((prev) => {
      const idx = prev.findIndex((n) => n.id === row.id)
      if (idx !== -1) {
        const next = [...prev]
        next[idx] = row
        return next
      }
      return [row, ...prev]
    })
  }

  const fetchNotifications = useCallback(async () => {
    try {
      const [ctxRes, notifRes] = await Promise.all([
        fetch('/api/app/context', { cache: 'no-store' }),
        fetch('/api/notifications', { cache: 'no-store' }),
      ])
      if (!ctxRes.ok) { window.location.href = '/login'; return }
      const ctx = await ctxRes.json()
      const notifData = await notifRes.json()
      setUser(ctx.user)
      setThemeVars(ctx.themeVars ?? {})
      setNotifications(notifData.notifications ?? [])
      if (notifData.userId) setUserId(notifData.userId)
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Supabase Realtime – live updates
  useEffect(() => {
    if (!userId) return
    const client = supabaseClient.current
    const channel = client
      .channel(`notif-page-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Notification
          if (row.user_id !== userId) return
          upsertNotification(row)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Notification
          if (row.user_id !== userId) return
          upsertNotification(row)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.old as Partial<Notification>
          if (!row.id) return
          setNotifications((prev) => prev.filter((n) => n.id !== row.id))
        }
      )
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [userId])

  // Fallback sync when realtime connection is interrupted.
  useEffect(() => {
    if (!userId) return

    const intervalId = window.setInterval(() => {
      void fetchNotifications()
    }, 12000)

    const onFocus = () => {
      void fetchNotifications()
    }

    window.addEventListener('focus', onFocus)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
    }
  }, [fetchNotifications, userId])

  async function dismiss(id: number) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read-one', id }),
    })
  }

  async function dismissAll() {
    setNotifications([])
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read-all' }),
    })
  }

  const layoutUser = user ?? {
    id: 0, first_name: '', last_name: '', role: '', organization: null, profile_picture: null,
  }
  const isManager = user?.role === 'manažer'

  return (
    <DashboardLayout user={layoutUser} isManager={isManager} themeVars={themeVars}>
      <Topbar title="Notifikace" />

      <div className="app-content">
        <div className="page-intro page-intro-row">
          <div>
            <div className="page-intro-meta">Inbox klubu</div>
            <h2 className="content-title">Notifikace</h2>
            <p className="content-subtitle">Všechny vaše notifikace na jednom místě</p>
          </div>
          {notifications.length > 0 && (
            <button className="topbar-btn page-intro-action" onClick={dismissAll}>
              <svg style={{ width: 15, height: 15 }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Smazat vše
            </button>
          )}
        </div>

        {loading ? (
          <div className="section"><div className="section-content" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Načítám…</div></div>
        ) : notifications.length === 0 ? (
          <div className="section">
            <div className="section-content">
              <div className="empty-state">
                <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                <div className="empty-title">Žádné notifikace</div>
                <div className="empty-description">Zatím nemáte žádné notifikace. Nové notifikace se zobrazí zde.</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="section notifications-list">
            {notifications.map((n, i) => (
              <div key={n.id} className="notification-item" style={{ borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className={`notification-item-icon ${n.type === 'new_message' ? 'is-message' : 'is-member'}`}>
                  {typeIcon(n.type)}
                </div>

                <div className="notification-item-content">
                  <div className="notification-item-meta">
                    <span className={`notification-item-type ${n.type === 'new_message' ? 'is-message' : 'is-member'}`}>
                      {typeLabel(n.type)}
                    </span>
                    <span className="notification-item-dot">·</span>
                    <span className="notification-item-time">{timeAgo(n.created_at)}</span>
                  </div>
                  <div className="notification-item-title">
                    {n.title}
                  </div>
                  {n.body && (
                    <div className="notification-item-body">
                      {n.body}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => dismiss(n.id)}
                  className="notification-item-dismiss"
                  title="Smazat notifikaci"
                  aria-label="Smazat notifikaci"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
