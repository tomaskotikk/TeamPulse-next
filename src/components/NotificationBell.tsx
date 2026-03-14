'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'Právě teď'
  if (diff < 3600) return `${Math.floor(diff / 60)} min`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hod`
  return `${Math.floor(diff / 86400)} d`
}

function notifIcon(type: string) {
  if (type === 'new_message') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [userId, setUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)
  const supabase = useRef(createClient())

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnread(data.unreadCount ?? 0)
      if (data.userId && !userId) setUserId(data.userId)
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Supabase Realtime subscription – fires when a new row is inserted for this user
  useEffect(() => {
    if (!userId) return

    const channel = supabase.current
      .channel(`notif-user-${userId}`)
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
          // guard: only process rows that belong to this user
          if (row.user_id !== userId) return
          setNotifications((prev) => [row, ...prev].slice(0, 40))
          setUnread((c) => c + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.current.removeChannel(channel)
    }
  }, [userId])

  // Close panel when clicking outside
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  async function markAllRead() {
    setNotifications([])
    setUnread(0)
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read-all' }),
    })
  }

  async function markOneRead(id: number) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setUnread((c) => Math.max(0, c - 1))
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read-one', id }),
    })
  }

  return (
    <div className="notif-bell-wrapper" ref={panelRef}>
      <button
        className="notif-bell-btn"
        onClick={() => {
          setOpen((o) => !o)
        }}
        aria-label="Notifikace"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="notif-badge">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <span className="notif-panel-title">Notifikace</span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {notifications.length > 0 && (
                <button className="notif-mark-all" onClick={markAllRead}>
                  Smazat vše
                </button>
              )}
              <a href="/notifications" className="notif-mark-all" style={{ textDecoration: 'none' }}>
                Zobrazit vše
              </a>
            </div>
          </div>

          <div className="notif-list">
            {loading && (
              <div className="notif-empty">Načítám…</div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="notif-empty">Žádné notifikace</div>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                className="notif-item unread"
                onClick={() => markOneRead(n.id)}
              >
                <div className={`notif-icon-wrap type-${n.type}`}>
                  {notifIcon(n.type)}
                </div>
                <div className="notif-content">
                  <div className="notif-title">{n.title}</div>
                  {n.body && <div className="notif-body">{n.body}</div>}
                  <div className="notif-time">{timeAgo(n.created_at)}</div>
                </div>
                {!n.read_at && <div className="notif-dot" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
