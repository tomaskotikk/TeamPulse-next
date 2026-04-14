'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '@/components/admin-panel.module.css'

type AdminClubDeleteActionProps = {
  clubId: number
  clubName: string
}

export default function AdminClubDeleteAction({ clubId, clubName }: AdminClubDeleteActionProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [reason, setReason] = useState('')

  async function handleDelete() {
    if (submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/clubs/${clubId}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Nepodarilo se smazat klub.')
        return
      }

      setShowModal(false)
      setReason('')
      router.refresh()
    } catch {
      setError('Nepodarilo se smazat klub.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.clubDeleteWrap}>
      <button
        type="button"
        className={styles.clubDeleteBtn}
        onClick={() => setShowModal(true)}
        disabled={submitting}
      >
        {submitting ? 'Mazani...' : 'Smazat klub'}
      </button>
      {error && <div className={styles.clubDeleteError}>{error}</div>}

      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setShowModal(false)
            }
          }}
        >
          <div style={{ width: '100%', maxWidth: 560, background: '#0f1722', color: '#f8fafc', border: '1px solid #2a3444', borderRadius: 12, padding: 16 }}>
            <h3 style={{ margin: '0 0 8px' }}>Smazat klub {clubName}</h3>
            <p style={{ margin: '0 0 10px', color: '#93a2b8', fontSize: 14 }}>
              Akce je nevratna. Dojde ke smazani ne-admin uzivatelu tohoto klubu a rozeslani informacniho e-mailu.
            </p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Volitelny duvod smazani"
              style={{ width: '100%', boxSizing: 'border-box', borderRadius: 10, border: '1px solid #334155', background: '#0b1119', color: '#f8fafc', padding: 10 }}
            />

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: '#7f8ca0' }}>{reason.length}/1000</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  style={{ border: '1px solid #384152', background: '#101826', color: '#e5e7eb', borderRadius: 8, padding: '8px 11px' }}
                >
                  Zrusit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleDelete()
                  }}
                  disabled={submitting}
                  style={{ border: '1px solid #7f1d1d', background: '#7f1d1d', color: '#fff', borderRadius: 8, padding: '8px 11px', fontWeight: 700 }}
                >
                  {submitting ? 'Mazani...' : 'Potvrdit smazani klubu'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
