'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type UserModerationActionsProps = {
  userId: number
  compact?: boolean
  disabled?: boolean
}

export default function UserModerationActions({ userId, compact = false, disabled = false }: UserModerationActionsProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [reason, setReason] = useState('')
  const router = useRouter()

  async function deleteUser() {
    if (submitting || disabled) return
    if (!reason.trim()) {
      setError('Důvod smazání je povinný.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/users/${userId}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error ?? 'Nepodařilo se smazat účet uživatele.')
        return
      }

      setShowDeleteModal(false)
      setReason('')
      router.refresh()
    } catch {
      setError('Nepodařilo se smazat účet uživatele.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <button
        type="button"
        disabled={disabled || submitting}
        onClick={() => setShowDeleteModal(true)}
        style={{
          border: '1px solid #7f1d1d',
          background: '#3a1317',
          color: '#fecaca',
          borderRadius: 8,
          padding: compact ? '6px 9px' : '9px 12px',
          fontSize: compact ? 12 : 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Smazat účet
      </button>

      {error && <div style={{ color: '#fca5a5', fontSize: 12 }}>{error}</div>}

      {showDeleteModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setShowDeleteModal(false)
            }
          }}
        >
          <div style={{ width: '100%', maxWidth: 520, background: '#0f1722', color: '#f8fafc', border: '1px solid #2a3444', borderRadius: 12, padding: 16 }}>
            <h3 style={{ margin: '0 0 8px' }}>Smazat účet uživatele</h3>
            <p style={{ margin: '0 0 10px', color: '#93a2b8', fontSize: 14 }}>
              Zadejte důvod. Uživatel dostane e-mail se zdůvodněním a účet bude nevratně smazán.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Např. opakované porušení pravidel klubu"
              style={{ width: '100%', boxSizing: 'border-box', borderRadius: 10, border: '1px solid #334155', background: '#0b1119', color: '#f8fafc', padding: 10 }}
            />
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: '#7f8ca0' }}>{reason.length}/1000</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setShowDeleteModal(false)} style={{ border: '1px solid #384152', background: '#101826', color: '#e5e7eb', borderRadius: 8, padding: '8px 11px' }}>
                  Zrušit
                </button>
                <button type="button" onClick={() => { void deleteUser() }} style={{ border: '1px solid #7f1d1d', background: '#7f1d1d', color: '#fff', borderRadius: 8, padding: '8px 11px', fontWeight: 700 }}>
                  {submitting ? 'Mazání…' : 'Potvrdit smazání'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
