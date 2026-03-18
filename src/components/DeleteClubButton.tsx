'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type DeleteClubButtonProps = {
  clubId: number
  clubName: string
  compact?: boolean
}

export default function DeleteClubButton({ clubId, clubName, compact = false }: DeleteClubButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const confirmValue = clubName.trim().toLowerCase()
  const canConfirm = confirmText.trim().toLowerCase() === confirmValue

  async function deleteClub() {
    if (submitting || !canConfirm) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/clubs/${clubId}/delete`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error ?? 'Nepodařilo se zrušit klub.')
        return
      }

      setShowConfirm(false)
      setConfirmText('')
      router.push('/admin')
      router.refresh()
    } catch {
      setError('Nepodařilo se zrušit klub.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
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
        Zrušit tým
      </button>

      {showConfirm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setShowConfirm(false)
            }
          }}
        >
          <div style={{ width: '100%', maxWidth: 560, background: '#0f1722', color: '#f8fafc', border: '1px solid #2a3444', borderRadius: 12, padding: 16 }}>
            <h3 style={{ margin: '0 0 8px' }}>Potvrdit zrušení klubu</h3>
            <p style={{ margin: '0 0 10px', color: '#93a2b8', lineHeight: 1.6 }}>
              Tato akce smaže klub i všechny ne-admin členy týmu z databáze. Admin uživatelé zůstanou, ale budou odpojeni od klubu.
            </p>
            <p style={{ margin: '0 0 8px', color: '#e2e8f0', fontSize: 14 }}>
              Pro potvrzení napište přesně název klubu: <strong>{clubName}</strong>
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Napište název klubu"
              style={{ width: '100%', boxSizing: 'border-box', borderRadius: 10, border: '1px solid #334155', background: '#0b1119', color: '#f8fafc', padding: 10 }}
            />
            {error && <div style={{ marginTop: 8, color: '#fca5a5', fontSize: 12 }}>{error}</div>}
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setShowConfirm(false)} style={{ border: '1px solid #384152', background: '#101826', color: '#e5e7eb', borderRadius: 8, padding: '8px 11px' }}>
                Zrušit
              </button>
              <button type="button" disabled={!canConfirm || submitting} onClick={() => { void deleteClub() }} style={{ border: '1px solid #7f1d1d', background: '#7f1d1d', color: '#fff', borderRadius: 8, padding: '8px 11px', fontWeight: 700, opacity: !canConfirm ? 0.6 : 1 }}>
                {submitting ? 'Ruším…' : 'Potvrdit zrušení'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
