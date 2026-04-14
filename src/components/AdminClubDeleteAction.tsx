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

  async function handleDelete() {
    if (submitting) return

    const confirmed = window.confirm(
      `Opravdu smazat klub ${clubName}?\n\nAkce je nevratna. Dojde ke smazani ne-admin uzivatelu tohoto klubu a rozeslani informacniho e-mailu.`
    )

    if (!confirmed) return

    const reasonInput = window.prompt('Volitelny duvod smazani (bude uveden v e-mailu):', '')
    const reason = (reasonInput ?? '').trim()

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/clubs/${clubId}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Nepodarilo se smazat klub.')
        return
      }

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
        onClick={() => {
          void handleDelete()
        }}
        disabled={submitting}
      >
        {submitting ? 'Mazani...' : 'Smazat klub'}
      </button>
      {error && <div className={styles.clubDeleteError}>{error}</div>}
    </div>
  )
}
