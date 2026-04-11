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
        <div className="crop-modal active" onClick={(e) => {
          if (e.target === e.currentTarget && !submitting) {
            setShowConfirm(false)
          }
        }}>
          <div className="crop-modal-content" style={{ maxWidth: 460 }}>
            <div className="crop-modal-body">
              <div className="crop-modal-title" style={{ fontSize: 20 }}>
              Odebrat člena z klubu?
              </div>
              <div className="form-help" style={{ fontSize: 14 }}>
              Opravdu chcete odstranit uživatele <strong>{memberName}</strong>? Akce smaže člena z databáze a je nevratná.
              </div>
            {errorMsg && (
              <div className="alert alert-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>{errorMsg}</div>
              </div>
            )}
            </div>
            <div className="crop-modal-footer" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
              >
                Zrušit
              </button>
              <button
                type="button"
                className="btn btn-danger"
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
