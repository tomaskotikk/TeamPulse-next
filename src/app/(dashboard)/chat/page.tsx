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
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const membersRef = useRef<AppUser[]>([])
  const userIdRef = useRef<number | null>(null)
  const supabaseClient = useRef(createClient())

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
    if (!club) return

    const channel = supabaseClient.current
      .channel(`chat-club-${club.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `club_id=eq.${club.id}`,
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
      .subscribe()

    return () => {
      supabaseClient.current.removeChannel(channel)
    }
  }, [club?.id])

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
        <div className="content-header">
          <h2 className="content-title">Týmový chat</h2>
          <p className="content-subtitle">
            {club ? `${club.name} • ${club.sport} • ${club.city}` : 'Komunikace s členy klubu'}
          </p>
        </div>

        {errorMsg && <div className="login-error" style={{ marginBottom: 14 }}>{errorMsg}</div>}

        {loading ? (
          <div className="section"><div className="section-content">Načítání chatu…</div></div>
        ) : (

        <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 240px)', minHeight: 500 }} id="chatContainer">
          {/* PANEL ČLENŮ */}
          <div style={{
            width: 280,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }} id="membersPanel">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-dimmer)' }}>
                Členové ({members.length})
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
              {members.map((m) => {
                const ini = (m.first_name?.[0] ?? '').toUpperCase() + (m.last_name?.[0] ?? '').toUpperCase()
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px' }}>
                    {m.profile_picture ? (
                      <img src={`/uploads/profiles/${m.profile_picture}`} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{ini}</div>
                    )}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        {m.first_name} {m.last_name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dimmer)' }}>{m.role}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* CHAT OBLAST */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {/* Zprávy */}
            <div
              id="messagesContainer"
              style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {messages.map((msg) => {
                const isOwn = msg.user_id === layoutUser.id
                const ini = (msg.first_name?.[0] ?? '').toUpperCase() + (msg.last_name?.[0] ?? '').toUpperCase()

                return (
                  <div key={msg.id} style={{ display: 'flex', gap: 10, flexDirection: isOwn ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                    {msg.profile_picture ? (
                      <img src={`/uploads/profiles/${msg.profile_picture}`} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div className="user-avatar" style={{ width: 36, height: 36, fontSize: 13, flexShrink: 0 }}>{ini}</div>
                    )}
                    <div style={{ maxWidth: '70%' }}>
                      {!isOwn && (
                        <div style={{ fontSize: 12, color: 'var(--text-dimmer)', marginBottom: 4 }}>
                          {msg.first_name} {msg.last_name} · {msg.role}
                        </div>
                      )}
                      <div style={{
                        background: isOwn ? 'var(--red)' : 'var(--bg-surface)',
                        color: isOwn ? 'var(--red-text)' : 'var(--text)',
                        borderRadius: isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        padding: '10px 14px',
                        fontSize: 14,
                        lineHeight: 1.5,
                        border: isOwn ? 'none' : '1px solid var(--border)',
                        wordBreak: 'break-word',
                      }}>
                        {msg.message}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dimmer)', marginTop: 4, textAlign: isOwn ? 'right' : 'left' }}>
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <form onSubmit={sendMessage} style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Napište zprávu…"
                  className="form-input"
                  style={{ flex: 1 }}
                  id="messageInput"
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!newMessage.trim() || sending || !user}
                  style={{ width: 'auto', padding: '10px 20px' }}
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
    </DashboardLayout>
  )
}
