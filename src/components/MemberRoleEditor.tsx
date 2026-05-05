'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ROLE_OPTIONS = [
  { value: 'hráč', label: 'Hráč' },
  { value: 'trenér', label: 'Trenér' },
  { value: 'rodič', label: 'Rodič' },
  { value: 'jiné', label: 'Jiné' },
]

type MemberRoleEditorProps = {
  memberId: number
  initialRole: string
  disabled?: boolean
}

export default function MemberRoleEditor({ memberId, initialRole, disabled = false }: MemberRoleEditorProps) {
  const router = useRouter()
  const [role, setRole] = useState(initialRole)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const options = ROLE_OPTIONS.some((opt) => opt.value === initialRole)
    ? ROLE_OPTIONS
    : [...ROLE_OPTIONS, { value: initialRole, label: initialRole }]

  async function handleSave() {
    if (saving || disabled) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error ?? 'Nepodařilo se změnit roli člena.')
        return
      }

      setSuccess('Role byla aktualizována.')
      router.refresh()
    } catch {
      setError('Nepodařilo se změnit roli člena.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <select
        className="members-role-select"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        disabled={disabled}
        aria-label="Změnit roli člena"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button type="button" className="btn btn-primary" onClick={() => void handleSave()} disabled={disabled || saving}>
        {saving ? 'Ukládám…' : 'Uložit roli'}
      </button>
      {error && <div className="form-help" style={{ color: 'var(--color-error)' }}>{error}</div>}
      {success && <div className="form-help" style={{ color: 'var(--color-success)' }}>{success}</div>}
    </div>
  )
}
