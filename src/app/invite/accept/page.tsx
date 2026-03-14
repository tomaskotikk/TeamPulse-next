'use client'

import Link from 'next/link'
import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type InviteInfo = {
  email: string
  role: string
  club_name: string
  expires_at: string
}

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams])

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadInvite() {
      if (!token) {
        setError('Neplatný odkaz pozvánky.')
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/invite/accept?token=${encodeURIComponent(token)}`, {
          cache: 'no-store',
        })

        const data = await res.json()
        if (cancelled) return

        if (!res.ok) {
          setError(data.error ?? 'Pozvánka není dostupná.')
          return
        }

        setInvite(data.invitation)
      } catch {
        if (!cancelled) setError('Nastala chyba serveru. Zkuste to znovu.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadInvite()
    return () => {
      cancelled = true
    }
  }, [token])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    const firstName = (e.currentTarget.elements.namedItem('first_name') as HTMLInputElement).value
    const lastName = (e.currentTarget.elements.namedItem('last_name') as HTMLInputElement).value
    const phone = (e.currentTarget.elements.namedItem('phone') as HTMLInputElement).value
    const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value
    const passwordConfirm = (e.currentTarget.elements.namedItem('password_confirm') as HTMLInputElement).value

    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          firstName,
          lastName,
          phone,
          password,
          passwordConfirm,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Nepodařilo se dokončit registraci.')
        return
      }

      setSuccess('Registrace byla úspěšná. Nyní se můžete přihlásit.')
      e.currentTarget.reset()
    } catch {
      setError('Nastala chyba serveru. Zkuste to znovu.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Přijmout pozvánku</h1>
        <p className="login-subtitle">Dokončete registraci do klubu TeamPulse.</p>

        {loading && <div className="alert alert-info">Načítám pozvánku…</div>}

        {!loading && error && <div className="login-error">{error}</div>}
        {!loading && success && <div className="alert alert-success">{success}</div>}

        {!loading && invite && !success && (
          <>
            <div className="alert alert-info" style={{ marginBottom: 20 }}>
              Klub: <strong>{invite.club_name}</strong><br />
              Role: <strong>{invite.role}</strong><br />
              E-mail: <strong>{invite.email}</strong>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="first_name" className="form-label">Jméno</label>
                <input id="first_name" name="first_name" className="form-input" required />
              </div>

              <div className="form-group">
                <label htmlFor="last_name" className="form-label">Příjmení</label>
                <input id="last_name" name="last_name" className="form-input" required />
              </div>

              <div className="form-group">
                <label htmlFor="phone" className="form-label">Telefon</label>
                <input id="phone" name="phone" className="form-input" />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">Heslo</label>
                <input id="password" name="password" type="password" className="form-input" minLength={6} required />
              </div>

              <div className="form-group">
                <label htmlFor="password_confirm" className="form-label">Potvrdit heslo</label>
                <input
                  id="password_confirm"
                  name="password_confirm"
                  type="password"
                  className="form-input"
                  minLength={6}
                  required
                />
              </div>

              <button type="submit" className="login-btn" disabled={submitting}>
                {submitting ? 'Dokončuji registraci…' : 'Dokončit registraci'}
              </button>
            </form>
          </>
        )}

        <div className="login-links">
          <Link href="/login">Zpět na přihlášení</Link>
        </div>
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="login-page"><div className="login-card">Načítání…</div></div>}>
      <AcceptInviteContent />
    </Suspense>
  )
}
