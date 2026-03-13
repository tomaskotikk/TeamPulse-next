'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [show2FA, setShow2FA] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)
  const [rememberMe, setRememberMe] = useState(false)
  const codeRefs = useRef<(HTMLInputElement | null)[]>([])

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setDebugInfo(null)
    setLoading(true)

    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Neplatný e-mail nebo heslo.')
        setDebugInfo(typeof data.debug === 'string' ? data.debug : null)
      } else if (data.requires2FA) {
        setUserId(data.userId)
        setShow2FA(true)
      } else {
        window.location.href = '/dashboard'
      }
    } catch {
      setError('Nastala chyba. Zkuste to prosím znovu.')
    } finally {
      setLoading(false)
    }
  }

  async function handle2FA(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setDebugInfo(null)
    setLoading(true)

    const code = codeRefs.current.map((i) => i?.value ?? '').join('')

    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code, rememberMe }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Neplatný kód.')
        setDebugInfo(typeof data.debug === 'string' ? data.debug : null)
      } else {
        window.location.href = '/dashboard'
      }
    } catch {
      setError('Nastala chyba. Zkuste to prosím znovu.')
    } finally {
      setLoading(false)
    }
  }

  function handleCodeInput(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/, '')
    e.target.value = val
    if (val && index < 5) {
      codeRefs.current[index + 1]?.focus()
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !e.currentTarget.value && index > 0) {
      codeRefs.current[index - 1]?.focus()
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <Image src="/tp-logo.png" alt="TeamPulse" width={80} height={80} priority />
        </div>
        <h1 className="login-title">Přihlášení</h1>
        <p className="login-subtitle">Přihlaste se do svého účtu TeamPulse</p>

        {error && (
          <div className="login-error">
            <div>{error}</div>
            {debugInfo && (
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85, wordBreak: 'break-word' }}>
                Debug: {debugInfo}
              </div>
            )}
          </div>
        )}

        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">E-mail</label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-input"
              placeholder="vas@email.cz"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Heslo</label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-input"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <label className="login-remember">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Zapamatovat si mě na 7 dní
          </label>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Přihlašování…' : 'Přihlásit se'}
          </button>
        </form>

        <div className="login-links">
          <Link href="/password/reset">Zapomněli jste heslo?</Link>
          {' · '}
          <Link href="/">Zpět na úvodní stránku</Link>
        </div>
      </div>

      {/* 2FA Modal */}
      {show2FA && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <div className="modal-title">Dvoufaktorové ověření</div>
            <div className="modal-desc">
              Na váš e-mail byl odeslán 6-místný kód.<br />
              Zadejte ho níže pro dokončení přihlášení.
            </div>

            {error && (
              <div className="login-error" style={{ marginBottom: 16 }}>
                <div>{error}</div>
                {debugInfo && (
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85, wordBreak: 'break-word' }}>
                    Debug: {debugInfo}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handle2FA}>
              <div className="code-inputs">
                {Array.from({ length: 6 }).map((_, i) => (
                  <input
                    key={i}
                    ref={(el) => { codeRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="code-input"
                    onChange={(e) => handleCodeInput(i, e)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Ověřování…' : 'Ověřit kód'}
              </button>

              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => { setShow2FA(false); setError(null) }}
                  style={{ background: 'none', border: 'none', color: '#999', fontSize: 13, cursor: 'pointer' }}
                >
                  ← Zpět na přihlášení
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
