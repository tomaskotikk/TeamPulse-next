'use client'

import { useState, useEffect, useRef } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Topbar from '@/components/Topbar'
import { createClient } from '@/lib/supabase/client'

type AppUser = {
  id: number
  first_name: string
  last_name: string
  role: string
  organization: string | null
  profile_picture: string | null
}

type AppClub = {
  id: number
  name: string
  sport: string
  city: string
}

interface Message {
  id: number
  user_id: number
  message: string
  created_at: string
  first_name: string
  last_name: string
  role: string
  profile_picture: string | null
}

export default function ChatPage() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [club, setClub] = useState<AppClub | null>(null)
  const [members, setMembers] = useState<AppUser[]>([])
  const [themeVars, setThemeVars] = useState<Record<string, string>>({})
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [showMembersMobile, setShowMembersMobile] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const membersRef = useRef<AppUser[]>([])
  const userIdRef = useRef<number | null>(null)
  const supabaseClient = useRef(createClient())
  const clubId = club?.id ?? null

  const isManager = user?.role === 'manažer'

  // Keep refs in sync for use inside Realtime handler (closures don't re-read state)
  useEffect(() => { membersRef.current = members }, [members])
  useEffect(() => { userIdRef.current = user?.id ?? null }, [user])

  useEffect(() => {
    let mounted = true

    async function loadData() {
      try {
        const [ctxRes, msgRes] = await Promise.all([
          fetch('/api/app/context', { cache: 'no-store' }),
          fetch('/api/chat/messages', { cache: 'no-store' }),
        ])

        if (!ctxRes.ok) {
          window.location.href = '/login'
          return
        }

        const ctx = await ctxRes.json()
        const msg = await msgRes.json()

        if (!mounted) return

        setUser(ctx.user)
        setClub(ctx.club)
        setMembers(ctx.members ?? [])
        setThemeVars(ctx.themeVars ?? {})
        setMessages(msg.messages ?? [])
      } catch {
        if (mounted) setErrorMsg('Nepodařilo se načíst chat.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Supabase Realtime – subscribe to new messages for this club
  useEffect(() => {
    if (!clubId) return

    const client = supabaseClient.current
    const channel = client
      .channel(`chat-club-${clubId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `club_id=eq.${clubId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: number
            user_id: number
            message: string
            created_at: string
            club_id: number
          }
          setMessages((prev) => {
            // Skip own messages – they are already in state via optimistic update + API response.
            // Adding them here would create a duplicate because the optimistic ID differs from the real DB ID.
            if (row.user_id === userIdRef.current) return prev
            // Skip if somehow already present
            if (prev.some((m) => m.id === row.id)) return prev
            const sender = membersRef.current.find((m) => m.id === row.user_id)
            return [
              ...prev,
              {
                id: row.id,
                user_id: row.user_id,
                message: row.message,
                created_at: row.created_at,
                first_name: sender?.first_name ?? '',
                last_name: sender?.last_name ?? '',
                role: sender?.role ?? '',
                profile_picture: sender?.profile_picture ?? null,
              },
            ]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `club_id=eq.${clubId}`,
        },
        (payload) => {
          const row = payload.old as Partial<{ id: number }>
          if (!row.id) return
          setMessages((prev) => prev.filter((m) => m.id !== row.id))
        }
      )
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [clubId])

  // Fallback sync for cases when Realtime socket is blocked/reconnecting.
  useEffect(() => {
    if (!clubId) return

    let cancelled = false

    async function syncMessages() {
      try {
        const res = await fetch('/api/chat/messages', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled || !Array.isArray(data.messages)) return

        setMessages((prev) => {
          const next = [...prev]
          const incomingIds = new Set<number>()
          for (const incoming of data.messages as Message[]) {
            incomingIds.add(incoming.id)
            const existingById = next.findIndex((m) => m.id === incoming.id)
            if (existingById !== -1) {
              next[existingById] = incoming
              continue
            }

            const optimisticIndex = next.findIndex(
              (m) =>
                m.id > 1_000_000_000_000 &&
                m.user_id === incoming.user_id &&
                m.message === incoming.message &&
                Math.abs(new Date(m.created_at).getTime() - new Date(incoming.created_at).getTime()) < 30_000
            )

            if (optimisticIndex !== -1) {
              next[optimisticIndex] = incoming
            } else {
              next.push(incoming)
            }
          }

          const reconciled = next.filter(
            (m) => m.id > 1_000_000_000_000 || incomingIds.has(m.id)
          )

          reconciled.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          return reconciled
        })
      } catch {
        // ignore network errors; realtime can still deliver updates
      }
    }

    const intervalId = window.setInterval(syncMessages, 7000)
    const onFocus = () => {
      void syncMessages()
    }

    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
    }
  }, [clubId])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || sending || !user) return

    setSending(true)
    const text = newMessage.trim()
    setNewMessage('')

    const optimisticId = Date.now()
    const optimistic: Message = {
      id: optimisticId,
      user_id: user.id,
      message: text,
      created_at: new Date().toISOString(),
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      profile_picture: user.profile_picture,
    }

    setMessages((prev) => [...prev, optimistic])

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      const data = await res.json()
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
        setErrorMsg(data.error ?? 'Nepodařilo se odeslat zprávu.')
      } else {
        setMessages((prev) => prev.map((m) => (m.id === optimisticId ? data.message : m)))
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      setErrorMsg('Nepodařilo se odeslat zprávu.')
    } finally {
      setSending(false)
    }
  }

  async function deleteMessage(id: number) {
    if (!user || deletingMessageId) return

    const previous = messages
    setDeletingMessageId(id)
    setMessages((prev) => prev.filter((m) => m.id !== id))

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessages(previous)
        setErrorMsg(data.error ?? 'Nepodařilo se smazat zprávu.')
      }
    } catch {
      setMessages(previous)
      setErrorMsg('Nepodařilo se smazat zprávu.')
    } finally {
      setDeletingMessageId(null)
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
  }

  const layoutUser = user ?? {
    id: 0,
    first_name: '',
    last_name: '',
    role: '',
    organization: null,
    profile_picture: null,
  }

  return (
    <DashboardLayout user={layoutUser} isManager={isManager} themeVars={themeVars}>
      <Topbar title="Týmový chat" />

      <div className="app-content">
        <div className="page-intro">
          <div className="page-intro-meta">Komunikace týmu</div>
          <h2 className="content-title">Týmový chat</h2>
          <p className="content-subtitle">
            {club ? `${club.name} • ${club.sport} • ${club.city}` : 'Komunikace s členy klubu'}
          </p>
        </div>

        {errorMsg && <div className="login-error" style={{ marginBottom: 14 }}>{errorMsg}</div>}

        {loading ? (
          <div className="section"><div className="section-content">Načítání chatu…</div></div>
        ) : (

        <div className="chat-container" id="chatContainer">
          <div
            className={`chat-members-overlay ${showMembersMobile ? 'active' : ''}`}
            onClick={() => setShowMembersMobile(false)}
            aria-hidden="true"
          />

          {/* PANEL ČLENŮ */}
          <aside className={`chat-members-panel ${showMembersMobile ? 'mobile-open' : ''}`} id="membersPanel">
            <div className="chat-members-header">
              <div className="chat-members-header-title">Členové ({members.length})</div>
              <button
                type="button"
                className="chat-mobile-close"
                onClick={() => setShowMembersMobile(false)}
                aria-label="Zavřít seznam členů"
              >
                ×
              </button>
            </div>
            <div className="chat-members-list">
              {members.map((m) => {
                const ini = (m.first_name?.[0] ?? '').toUpperCase() + (m.last_name?.[0] ?? '').toUpperCase()
                return (
                  <div key={m.id} className="chat-member-item">
                    {m.profile_picture ? (
                      <img src={`/uploads/profiles/${m.profile_picture}`} alt="" className="chat-member-avatar-img" />
                    ) : (
                      <div className="chat-member-avatar-fallback">{ini}</div>
                    )}
                    <div className="chat-member-meta">
                      <div className="chat-member-name">
                        {m.first_name} {m.last_name}
                      </div>
                      <div className="chat-member-role">{m.role}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </aside>

          {/* CHAT OBLAST */}
          <div className="chat-area">
            <div className="chat-mobile-toolbar">
              <button type="button" className="chat-mobile-members-btn" onClick={() => setShowMembersMobile(true)}>
                Členové ({members.length})
              </button>
            </div>

            {/* Zprávy */}
            <div id="messagesContainer" className="chat-messages-container">
              {messages.map((msg) => {
                const isOwn = msg.user_id === layoutUser.id
                const canDelete = isOwn || isManager
                const ini = (msg.first_name?.[0] ?? '').toUpperCase() + (msg.last_name?.[0] ?? '').toUpperCase()

                return (
                  <div key={msg.id} className={`chat-message ${isOwn ? 'own' : ''}`}>
                    {msg.profile_picture ? (
                      <img src={`/uploads/profiles/${msg.profile_picture}`} alt="" className="chat-message-user-img" />
                    ) : (
                      <div className="chat-message-avatar">{ini}</div>
                    )}
                    <div className="chat-message-content">
                      {!isOwn && (
                        <div className="chat-message-sender">
                          {msg.first_name} {msg.last_name} · {msg.role}
                        </div>
                      )}
                      <div className={`chat-message-bubble ${isOwn ? 'own' : 'other'}`}>
                        {msg.message}
                      </div>
                      <div className={`chat-message-actions ${isOwn ? 'own' : 'other'}`}>
                        <div className="chat-message-time">
                          {formatTime(msg.created_at)}
                        </div>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(msg.id)}
                            disabled={deletingMessageId === msg.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 24,
                              height: 24,
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                              background: 'transparent',
                              color: 'var(--text-dimmer)',
                              cursor: deletingMessageId === msg.id ? 'default' : 'pointer',
                              opacity: deletingMessageId === msg.id ? 0.6 : 1,
                            }}
                            aria-label="Smazat zprávu"
                            title="Smazat zprávu"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-area">
              <form onSubmit={sendMessage} className="chat-input-form">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Napište zprávu…"
                  className="chat-text-input"
                  id="messageInput"
                />
                <button
                  type="submit"
                  className="chat-send-btn"
                  disabled={!newMessage.trim() || sending || !user}
                  id="sendBtn"
                >
                  <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Odeslat
                </button>
              </form>
            </div>
          </div>
        </div>
        )}
      </div>

      {confirmDeleteId !== null && (
        <div className="crop-modal active" onClick={(e) => {
          if (e.target === e.currentTarget && deletingMessageId === null) {
            setConfirmDeleteId(null)
          }
        }}>
          <div className="crop-modal-content" style={{ maxWidth: 420 }}>
            <div className="crop-modal-body">
              <div className="crop-modal-title" style={{ fontSize: 20 }}>
              Smazat zprávu?
              </div>
              <div className="form-help" style={{ fontSize: 14 }}>
              Tato akce je nevratná. Po smazání se odstraní také související notifikace.
              </div>
            </div>
            <div className="crop-modal-footer" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setConfirmDeleteId(null)}
                disabled={deletingMessageId !== null}
              >
                Zrušit
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (confirmDeleteId === null) return
                  setConfirmDeleteId(null)
                  void deleteMessage(confirmDeleteId)
                }}
                disabled={deletingMessageId !== null}
              >
                {deletingMessageId !== null ? 'Mazání…' : 'Ano, smazat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
