'use client'

import Link from 'next/link'
import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AuthShowcaseLayout from '@/components/AuthShowcaseLayout'
import { MIN_PASSWORD_LENGTH } from '@/lib/onboarding/validation'

type Registration = {
  parent_first_name: string | null
  parent_last_name: string | null
  parent_email: string
  parent_phone: string | null
  child_name: string
  club_name: string
  parent_exists: boolean
  conflict: string | null
}

function ParentRegisterContent() {
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams])

  const [registration, setRegistration] = useState<Registration | null>(null)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!token) {
        setError('Neplatný odkaz.')
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`/api/parent/register?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(data.error ?? 'Odkaz není dostupný.')
          return
        }
        setRegistration(data.registration)
        setPhone(data.registration.parent_phone ?? '')
      } catch {
        if (!cancelled) setError('Nastala chyba serveru. Zkuste to znovu.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [token])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      const res = await fetch('/api/parent/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          phone,
          password: formData.get('password') ?? '',
          passwordConfirm: formData.get('password_confirm') ?? '',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Registraci se nepodařilo dokončit.')
        return
      }
      setDone(true)
    } catch {
      setError('Nastala chyba serveru. Zkuste to znovu.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShowcaseLayout title="Registrace rodiče" subtitle="Aktivujte účet svého dítěte v TeamPulse">
      <div className="auth-form-panel">
        <h2>Registrace rodiče</h2>

        {loading && <div className="auth-feedback success">Načítám…</div>}
        {!loading && error && <div className="auth-feedback error" role="alert">{error}</div>}

        {done && registration && (
          <div className="onb-done">
            <h3>Hotovo</h3>
            <p>
              Účet hráče <strong>{registration.child_name}</strong> i váš rodičovský účet jsou aktivní.
            </p>
            <p>
              <Link href="/login">Přihlásit se</Link>
            </p>
          </div>
        )}

        {!loading && registration && !done && (
          <>
            <div className="onb-invite-meta">
              <span>Dítě <strong>{registration.child_name}</strong></span>
              <span>Klub <strong>{registration.club_name}</strong></span>
            </div>

            {registration.conflict ? (
              <p className="auth-note">{registration.conflict} Kontaktujte prosím manažera klubu.</p>
            ) : registration.parent_exists ? (
              <form onSubmit={handleSubmit}>
                <p className="auth-note">
                  Účet s e-mailem <strong>{registration.parent_email}</strong> už máte. Potvrďte propojení
                  a dítě se přidá k vašemu účtu.
                </p>
                <button type="submit" className="auth-btn-primary" disabled={submitting}>
                  {submitting ? 'Propojuji…' : 'Potvrdit propojení'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit}>
                <p className="auth-note">Zkontrolujte údaje a nastavte si heslo.</p>
                <div className="auth-two-columns">
                  <div className="form-group">
                    <span className="form-label">Jméno</span>
                    <div className="onb-readonly">{registration.parent_first_name} {registration.parent_last_name}</div>
                  </div>
                  <div className="form-group">
                    <span className="form-label">E-mail</span>
                    <div className="onb-readonly">{registration.parent_email}</div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="phone" className="form-label">Telefon *</label>
                  <input
                    id="phone"
                    type="tel"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    required
                  />
                </div>

                <div className="auth-two-columns">
                  <div className="form-group">
                    <label htmlFor="password" className="form-label">Heslo *</label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      className="form-input"
                      minLength={MIN_PASSWORD_LENGTH}
                      autoComplete="new-password"
                      required
                    />
                    <div className="form-help">Alespoň {MIN_PASSWORD_LENGTH} znaků.</div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="password_confirm" className="form-label">Potvrzení hesla *</label>
                    <input
                      id="password_confirm"
                      name="password_confirm"
                      type="password"
                      className="form-input"
                      minLength={MIN_PASSWORD_LENGTH}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="auth-btn-primary" disabled={submitting}>
                  {submitting ? 'Dokončuji…' : 'Dokončit registraci'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </AuthShowcaseLayout>
  )
}

export default function ParentRegisterPage() {
  return (
    <Suspense fallback={<div className="login-page"><div className="login-card">Načítání…</div></div>}>
      <ParentRegisterContent />
    </Suspense>
  )
}
