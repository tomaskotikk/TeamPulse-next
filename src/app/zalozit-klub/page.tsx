'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useRef, useState } from 'react'
import PublicNavbar from '@/components/PublicNavbar'

type RegisterFormState = {
  club_name: string
  sport: string
  city: string
  address: string
  ico: string
  dic: string
  website: string
  club_email: string
  club_phone: string
  first_name: string
  last_name: string
  email: string
  phone: string
  password: string
  password_confirm: string
  terms: boolean
}

const INITIAL_FORM: RegisterFormState = {
  club_name: '',
  sport: '',
  city: '',
  address: '',
  ico: '',
  dic: '',
  website: '',
  club_email: '',
  club_phone: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  password_confirm: '',
  terms: false,
}

type VerificationWatchState = {
  pendingId: number
  managerEmail: string
  managerPassword: string
  clubName: string
}

export default function CreateClubPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formState, setFormState] = useState<RegisterFormState>(INITIAL_FORM)
  const [verificationWatch, setVerificationWatch] = useState<VerificationWatchState | null>(null)
  const [verificationInfo, setVerificationInfo] = useState<string>('Čekáme na potvrzení e-mailu…')
  const [verifyingRedirect, setVerifyingRedirect] = useState(false)
  const redirectTriggeredRef = useRef(false)

  const isVerificationPending = Boolean(verificationWatch)

  useEffect(() => {
    if (!verificationWatch) return
    const watch: VerificationWatchState = verificationWatch

    let cancelled = false
    let timerId: number | null = null

    async function checkStatus() {
      if (cancelled || redirectTriggeredRef.current) return

      try {
        const res = await fetch('/api/club/registration-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pendingId: watch.pendingId,
            email: watch.managerEmail,
          }),
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok || cancelled) return

        if (data.status === 'pending') {
          setVerificationInfo('Čekáme na potvrzení e-mailu. Jakmile kliknete na odkaz v telefonu, stránka se dokončí automaticky.')
          return
        }

        if (data.status === 'verified') {
          redirectTriggeredRef.current = true
          setVerifyingRedirect(true)
          setVerificationInfo('E-mail je ověřený. Přihlašujeme vás a přesměrováváme na čekací stránku…')

          const loginRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: watch.managerEmail,
              password: watch.managerPassword,
              rememberMe: false,
            }),
          })

          const loginData = await loginRes.json().catch(() => ({}))

          if (!loginRes.ok || loginData?.requires2FA) {
            setVerifyingRedirect(false)
            setVerificationInfo('E-mail je ověřen, ale nepodařilo se vás automaticky přihlásit. Pokračujte prosím ručně přes přihlášení.')
            return
          }

          window.location.href = '/awaiting-approval'
          return
        }

        if (data.status === 'expired') {
          setVerificationWatch(null)
          setSuccess(null)
          setVerificationInfo('Verifikační odkaz vypršel. Vyplňte prosím formulář znovu.')
          setError('Verifikační odkaz vypršel. Vyplňte prosím formulář znovu.')
          return
        }

        setVerificationInfo('Dokončujeme kontrolu registrace…')
      } catch {
        // Ignore transient polling errors.
      }
    }

    void checkStatus()
    timerId = window.setInterval(checkStatus, 3500)

    const onVisibility = () => {
      if (!document.hidden) {
        void checkStatus()
      }
    }

    const onFocus = () => {
      void checkStatus()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      if (timerId) window.clearInterval(timerId)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      redirectTriggeredRef.current = false
    }
  }, [verificationWatch])

  function updateField<K extends keyof RegisterFormState>(key: K, value: RegisterFormState[K]) {
    setFormState((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return

    const payload = {
      ...formState,
      club_name: formState.club_name.trim(),
      sport: formState.sport.trim(),
      city: formState.city.trim(),
      address: formState.address.trim(),
      ico: formState.ico.trim(),
      dic: formState.dic.trim(),
      website: formState.website.trim(),
      club_email: formState.club_email.trim(),
      club_phone: formState.club_phone.trim(),
      first_name: formState.first_name.trim(),
      last_name: formState.last_name.trim(),
      email: formState.email.trim(),
      phone: formState.phone.trim(),
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/club/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Nepodařilo se odeslat registraci.')
        return
      }

      setSuccess(data.message || 'Registrace byla odeslána.')
      setVerificationWatch({
        pendingId: Number(data.pendingId),
        managerEmail: String(data.managerEmail || payload.email),
        managerPassword: payload.password,
        clubName: String(data.clubName || payload.club_name),
      })
      setVerificationInfo('Ověřte e-mail správce. Po potvrzení vás automaticky přesměrujeme na čekací stránku.')
    } catch {
      setError('Nastala chyba serveru. Zkuste to prosím znovu.')
    } finally {
      setLoading(false)
    }
  }

  const isCompleted = isVerificationPending || Boolean(success)
  const phase = isCompleted ? 3 : step

  function handleContinueToAdmin() {
    if (
      !formState.club_name.trim() ||
      !formState.sport.trim() ||
      !formState.city.trim() ||
      !formState.address.trim() ||
      !formState.ico.trim() ||
      !formState.dic.trim() ||
      !formState.website.trim() ||
      !formState.club_email.trim() ||
      !formState.club_phone.trim()
    ) {
      setError('Vyplňte prosím všechny povinné údaje v detailu klubu.')
      return
    }

    setError(null)
    setStep(2)
  }

  return (
    <div className={`club-create-page club-create-page--step-${phase}`}>
      <PublicNavbar />

      <main className="club-create-main">
        <section className="club-create-hero">
          <p className="club-create-kicker">Založení klubu</p>
          <h1>Vytvořte klub během pár minut</h1>
          <p>
            Připravili jsme jednoduchého průvodce. Nejprve nastavíte klub, potom správce.
            Po odeslání vám přijde ověřovací e-mail.
          </p>
        </section>

        <section className="club-create-grid">
          <aside className="club-create-side">
            <div className="club-create-side-card">
              <h3>Jak to probíhá</h3>
              <div className="club-create-map" aria-label="Průběh založení klubu">
                <div className={`club-create-map-step ${phase >= 1 ? 'active' : ''} ${phase > 1 ? 'done' : ''}`}>
                  <span className="club-create-map-dot">1</span>
                  <div>
                    <strong>Detail klubu</strong>
                    <p>Základní údaje a kontakty</p>
                  </div>
                </div>

                <div className={`club-create-map-step ${phase >= 2 ? 'active' : ''} ${phase > 2 ? 'done' : ''}`}>
                  <span className="club-create-map-dot">2</span>
                  <div>
                    <strong>Účet správce</strong>
                    <p>Vytvoření přístupu</p>
                  </div>
                </div>

                <div className={`club-create-map-step ${phase >= 3 ? 'active' : ''}`}>
                  <span className="club-create-map-dot">3</span>
                  <div>
                    <strong>Ověření e-mailem</strong>
                    <p>Aktivace registrace</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="club-create-side-note">
              <h4>Proč TeamPulse</h4>
              <p>Správa členů, komunikace, dokumenty i klubové procesy na jednom místě.</p>
            </div>
          </aside>

          <div className="club-create-card">
            {error && <div className="club-create-feedback error">{error}</div>}
            {success && !isVerificationPending && <div className="club-create-feedback success">{success}</div>}

            {isVerificationPending && verificationWatch && (
              <section className="club-create-verify-screen" aria-live="polite">
                <div className="club-create-verify-icon" aria-hidden="true">✓</div>
                <h2>Ověřte e-mail správce</h2>
                <p className="club-create-verify-main">
                  Na adresu <strong>{verificationWatch.managerEmail}</strong> jsme poslali ověřovací odkaz.
                </p>
                <p className="club-create-verify-sub">
                  Jakmile odkaz potvrdíte třeba na telefonu, žádost klubu <strong>{verificationWatch.clubName}</strong> se propíše i sem a stránka vás automaticky přesměruje na čekací stav.
                </p>
                <div className="club-create-verify-status">
                  {verifyingRedirect ? 'Přihlašujeme a přesměrováváme…' : verificationInfo}
                </div>
                <div className="club-create-verify-actions">
                  <Link href="/login" className="club-create-btn ghost">Přejít na přihlášení</Link>
                </div>
              </section>
            )}

            <form onSubmit={handleSubmit} style={isVerificationPending ? { display: 'none' } : undefined}>
              {step === 1 && (
                <div className="club-create-step" key="club-step">
                  <h2>Detail klubu</h2>
                  <p>Vyplňte základní údaje o klubu a kontaktní informace.</p>

                  <div className="club-create-field">
                    <label htmlFor="club_name">Název klubu *</label>
                    <input
                      id="club_name"
                      name="club_name"
                      className="form-input"
                      required
                      value={formState.club_name}
                      onChange={(e) => updateField('club_name', e.target.value)}
                    />
                  </div>

                  <div className="club-create-row">
                    <div className="club-create-field">
                      <label htmlFor="sport">Sport *</label>
                      <input
                        id="sport"
                        name="sport"
                        className="form-input"
                        required
                        value={formState.sport}
                        onChange={(e) => updateField('sport', e.target.value)}
                      />
                    </div>
                    <div className="club-create-field">
                      <label htmlFor="city">Město *</label>
                      <input
                        id="city"
                        name="city"
                        className="form-input"
                        required
                        value={formState.city}
                        onChange={(e) => updateField('city', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="club-create-field">
                    <label htmlFor="address">Adresa *</label>
                    <input
                      id="address"
                      name="address"
                      className="form-input"
                      required
                      value={formState.address}
                      onChange={(e) => updateField('address', e.target.value)}
                    />
                  </div>

                  <div className="club-create-row">
                    <div className="club-create-field">
                      <label htmlFor="ico">IČO *</label>
                      <input
                        id="ico"
                        name="ico"
                        className="form-input"
                        required
                        value={formState.ico}
                        onChange={(e) => updateField('ico', e.target.value)}
                      />
                    </div>
                    <div className="club-create-field">
                      <label htmlFor="dic">DIČ *</label>
                      <input
                        id="dic"
                        name="dic"
                        className="form-input"
                        required
                        value={formState.dic}
                        onChange={(e) => updateField('dic', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="club-create-field">
                    <label htmlFor="website">Web *</label>
                    <input
                      id="website"
                      name="website"
                      className="form-input"
                      placeholder="https://..."
                      required
                      value={formState.website}
                      onChange={(e) => updateField('website', e.target.value)}
                    />
                  </div>

                  <div className="club-create-row">
                    <div className="club-create-field">
                      <label htmlFor="club_email">Klubový e-mail *</label>
                      <input
                        id="club_email"
                        name="club_email"
                        type="email"
                        className="form-input"
                        required
                        value={formState.club_email}
                        onChange={(e) => updateField('club_email', e.target.value)}
                      />
                    </div>
                    <div className="club-create-field">
                      <label htmlFor="club_phone">Klubový telefon *</label>
                      <input
                        id="club_phone"
                        name="club_phone"
                        className="form-input"
                        required
                        value={formState.club_phone}
                        onChange={(e) => updateField('club_phone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="club-create-actions">
                    <button type="button" className="club-create-btn primary" onClick={handleContinueToAdmin}>
                      Pokračovat na správce
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="club-create-step" key="admin-step">
                  <h2>Účet správce</h2>
                  <p>Tento účet bude mít plnou správu klubu v TeamPulse.</p>

                  <div className="club-create-row">
                    <div className="club-create-field">
                      <label htmlFor="first_name">Jméno správce *</label>
                      <input
                        id="first_name"
                        name="first_name"
                        className="form-input"
                        required
                        value={formState.first_name}
                        onChange={(e) => updateField('first_name', e.target.value)}
                      />
                    </div>
                    <div className="club-create-field">
                      <label htmlFor="last_name">Příjmení správce *</label>
                      <input
                        id="last_name"
                        name="last_name"
                        className="form-input"
                        required
                        value={formState.last_name}
                        onChange={(e) => updateField('last_name', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="club-create-row">
                    <div className="club-create-field">
                      <label htmlFor="email">Přihlašovací e-mail *</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        className="form-input"
                        required
                        value={formState.email}
                        onChange={(e) => updateField('email', e.target.value)}
                      />
                    </div>
                    <div className="club-create-field">
                      <label htmlFor="phone">Telefon</label>
                      <input
                        id="phone"
                        name="phone"
                        className="form-input"
                        value={formState.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="club-create-row">
                    <div className="club-create-field">
                      <label htmlFor="password">Heslo *</label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        className="form-input"
                        minLength={6}
                        required
                        value={formState.password}
                        onChange={(e) => updateField('password', e.target.value)}
                      />
                    </div>
                    <div className="club-create-field">
                      <label htmlFor="password_confirm">Potvrzení hesla *</label>
                      <input
                        id="password_confirm"
                        name="password_confirm"
                        type="password"
                        className="form-input"
                        minLength={6}
                        required
                        value={formState.password_confirm}
                        onChange={(e) => updateField('password_confirm', e.target.value)}
                      />
                    </div>
                  </div>

                  <label className="club-create-terms">
                    <input
                      id="terms"
                      name="terms"
                      type="checkbox"
                      required
                      checked={formState.terms}
                      onChange={(e) => updateField('terms', e.target.checked)}
                    />
                    Souhlasím se zpracováním osobních údajů.
                  </label>

                  <div className="club-create-actions split">
                    <button type="button" className="club-create-btn ghost" onClick={() => setStep(1)}>
                      Zpět
                    </button>
                    <button type="submit" className="club-create-btn primary" disabled={loading}>
                      {loading ? 'Odesílám…' : 'Vytvořit registraci'}
                    </button>
                  </div>
                </div>
              )}
            </form>

            <p className="club-create-login-link">
              Už máte účet? <Link href="/login">Přihlaste se.</Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
