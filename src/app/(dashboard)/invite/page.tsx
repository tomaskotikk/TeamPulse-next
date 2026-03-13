'use client'

import { FormEvent, useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Topbar from '@/components/Topbar'

type AppUser = {
  id: number
  first_name: string
  last_name: string
  role: string
  organization: string | null
  profile_picture: string | null
}

type InviteRole = 'hráč' | 'trenér' | 'rodič'

export default function InvitePage() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [themeVars, setThemeVars] = useState<Record<string, string>>({})
  const [loadingContext, setLoadingContext] = useState(true)

  const isManager = user?.role === 'manažer'

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InviteRole>('hráč')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadContext() {
      try {
        const res = await fetch('/api/app/context', { cache: 'no-store' })
        if (!res.ok) {
          window.location.href = '/login'
          return
        }

        const data = await res.json()
        if (!mounted) return
        setUser(data.user)
        setThemeVars(data.themeVars ?? {})
      } catch {
        if (mounted) setErrorMsg('Nepodařilo se načíst kontext uživatele.')
      } finally {
        if (mounted) setLoadingContext(false)
      }
    }

    loadContext()
    return () => {
      mounted = false
    }
  }, [])

  const layoutUser = user ?? {
    id: 0,
    first_name: '',
    last_name: '',
    role: '',
    organization: null,
    profile_picture: null,
  }

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !role) {
      setErrorMsg('Vyplňte prosím e-mail i roli.')
      setSuccessMsg(null)
      return
    }

    if (!isValidEmail(normalizedEmail)) {
      setErrorMsg('Neplatný formát e-mailu.')
      setSuccessMsg(null)
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await fetch('/api/invite/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, role }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Nepodařilo se odeslat pozvánku.')
      }

      setSuccessMsg(data.message ?? `Pozvánka byla odeslána na ${normalizedEmail}.`)
      setEmail('')
      setRole('hráč')
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Nepodařilo se odeslat e-mail. Zkuste to prosím znovu.')
    } finally {
      setLoading(false)
    }
  }

  if (!isManager) {
    return (
      <DashboardLayout user={layoutUser} isManager={false} themeVars={themeVars}>
        <Topbar title="Pozvat členy" backHref="/dashboard" backLabel="Zpět" />
        <div className="app-content">
          {loadingContext && <div className="section"><div className="section-content">Načítání…</div></div>}
          <div className="empty-state">
            <h3>Přístup zamítnut</h3>
            <p>Tuto stránku mohou používat pouze manažeři klubu.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={layoutUser} isManager={true} themeVars={themeVars}>
      <Topbar title="Pozvat členy" backHref="/members" backLabel="Zpět na členy" />

      <div className="app-content">
        {loadingContext && <div className="section"><div className="section-content">Načítání…</div></div>}
        <div className="content-header">
          <h2 className="content-title">Pozvat nové členy</h2>
          <p className="content-subtitle">
            Pošlete pozvánku do klubu e-mailem. Odkaz v pozvánce bude časově omezený.
          </p>
        </div>

        {successMsg && (
          <div className="alert alert-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>{successMsg}</div>
          </div>
        )}

        {errorMsg && (
          <div className="alert alert-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>{errorMsg}</div>
          </div>
        )}

        <div className="section">
          <div className="section-header">
            <h3 className="section-title">Nová pozvánka</h3>
            <p className="section-description">Vyplňte e-mail adresáta a roli v týmu</p>
          </div>

          <div className="section-content">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="napr. hrac@email.cz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="form-help">Na tuto adresu bude odeslána pozvánka do klubu.</p>
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as InviteRole)}
                >
                  <option value="hráč">Hráč</option>
                  <option value="trenér">Trenér</option>
                  <option value="rodič">Rodič</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Odesílám pozvánku...' : 'Odeslat pozvánku'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
