'use client'

import { useState } from 'react'
import styles from './admin-login.module.css'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error ?? 'Neplatné přihlašovací údaje.')
        return
      }

      window.location.href = '/admin'
    } catch {
      setError('Nastala chyba serveru. Zkuste to znovu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoRow}>
          <img src="/tp-logo.png" alt="TeamPulse" className={styles.logo} />
          <div>
            <h1 className={styles.title}>Admin Panel</h1>
            <p className={styles.subtitle}>Přihlášení administrátora TeamPulse</p>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div>
            <label htmlFor="admin_email" className={styles.label}>E-mail</label>
            <input
              id="admin_email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="admin_password" className={styles.label}>Heslo</label>
            <input
              id="admin_password"
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Přihlašování…' : 'Přihlásit se'}
          </button>
        </form>
      </div>
    </div>
  )
}
