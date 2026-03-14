'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import PublicNavbar from '@/components/PublicNavbar'

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

  const isCompleted = Boolean(success)
  const phase = isCompleted ? 3 : step

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
            {error && !success && <div className="club-create-feedback error">{error}</div>}
            {success && <div className="club-create-feedback success">{success}</div>}

            <form onSubmit={handleSubmit}>
              {step === 1 && (
                <div className="club-create-step" key="club-step">
                  <h2>Detail klubu</h2>
                  <p>Vyplňte základní údaje o klubu a kontaktní informace.</p>

                  <div className="club-create-field">
                    <label htmlFor="club_name">Název klubu *</label>
                    <input id="club_name" name="club_name" className="form-input" required />
                  </div>

                  <div className="club-create-row">
                    <div className="club-create-field">
                      <label htmlFor="sport">Sport *</label>
                      <input id="sport" name="sport" className="form-input" required />
                    </div>
                    <div className="club-create-field">
                      <label htmlFor="city">Město *</label>
                      <input id="city" name="city" className="form-input" required />
                    </div>
                  </div>

                  <div className="club-create-field">
                    <label htmlFor="address">Adresa *</label>
                    <input id="address" name="address" className="form-input" required />
                  </div>

                  <div className="club-create-row">
                    <div className="club-create-field">
                      <label htmlFor="ico">IČO *</label>
                      <input id="ico" name="ico" className="form-input" required />
                    </div>
                    <div className="club-create-field">
                      <label htmlFor="dic">DIČ *</label>
                      <input id="dic" name="dic" className="form-input" required />
                    </div>
                  </div>

                  <div className="club-create-field">
                    <label htmlFor="website">Web *</label>
                    <input id="website" name="website" className="form-input" placeholder="https://..." required />
                  </div>

                  <div className="club-create-row">
                    <div className="club-create-field">
                      <label htmlFor="club_email">Klubový e-mail *</label>
                      <input id="club_email" name="club_email" type="email" className="form-input" required />
                    </div>
                    <div className="club-create-field">
                      <label htmlFor="club_phone">Klubový telefon *</label>
                      <input id="club_phone" name="club_phone" className="form-input" required />
                    </div>
                  </div>

                  <div className="club-create-actions">
                    <button type="button" className="club-create-btn primary" onClick={() => setStep(2)}>
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
                      <input id="first_name" name="first_name" className="form-input" required />
                    </div>
                    <div className="club-create-field">
                      <label htmlFor="last_name">Příjmení správce *</label>
                      <input id="last_name" name="last_name" className="form-input" required />
                    </div>
                  </div>

                  <div className="club-create-row">
                    <div className="club-create-field">
                      <label htmlFor="email">Přihlašovací e-mail *</label>
                      <input id="email" name="email" type="email" className="form-input" required />
                    </div>
                    <div className="club-create-field">
                      <label htmlFor="phone">Telefon</label>
                      <input id="phone" name="phone" className="form-input" />
                    </div>
                  </div>

                  <div className="club-create-row">
                    <div className="club-create-field">
                      <label htmlFor="password">Heslo *</label>
                      <input id="password" name="password" type="password" className="form-input" minLength={6} required />
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
                      />
                    </div>
                  </div>

                  <label className="club-create-terms">
                    <input id="terms" name="terms" type="checkbox" required />
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
