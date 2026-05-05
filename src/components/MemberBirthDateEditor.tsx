'use client'

import { useState } from 'react'

interface Props {
  memberId: number
  initialDateBirth: string | null
}

export default function MemberBirthDateEditor({ memberId, initialDateBirth }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialDateBirth ?? '')
  const [saved, setSaved] = useState(initialDateBirth ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function save() {
    setLoading(true)
    setError(null)
    setSuccess(false)

    const res = await fetch(`/api/members/${memberId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateBirth: value }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Chyba.')
      return
    }

    setSaved(value)
    setSuccess(true)
    setEditing(false)
    setTimeout(() => setSuccess(false), 3000)
  }

  if (!editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="data-value">
          {saved
            ? new Date(saved).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
            : '–'}
        </span>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ height: 28, padding: '0 10px', fontSize: 12 }}
          onClick={() => { setEditing(true); setError(null) }}
        >
          {saved ? 'Upravit' : 'Nastavit'}
        </button>
        {success && (
          <span style={{ fontSize: 12, color: 'var(--color-success)' }}>Uloženo ✓</span>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {error && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-error)' }}>{error}</p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="date"
          className="form-input"
          value={value}
          max={new Date().toISOString().split('T')[0]}
          onChange={(e) => setValue(e.target.value)}
          style={{ height: 36, maxWidth: 180 }}
        />
        <button
          type="button"
          className="btn btn-primary"
          style={{ height: 36, padding: '0 14px', fontSize: 13 }}
          onClick={save}
          disabled={loading || !value}
        >
          {loading ? 'Ukládám…' : 'Uložit'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ height: 36, padding: '0 12px', fontSize: 13 }}
          onClick={() => { setEditing(false); setValue(saved); setError(null) }}
          disabled={loading}
        >
          Zrušit
        </button>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-dim)' }}>
        Po uložení se hráč automaticky přiřadí do odpovídajících kategorií.
      </p>
    </div>
  )
}
