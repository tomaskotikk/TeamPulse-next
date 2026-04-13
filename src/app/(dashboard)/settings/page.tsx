'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Topbar from '@/components/Topbar'
import {
  Building2,
  KeyRound,
  Mail,
  Palette,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
  BadgeCheck,
} from 'lucide-react'

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

export default function SettingsPage() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [themeVars, setThemeVars] = useState<Record<string, string>>({})
  const [loadingContext, setLoadingContext] = useState(true)

  const isManager = user?.role === 'manažer'

  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [twoFA, setTwoFA] = useState(false)

  const [primaryColor, setPrimaryColor] = useState('#FF3300')
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
        setThemeVars(data.themeVars ?? {})
        setTwoFA(Boolean(data.user?.two_factor_enabled))
        setPrimaryColor(data.club?.primary_color ?? '#FF3300')
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
    setThemeVars(data.themeVars ?? {})
  }

  function applyDefaultPalette() {
    setPrimaryColor('#FF3300')
    setSecondaryColor('#000000')
    setAccentColor('#FFFFFF')
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

  if (loadingContext) {
    return (
      <DashboardLayout user={layoutUser} isManager={isManager} themeVars={themeVars}>
        <Topbar title="Nastavení" backHref="/dashboard" backLabel="Zpět" />
        <div className="app-content">
          <div className="section settings-loading-card">
            <div className="section-content settings-loading-content">
              <div className="settings-loading-icon">
                <Sparkles size={18} />
              </div>
              <div>Načítání nastavení…</div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={layoutUser} isManager={isManager} themeVars={themeVars}>
      <Topbar title="Nastavení" backHref="/dashboard" backLabel="Zpět" />

      <div className="app-content">
        <div className="page-intro">
          <div className="page-intro-meta">Správa účtu a klubu</div>
          <h2 className="content-title">Nastavení</h2>
          <p className="content-subtitle">Spravujte nastavení účtu a aplikace</p>
        </div>

        <div className="settings-quick-strip">
          <div className="settings-quick-item">
            <ShieldCheck size={16} />
            <span>Bezpečnost účtu</span>
          </div>
          <div className="settings-quick-item">
            <Palette size={16} />
            <span>Barvy klubu</span>
          </div>
          <div className="settings-quick-item">
            <UserRound size={16} />
            <span>Účet a profil</span>
          </div>
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
            <div className="section-title-with-icon">
              <span className="section-icon-badge">
                <ShieldCheck size={16} />
              </span>
              <div>
                <h3 className="section-title">Bezpečnost</h3>
                <p className="section-description">Nastavení přihlašování a ověření</p>
              </div>
            </div>
          </div>
          <div className="section-content">
            <div className="setting-row">
              <div className="setting-label">
                <div className="setting-label-title">
                  <KeyRound size={16} />
                  Dvoufázové ověření
                </div>
                <div className="setting-label-desc">
                  {twoFA ? 'Zapnuto – přihlášení vyžaduje zadání kódu z e-mailu' : 'Vypnuto – doporučujeme zapnout pro větší bezpečnost'}
                </div>
              </div>
              <button
                onClick={handleToggle2FA}
                className={`btn toggle-btn ${twoFA ? 'btn-secondary' : 'btn-primary'}`}
              >
                <ShieldCheck size={16} />
                {twoFA ? 'Vypnout' : 'Zapnout'}
              </button>
            </div>
          </div>
        </div>

        {/* BARVY KLUBU - jen pro manažery */}
        {isManager && (
          <div className="section">
            <div className="section-header">
              <div className="section-title-with-icon">
                <span className="section-icon-badge">
                  <Palette size={16} />
                </span>
                <div>
                  <h3 className="section-title">Barevné schéma</h3>
                  <p className="section-description">Vytvořte profesionální vzhled aplikace podle identity vašeho klubu</p>
                </div>
              </div>
            </div>
            <div className="section-content">
              <form onSubmit={handleSaveColors} className="theme-editor-form">
                <div className="theme-editor-top">
                  <p className="theme-editor-note">
                    <Sparkles size={15} />
                    Vysoký kontrast mezi pozadím a textem zlepšuje čitelnost celé aplikace.
                  </p>
                  <button type="button" className="btn btn-secondary" onClick={applyDefaultPalette}>
                    <RotateCcw size={16} />
                    Použít výchozí paletu
                  </button>
                </div>

                <div className="theme-color-grid">
                  <div className="theme-color-card">
                    <div className="theme-color-header">
                      <span className="theme-color-dot" style={{ background: primaryColor }} />
                      <div>
                        <label className="form-label">
                          <Palette size={14} />
                          Primární
                        </label>
                        <p className="theme-color-hint">Tlačítka, aktivní prvky, akcenty</p>
                      </div>
                    </div>
                    <div className="color-picker-group">
                      <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                      <input
                        type="text"
                        className="form-input"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#FF3300"
                      />
                    </div>
                  </div>

                  <div className="theme-color-card">
                    <div className="theme-color-header">
                      <span className="theme-color-dot" style={{ background: secondaryColor }} />
                      <div>
                        <label className="form-label">
                          <Building2 size={14} />
                          Sekundární
                        </label>
                        <p className="theme-color-hint">Hlavní pozadí aplikace</p>
                      </div>
                    </div>
                    <div className="color-picker-group">
                      <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
                      <input
                        type="text"
                        className="form-input"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        placeholder="#000000"
                      />
                    </div>
                  </div>

                  <div className="theme-color-card">
                    <div className="theme-color-header">
                      <span className="theme-color-dot" style={{ background: accentColor }} />
                      <div>
                        <label className="form-label">
                          <Sparkles size={14} />
                          Doplňková
                        </label>
                        <p className="theme-color-hint">Text a kontrastní obsah</p>
                      </div>
                    </div>
                    <div className="color-picker-group">
                      <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
                      <input
                        type="text"
                        className="form-input"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>
                </div>

                <div className="theme-preview-modern" style={{ background: secondaryColor, color: accentColor }}>
                  <div className="theme-preview-bar" style={{ borderColor: `${accentColor}22` }}>
                    <div className="theme-preview-brand">TeamPulse</div>
                    <button type="button" className="theme-preview-cta" style={{ background: primaryColor, color: accentColor }}>
                      <Save size={14} />
                      Primární akce
                    </button>
                  </div>
                  <div className="theme-preview-content">
                    <div className="theme-preview-stat" style={{ borderColor: `${primaryColor}55` }}>
                      <div className="theme-preview-stat-label">AKTIVNÍ ČLENOVÉ</div>
                      <div className="theme-preview-stat-value" style={{ color: primaryColor }}>24</div>
                    </div>
                    <div className="theme-preview-user" style={{ borderColor: `${accentColor}22` }}>
                      <div className="theme-preview-avatar" style={{ background: primaryColor, color: accentColor }}>AB</div>
                      <div>
                        <div className="theme-preview-user-name">Anna Berková</div>
                        <div className="theme-preview-user-role">Manažerka klubu</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="theme-editor-actions">
                  <button type="submit" className="btn btn-primary">Uložit změny</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* INFORMACE O ÚČTU */}
        <div className="section">
          <div className="section-header">
            <div className="section-title-with-icon">
              <span className="section-icon-badge">
                <UserRound size={16} />
              </span>
              <div>
                <h3 className="section-title">Profil a účet</h3>
                <p className="section-description">Vaše osobní údaje a role</p>
              </div>
            </div>
          </div>
          <div className="section-content">
            <div className="account-info-grid">
              <div className="account-info-item">
                <span className="data-label"><Mail size={14} /> E-mailová adresa</span>
                <span className="data-value">{user?.email ?? '–'}</span>
              </div>
              <div className="account-info-item">
                <span className="data-label"><BadgeCheck size={14} /> Role v klubu</span>
                <span className="data-value">{user?.role ?? '–'}</span>
              </div>
              <div className="account-info-item">
                <span className="data-label"><Building2 size={14} /> Váš klub</span>
                <span className="data-value">{user?.organization ?? '–'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
