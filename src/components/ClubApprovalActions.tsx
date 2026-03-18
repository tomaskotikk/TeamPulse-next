'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ClubApprovalActionsProps = {
  clubId: number
}

export default function ClubApprovalActions({ clubId }: ClubApprovalActionsProps) {
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [reason, setReason] = useState('')
  const router = useRouter()

  async function handleApprove() {
    if (submitting) return

    setSubmitting('approve')
    setError(null)

    try {
      const res = await fetch(`/api/admin/clubs/${clubId}/approve`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error ?? 'Nepodařilo se schválit klub.')
        return
      }

      router.refresh()
    } catch {
      setError('Nepodařilo se schválit klub.')
    } finally {
      setSubmitting(null)
    }
  }

  async function handleReject() {
    if (submitting) return

    setSubmitting('reject')
    setError(null)

    try {
      const res = await fetch(`/api/admin/clubs/${clubId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error ?? 'Nepodařilo se zamítnout žádost.')
        return
      }

      setShowRejectModal(false)
      setReason('')
      router.refresh()
    } catch {
      setError('Nepodařilo se zamítnout žádost.')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => {
            void handleApprove()
          }}
          disabled={submitting !== null}
          style={{
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            border: 'none',
            borderRadius: 10,
            color: '#fff',
            padding: '10px 14px',
            fontWeight: 700,
            cursor: submitting ? 'default' : 'pointer',
          }}
        >
          {submitting === 'approve' ? 'Schvaluji…' : 'Prijmout'}
        </button>

        <button
          type="button"
          onClick={() => setShowRejectModal(true)}
          disabled={submitting !== null}
          style={{
            background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
            border: 'none',
            borderRadius: 10,
            color: '#fff',
            padding: '10px 14px',
            fontWeight: 700,
            cursor: submitting ? 'default' : 'pointer',
          }}
        >
          Odmitnout
        </button>
      </div>

      {error && <div style={{ fontSize: 12, color: '#b91c1c' }}>{error}</div>}

      {showRejectModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setShowRejectModal(false)
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 15, 26, 0.75)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 540,
              background: '#fff',
              borderRadius: 14,
              border: '1px solid #e5e7eb',
              padding: 18,
              boxShadow: '0 28px 60px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 8, color: '#111827' }}>Odmitnout zadost</div>
            <p style={{ margin: '0 0 10px', color: '#4b5563', fontSize: 14 }}>
              Volitelne dopln duvod zamitnuti. Zadateli prijde e-mail s vysledkem.
            </p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Napriklad: Chybi kontaktni udaje klubu nebo neplatne ICO."
              style={{
                width: '100%',
                border: '1px solid #d1d5db',
                borderRadius: 10,
                padding: 10,
                fontSize: 14,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{reason.length}/1000</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  disabled={submitting !== null}
                  style={{ border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, padding: '9px 12px', cursor: 'pointer' }}
                >
                  Zrusit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleReject()
                  }}
                  disabled={submitting !== null}
                  style={{ background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {submitting === 'reject' ? 'Odesilam…' : 'Potvrdit odmitnuti'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
