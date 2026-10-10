'use client'

import { FormEvent, useState } from 'react'
import type { MemberProfile } from '@/lib/member-profiles'
import styles from './parent.module.css'

type Props = {
  memberId: number
  profile: MemberProfile | null
  showEmergency: boolean
}

/** Edits address, health and emergency data in member_profiles. */
export default function ChildProfileForm({ memberId, profile, showEmergency }: Props) {
  const [values, setValues] = useState({
    street: profile?.street ?? '',
    city: profile?.city ?? '',
    zip: profile?.zip ?? '',
    healthInsurance: profile?.health_insurance ?? '',
    healthNotes: profile?.health_notes ?? '',
    emergencyName: profile?.emergency_name ?? '',
    emergencyPhone: profile?.emergency_phone ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  function set(key: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setMessage(null)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/members/${memberId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      setMessage(res.ok ? { ok: true, text: 'Uloženo.' } : { ok: false, text: data.error ?? 'Uložení se nezdařilo.' })
    } catch {
      setMessage({ ok: false, text: 'Nastala chyba serveru.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.formGrid}>
        <div className={`form-group ${styles.full}`}>
          <label htmlFor="pf-street" className="form-label">Ulice a číslo popisné</label>
          <input id="pf-street" className="form-input" value={values.street} onChange={(e) => set('street', e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="pf-city" className="form-label">Město</label>
          <input id="pf-city" className="form-input" value={values.city} onChange={(e) => set('city', e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="pf-zip" className="form-label">PSČ</label>
          <input id="pf-zip" className="form-input" value={values.zip} onChange={(e) => set('zip', e.target.value)} required />
        </div>
        <div className={`form-group ${styles.full}`}>
          <label htmlFor="pf-insurance" className="form-label">Zdravotní pojišťovna</label>
          <input id="pf-insurance" className="form-input" value={values.healthInsurance} onChange={(e) => set('healthInsurance', e.target.value)} required />
        </div>
        <div className={`form-group ${styles.full}`}>
          <label htmlFor="pf-notes" className="form-label">Alergie, zdravotní omezení, léky</label>
          <textarea id="pf-notes" className="form-input" value={values.healthNotes} onChange={(e) => set('healthNotes', e.target.value)} />
        </div>
        {showEmergency && (
          <>
            <div className="form-group">
              <label htmlFor="pf-em-name" className="form-label">Nouzový kontakt</label>
              <input id="pf-em-name" className="form-input" value={values.emergencyName} onChange={(e) => set('emergencyName', e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="pf-em-phone" className="form-label">Telefon nouzového kontaktu</label>
              <input id="pf-em-phone" type="tel" className="form-input" value={values.emergencyPhone} onChange={(e) => set('emergencyPhone', e.target.value)} />
            </div>
          </>
        )}
      </div>
      <div className={styles.formActions}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Ukládám…' : 'Uložit změny'}
        </button>
        {message && <span className={message.ok ? styles.ok : styles.error} role="status">{message.text}</span>}
      </div>
    </form>
  )
}
