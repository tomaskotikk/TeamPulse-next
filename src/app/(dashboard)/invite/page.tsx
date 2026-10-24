'use client'

import { FormEvent, useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Topbar from '@/components/Topbar'
import styles from './invite.module.css'

type AppUser = {
  id: number
  first_name: string
  last_name: string
  role: string
  organization: string | null
  profile_picture: string | null
}

type InviteRole = 'hráč' | 'trenér' | 'rodič'

const ROLE_OPTIONS: Array<{ value: InviteRole; label: string; description: string }> = [
  { value: 'hráč', label: 'Hráč', description: 'Vyplní přihlášku, u nezletilých schvaluje rodič.' },
  { value: 'trenér', label: 'Trenér', description: 'Plánuje události a vidí údaje hráčů.' },
  { value: 'rodič', label: 'Rodič', description: 'Sleduje program a údaje svých dětí.' },
]

const PLAYER_STEPS = [
  'Hráči přijde e-mail s odkazem na přihlášku.',
  'Vyplní osobní údaje, zdraví a kontakty.',
  'Přihláška se objeví v sekci Přihlášky ke schválení.',
  'U nezletilých se po schválení zaregistruje rodič a aktivují se oba účty.',
]

const OTHER_STEPS = [
  'Adresátovi přijde e-mail s odkazem.',
  'Dokončí registraci a nastaví si heslo.',
  'Účet je aktivní a člen se objeví v seznamu.',
]

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
        <div className="page-intro">
          <div className="page-intro-meta">Nábor klubu</div>
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

        <div className={styles.layout}>
          <div className="section">
            <div className="section-header">
              <h3 className="section-title">Nová pozvánka</h3>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="invite-email" className="form-label">E-mail adresáta</label>
                <input
                  id="invite-email"
                  type="email"
                  className="form-input"
                  placeholder="např. hrac@email.cz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>

              <fieldset className={styles.field}>
                <legend className="form-label">Role v klubu</legend>
                <div className={styles.roles}>
                  {ROLE_OPTIONS.map((option) => (
                    <label key={option.value} className={`${styles.role} ${role === option.value ? styles.roleActive : ''}`}>
                      <input
                        type="radio"
                        name="role"
                        value={option.value}
                        checked={role === option.value}
                        onChange={() => setRole(option.value)}
                      />
                      <span className={styles.roleTitle}>{option.label}</span>
                      <span className={styles.roleDesc}>{option.description}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className={styles.actions}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Odesílám…' : 'Odeslat pozvánku'}
                </button>
                <span className={styles.hint}>Odkaz v e-mailu platí {role === 'hráč' ? '7 dní' : '1 hodinu'}.</span>
              </div>
            </form>
          </div>

          <aside className="section">
            <div className="section-header">
              <h3 className="section-title">Co se stane po odeslání</h3>
            </div>
            <ol className={styles.steps}>
              {(role === 'hráč' ? PLAYER_STEPS : OTHER_STEPS).map((step, i) => (
                <li key={step}>
                  <span className={styles.stepNum}>{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  )
}
