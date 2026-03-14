'use client'

import Link from 'next/link'
import { FormEvent, Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function PasswordResetContent() {
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleRequestReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value.trim()

    try {
      const res = await fetch('/api/password/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Nepodařilo se odeslat reset e-mail.')
        return
      }

      setSuccess(data.message ?? 'Pokud je e-mail registrován, byl odeslán reset odkaz.')
      e.currentTarget.reset()
    } catch {
      setError('Nastala chyba serveru. Zkuste to znovu.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const newPassword = (e.currentTarget.elements.namedItem('new_password') as HTMLInputElement).value
    const confirmPassword = (e.currentTarget.elements.namedItem('confirm_password') as HTMLInputElement).value

    try {
      const res = await fetch('/api/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Nepodařilo se změnit heslo.')
        return
      }

      setSuccess('Heslo bylo úspěšně změněno. Nyní se můžete přihlásit.')
      e.currentTarget.reset()
    } catch {
      setError('Nastala chyba serveru. Zkuste to znovu.')
    } finally {
      setLoading(false)
    }
  }

  const isSetPasswordMode = Boolean(token)

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">{isSetPasswordMode ? 'Nastavit nové heslo' : 'Zapomenuté heslo'}</h1>
        <p className="login-subtitle">
          {isSetPasswordMode
            ? 'Zadejte nové heslo pro svůj účet TeamPulse.'
            : 'Zadejte svůj e-mail a pošleme vám odkaz pro obnovení hesla.'}
        </p>

        {error && <div className="login-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {!isSetPasswordMode ? (
          <form className="login-form" onSubmit={handleRequestReset}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                placeholder="vas@email.cz"
                required
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Odesílám…' : 'Odeslat reset odkaz'}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleSetPassword}>
            <div className="form-group">
              <label htmlFor="new_password" className="form-label">Nové heslo</label>
              <input
                id="new_password"
                name="new_password"
                type="password"
                className="form-input"
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm_password" className="form-label">Potvrdit heslo</label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                className="form-input"
                minLength={6}
                required
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Ukládám…' : 'Uložit nové heslo'}
            </button>
          </form>
        )}

        <div className="login-links">
          <Link href="/login">Zpět na přihlášení</Link>
        </div>
      </div>
    </div>
  )
}

export default function PasswordResetPage() {
  return (
    <Suspense fallback={<div className="login-page"><div className="login-card">Načítání…</div></div>}>
      <PasswordResetContent />
    </Suspense>
  )
}
