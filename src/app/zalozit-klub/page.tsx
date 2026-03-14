'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import AuthShowcaseLayout from '@/components/AuthShowcaseLayout'

export default function CreateClubPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return

    const form = e.currentTarget
    const fd = new FormData(form)

    const payload = {
      club_name: String(fd.get('club_name') || ''),
      sport: String(fd.get('sport') || ''),
      city: String(fd.get('city') || ''),
      address: String(fd.get('address') || ''),
      ico: String(fd.get('ico') || ''),
      dic: String(fd.get('dic') || ''),
      website: String(fd.get('website') || ''),
      club_email: String(fd.get('club_email') || ''),
      club_phone: String(fd.get('club_phone') || ''),
      first_name: String(fd.get('first_name') || ''),
      last_name: String(fd.get('last_name') || ''),
      email: String(fd.get('email') || ''),
      phone: String(fd.get('phone') || ''),
      password: String(fd.get('password') || ''),
      password_confirm: String(fd.get('password_confirm') || ''),
      terms: fd.get('terms') === 'on',
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

      setSuccess(
        data.message ||
          'Registrace byla odeslána. Na e-mail jsme poslali ověřovací odkaz pro aktivaci klubu.'
      )
      form.reset()
      setStep(1)
    } catch {
      setError('Nastala chyba serveru. Zkuste to prosím znovu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShowcaseLayout
      title="Založit klub"
      subtitle="Vytvořte nový klub a účet správce v TeamPulse"
      backHref="/"
      backLabel="Zpět na úvod"
    >
      <div className="auth-form-panel">
        <h2>Založení klubu</h2>
        <p className="auth-note">Po odeslání vám přijde ověřovací e-mail. Až ho potvrdíte, účet i klub se aktivují.</p>

        {error && !success && <div className="auth-feedback error">{error}</div>}
        {success && <div className="auth-feedback success">{success}</div>}

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <>
              <div className="form-group">
                <label htmlFor="club_name" className="form-label">Název klubu *</label>
                <input id="club_name" name="club_name" className="form-input" required />
              </div>

              <div className="auth-two-columns">
                <div className="form-group">
                  <label htmlFor="sport" className="form-label">Sport *</label>
                  <input id="sport" name="sport" className="form-input" required />
                </div>
                <div className="form-group">
                  <label htmlFor="city" className="form-label">Město *</label>
                  <input id="city" name="city" className="form-input" required />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="address" className="form-label">Adresa *</label>
                <input id="address" name="address" className="form-input" required />
              </div>

              <div className="auth-two-columns">
                <div className="form-group">
                  <label htmlFor="ico" className="form-label">IČO *</label>
                  <input id="ico" name="ico" className="form-input" required />
                </div>
                <div className="form-group">
                  <label htmlFor="dic" className="form-label">DIČ *</label>
                  <input id="dic" name="dic" className="form-input" required />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="website" className="form-label">Web *</label>
                <input id="website" name="website" className="form-input" placeholder="https://..." required />
              </div>

              <div className="auth-two-columns">
                <div className="form-group">
                  <label htmlFor="club_email" className="form-label">Klubový e-mail *</label>
                  <input id="club_email" name="club_email" type="email" className="form-input" required />
                </div>
                <div className="form-group">
                  <label htmlFor="club_phone" className="form-label">Klubový telefon *</label>
                  <input id="club_phone" name="club_phone" className="form-input" required />
                </div>
              </div>

              <div className="auth-actions">
                <button type="button" className="auth-btn-primary" onClick={() => setStep(2)}>
                  Pokračovat na správce
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="auth-two-columns">
                <div className="form-group">
                  <label htmlFor="first_name" className="form-label">Jméno správce *</label>
                  <input id="first_name" name="first_name" className="form-input" required />
                </div>
                <div className="form-group">
                  <label htmlFor="last_name" className="form-label">Příjmení správce *</label>
                  <input id="last_name" name="last_name" className="form-input" required />
                </div>
              </div>

              <div className="auth-two-columns">
                <div className="form-group">
                  <label htmlFor="email" className="form-label">Přihlašovací e-mail *</label>
                  <input id="email" name="email" type="email" className="form-input" required />
                </div>
                <div className="form-group">
                  <label htmlFor="phone" className="form-label">Telefon</label>
                  <input id="phone" name="phone" className="form-input" />
                </div>
              </div>

              <div className="auth-two-columns">
                <div className="form-group">
                  <label htmlFor="password" className="form-label">Heslo *</label>
                  <input id="password" name="password" type="password" className="form-input" minLength={6} required />
                </div>
                <div className="form-group">
                  <label htmlFor="password_confirm" className="form-label">Potvrzení hesla *</label>
                  <input
                    id="password_confirm"
                    name="password_confirm"
                    type="password"
                    className="form-input"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input id="terms" name="terms" type="checkbox" style={{ width: 20, height: 20 }} required />
                <label htmlFor="terms" className="form-help" style={{ marginTop: 0 }}>
                  Souhlasím se zpracováním osobních údajů.
                </label>
              </div>

              <div className="auth-actions">
                <button type="button" className="auth-btn-ghost" onClick={() => setStep(1)}>
                  Zpět
                </button>
                <button type="submit" className="auth-btn-primary" disabled={loading}>
                  {loading ? 'Odesílám…' : 'Vytvořit registraci'}
                </button>
              </div>
            </>
          )}
        </form>

        <p className="auth-switch">
          Už máte účet? <Link href="/login">Přihlaste se.</Link>
        </p>
      </div>
    </AuthShowcaseLayout>
  )
}
