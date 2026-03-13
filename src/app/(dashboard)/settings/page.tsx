'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Topbar from '@/components/Topbar'

type AppUser = {
  id: number
  first_name: string
  last_name: string
  email: string
  role: string
  organization: string | null
  profile_picture: string | null
  two_factor_enabled: boolean
}

type AppClub = {
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
}

export default function SettingsPage() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [club, setClub] = useState<AppClub | null>(null)
  const [themeVars, setThemeVars] = useState<Record<string, string>>({})
  const [loadingContext, setLoadingContext] = useState(true)

  const isManager = user?.role === 'manažer'

  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [twoFA, setTwoFA] = useState(false)

  const [primaryColor, setPrimaryColor] = useState('#E43432')
  const [secondaryColor, setSecondaryColor] = useState('#000000')
  const [accentColor, setAccentColor] = useState('#FFFFFF')

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
        setClub(data.club)
        setThemeVars(data.themeVars ?? {})
        setTwoFA(Boolean(data.user?.two_factor_enabled))
        setPrimaryColor(data.club?.primary_color ?? '#E43432')
        setSecondaryColor(data.club?.secondary_color ?? '#000000')
        setAccentColor(data.club?.accent_color ?? '#FFFFFF')
      } catch {
        if (mounted) showError('Nepodařilo se načíst nastavení.')
      } finally {
        if (mounted) setLoadingContext(false)
      }
    }

    loadContext()

    return () => {
      mounted = false
    }
  }, [])

  function showSuccess(msg: string) {
    setSuccessMsg(msg)
    setErrorMsg(null)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  function showError(msg: string) {
    setErrorMsg(msg)
    setSuccessMsg(null)
  }

  async function handleToggle2FA() {
    const next = !twoFA

    const res = await fetch('/api/settings/two-factor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: next }),
    })

    const data = await res.json()
    if (!res.ok) {
      showError(data.error ?? 'Nepodařilo se změnit 2FA.')
      return
    }

    setTwoFA(next)
    setUser((prev) => (prev ? { ...prev, two_factor_enabled: next } : prev))
    showSuccess(next ? 'Dvoufázové ověření bylo zapnuto.' : 'Dvoufázové ověření bylo vypnuto.')
  }

  async function handleSaveColors(e: React.FormEvent) {
    e.preventDefault()

    const res = await fetch('/api/settings/colors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primaryColor, secondaryColor, accentColor }),
    })

    const data = await res.json()
    if (!res.ok) {
      showError(data.error ?? 'Nepodařilo se uložit barvy klubu.')
      return
    }

    showSuccess('Barvy klubu byly úspěšně uloženy.')
    setThemeVars((prev) => ({
      ...prev,
      '--red': primaryColor,
      '--bg': secondaryColor,
      '--text': accentColor,
    }))
  }

  const layoutUser = user ?? {
    id: 0,
    first_name: '',
    last_name: '',
    email: '',
    role: '',
    organization: null,
    profile_picture: null,
    two_factor_enabled: false,
  }

  return (
    <DashboardLayout user={layoutUser} isManager={isManager} themeVars={themeVars}>
      <Topbar title="Nastavení" backHref="/dashboard" backLabel="Zpět" />

      <div className="app-content">
        {loadingContext && (
          <div className="section" style={{ marginBottom: 16 }}>
            <div className="section-content">Načítání nastavení…</div>
          </div>
        )}

        <div className="content-header">
          <h2 className="content-title">Nastavení</h2>
          <p className="content-subtitle">Spravujte nastavení účtu a aplikace</p>
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

        {/* BEZPEČNOST */}
        <div className="section">
          <div className="section-header">
            <h3 className="section-title">Bezpečnost</h3>
            <p className="section-description">Nastavení přihlašování a ověření</p>
          </div>
          <div className="section-content">
            {/* 2FA */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Dvoufázové ověření</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                  {twoFA ? 'Zapnuto – přihlášení vyžaduje zadání kódu z e-mailu' : 'Vypnuto – doporučujeme zapnout pro větší bezpečnost'}
                </div>
              </div>
              <button
                onClick={handleToggle2FA}
                className={`btn ${twoFA ? 'btn-secondary' : 'btn-primary'}`}
                style={{ width: 'auto', minWidth: 100 }}
              >
                {twoFA ? 'Vypnout' : 'Zapnout'}
              </button>
            </div>
          </div>
        </div>

        {/* BARVY KLUBU - jen pro manažery */}
        {isManager && (
          <div className="section">
            <div className="section-header">
              <h3 className="section-title">Barvy klubu</h3>
              <p className="section-description">Přizpůsobte barevné schéma vašeho klubu</p>
            </div>
            <div className="section-content">
              <form onSubmit={handleSaveColors}>
                <div className="grid-2" style={{ gap: 20 }}>
                  <div className="form-group">
                    <label className="form-label">Primární barva</label>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        style={{ width: 48, height: 40, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: 2, background: 'var(--bg)' }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#E43432"
                        style={{ flex: 1 }}
                      />
                    </div>
                    <p className="form-help">Hlavní barva tlačítek, avatarů a akcentů</p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Sekundární barva</label>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        style={{ width: 48, height: 40, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: 2, background: 'var(--bg)' }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        placeholder="#000000"
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Doplňková barva textu</label>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        style={{ width: 48, height: 40, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: 2, background: 'var(--bg)' }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        placeholder="#FFFFFF"
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Náhled */}
                <div style={{ marginTop: 20, padding: 20, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-dimmer)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Náhled</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      style={{ padding: '10px 20px', borderRadius: 6, border: 'none', background: primaryColor, color: accentColor, fontWeight: 600, fontFamily: 'inherit', cursor: 'default' }}
                    >
                      Primární tlačítko
                    </button>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accentColor, fontWeight: 700, fontSize: 14 }}>AB</div>
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>
                    Uložit barvy
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* INFORMACE O ÚČTU */}
        <div className="section">
          <div className="section-header">
            <h3 className="section-title">Informace o účtu</h3>
          </div>
          <div className="section-content">
            <div className="data-row">
              <span className="data-label">E-mail</span>
              <span className="data-value">{user?.email ?? ''}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Role</span>
              <span className="data-value">{user?.role ?? ''}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Klub</span>
              <span className="data-value">{user?.organization ?? '–'}</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
