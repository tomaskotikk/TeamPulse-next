'use client'

import Link from 'next/link'
import { FormEvent, Suspense, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AuthShowcaseLayout from '@/components/AuthShowcaseLayout'

function PasswordResetContent() {
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const requestRef = useRef(0)

  async function safeReadJson(response: Response) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }

  async function handleRequestReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return

    const requestId = ++requestRef.current
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

      const data = await safeReadJson(res)
      if (!res.ok) {
        if (requestRef.current !== requestId) return
        setSuccess(null)
        setError(data?.error ?? 'Nepodařilo se odeslat reset e-mail.')
        return
      }

      if (requestRef.current !== requestId) return
      setError(null)
      setSuccess(data?.message ?? 'Pokud je e-mail registrován, byl odeslán reset odkaz.')
      e.currentTarget.reset()
    } catch {
      if (requestRef.current !== requestId) return
      setSuccess(null)
      setError('Nastala chyba serveru. Zkuste to znovu.')
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false)
      }
    }
  }

  async function handleSetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return

    const requestId = ++requestRef.current
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

      const data = await safeReadJson(res)
      if (!res.ok) {
        if (requestRef.current !== requestId) return
        setSuccess(null)
        setError(data?.error ?? 'Nepodařilo se změnit heslo.')
        return
      }

      if (requestRef.current !== requestId) return
      setError(null)
      setSuccess('Heslo bylo úspěšně změněno. Nyní se můžete přihlásit.')
      e.currentTarget.reset()
    } catch {
      if (requestRef.current !== requestId) return
      setSuccess(null)
      setError('Nastala chyba serveru. Zkuste to znovu.')
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false)
      }
    }
  }

  const isSetPasswordMode = Boolean(token)
  const visibleError = success ? null : error

  return (
    <AuthShowcaseLayout
      title={isSetPasswordMode ? 'Nastavit nové heslo' : 'Zapomenuté heslo'}
      subtitle={
        isSetPasswordMode
          ? 'Zadejte své nové heslo pro účet TeamPulse'
          : 'Zadejte svůj e-mail a my vám pošleme odkaz pro obnovení hesla'
      }
    >
      <div className="auth-form-panel">
        <h2>{isSetPasswordMode ? 'Nastavit nové heslo' : 'Obnovit heslo'}</h2>
        <p className="auth-note">
          {isSetPasswordMode
            ? 'Vytvořte si nové, bezpečné heslo pro váš účet.'
            : 'Zadejte e-mailovou adresu spojenou s vaším účtem a my vám pošleme odkaz pro vytvoření nového hesla.'}
        </p>

        {visibleError && <div className="auth-feedback error">{visibleError}</div>}
        {success && <div className="auth-feedback success">{success}</div>}

        {!isSetPasswordMode ? (
          <form onSubmit={handleRequestReset}>
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

            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? 'Odesílám…' : 'Odeslat odkaz'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSetPassword}>
            <div className="form-group">
              <label htmlFor="new_password" className="form-label">Nové heslo *</label>
              <input
                id="new_password"
                name="new_password"
                type="password"
                className="form-input"
                minLength={6}
                required
              />
              <p className="form-help">Minimálně 6 znaků</p>
            </div>

            <div className="form-group">
              <label htmlFor="confirm_password" className="form-label">Potvrzení hesla *</label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                className="form-input"
                minLength={6}
                required
              />
            </div>

            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? 'Ukládám…' : 'Nastavit nové heslo'}
            </button>
          </form>
        )}

        <p className="auth-switch">
          Vzpomněli jste si na heslo? <Link href="/login">Přihlaste se.</Link>
        </p>
      </div>
    </AuthShowcaseLayout>
  )
}

export default function PasswordResetPage() {
  return (
    <Suspense fallback={<div className="login-page"><div className="login-card">Načítání…</div></div>}>
      <PasswordResetContent />
    </Suspense>
  )
}
