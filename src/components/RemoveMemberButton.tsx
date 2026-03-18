'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type RemoveMemberButtonProps = {
  memberId: number
  memberName: string
  disabled?: boolean
}

export default function RemoveMemberButton({ memberId, memberName, disabled = false }: RemoveMemberButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete() {
    if (submitting || disabled) return

    setSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: 'DELETE',
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Nepodařilo se odebrat člena z klubu.')
        return
      }

      setShowConfirm(false)
      router.push('/members')
      router.refresh()
    } catch {
      setErrorMsg('Nepodařilo se odebrat člena z klubu.')
    } finally {
      setSubmitting(false)
    }
  }

  if (disabled) {
    return (
      <button className="btn" type="button" disabled title="Manažera nelze odebrat tímto způsobem">
        Odebrání není dostupné
      </button>
    )
  }

  return (
    <>
      <button className="btn btn-danger" type="button" onClick={() => setShowConfirm(true)}>
        <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
        </svg>
        Odebrat z klubu
      </button>

      {showConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setShowConfirm(false)
            }
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 460,
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              padding: 18,
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.45)',
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              Odebrat člena z klubu?
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dimmer)', lineHeight: 1.5, marginBottom: 14 }}>
              Opravdu chcete odstranit uživatele <strong>{memberName}</strong>? Akce smaže člena z databáze a je nevratná.
            </div>
            {errorMsg && (
              <div className="alert alert-error" style={{ marginBottom: 12 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>{errorMsg}</div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn"
                style={{ width: 'auto', padding: '10px 14px' }}
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
              >
                Zrušit
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ width: 'auto', padding: '10px 14px' }}
                onClick={() => {
                  void handleDelete()
                }}
                disabled={submitting}
              >
                {submitting ? 'Odstraňuji…' : 'Ano, odstranit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
