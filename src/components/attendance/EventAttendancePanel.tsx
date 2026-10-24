'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, HelpCircle, X } from 'lucide-react'
import styles from './attendance.module.css'

type Attended = 'present' | 'absent' | 'excused'

type Row = {
  user: { id: number; first_name: string; last_name: string; profile_picture: string | null }
  response: 'yes' | 'no' | null
  reason: string | null
  responded_by_parent: boolean
  attended: Attended | null
}

type Data = {
  started: boolean
  canManage: boolean
  summary: { invited: number; yes: number; no: number; pending: number; recorded: boolean; present: number }
  rows: Row[]
}

const ATTENDED_LABEL: Record<Attended, string> = { present: 'Přítomen', absent: 'Nepřítomen', excused: 'Omluven' }

function initialAttended(row: Row): Attended {
  if (row.attended) return row.attended
  if (row.response === 'yes') return 'present'
  if (row.response === 'no' && row.reason) return 'excused'
  return 'absent'
}

/** Attendance tab of an event: responses summary + list, and recording actual attendance for staff. */
export default function EventAttendancePanel({ eventId }: { eventId: number }) {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<number, Attended>>({})
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all' | 'yes' | 'no' | 'pending'>('all')

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(`/api/events/${eventId}/attendance`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Docházku se nepodařilo načíst.')
    }
  }, [eventId])

  useEffect(() => {
    setData(null)
    setEditing(false)
    setFilter('all')
    load()
  }, [load])

  function startEditing() {
    if (!data) return
    setDraft(Object.fromEntries(data.rows.map((r) => [r.user.id, initialAttended(r)])))
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/events/${eventId}/attendance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: Object.entries(draft).map(([userId, attended]) => ({ userId, attended })) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setEditing(false)
      await load()
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Uložení se nezdařilo.')
    } finally {
      setSaving(false)
    }
  }

  if (error && !data) return <p className={styles.error}>{error}</p>
  if (!data) return <p className={styles.muted}>Načítám docházku…</p>

  const { summary } = data
  const visible = data.rows.filter((r) => filter === 'all' || (filter === 'pending' ? !r.response : r.response === filter))

  return (
    <div className={styles.panel}>
      <div className={styles.summary} role="tablist" aria-label="Filtr odpovědí">
        {([
          ['all', 'Pozvaní', summary.invited],
          ['yes', 'Přijde', summary.yes],
          ['no', 'Nepřijde', summary.no],
          ['pending', 'Bez odpovědi', summary.pending],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            className={styles.summaryItem}
            onClick={() => setFilter(key)}
            disabled={editing}
          >
            <strong>{count}</strong>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {summary.recorded && !editing && (
        <p className={styles.recorded}>
          Docházka zapsána · přítomno {summary.present} z {summary.invited}
        </p>
      )}

      {data.rows.length === 0 ? (
        <p className={styles.muted}>Na událost nejsou pozvaní žádní hráči. Zkontrolujte kategorie události.</p>
      ) : (
        <ul className={styles.list}>
          {(editing ? data.rows : visible).map((row) => (
            <li key={row.user.id} className={styles.row}>
              {row.user.profile_picture ? (
                <img src={`/uploads/profiles/${row.user.profile_picture}`} alt="" className={styles.avatar} />
              ) : (
                <span className={styles.avatar} aria-hidden="true">
                  {row.user.first_name[0]}
                  {row.user.last_name[0]}
                </span>
              )}
              <span className={styles.name}>
                <strong>{row.user.last_name} {row.user.first_name}</strong>
                {row.reason && <small>{row.reason}</small>}
                {row.responded_by_parent && <small>odpověděl rodič</small>}
              </span>

              {editing ? (
                <span className={styles.segmented} role="radiogroup" aria-label={`Docházka ${row.user.first_name}`}>
                  {(['present', 'excused', 'absent'] as Attended[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={draft[row.user.id] === value}
                      className={`${styles.segment} ${styles[`seg_${value}`]}`}
                      onClick={() => setDraft((d) => ({ ...d, [row.user.id]: value }))}
                    >
                      {ATTENDED_LABEL[value]}
                    </button>
                  ))}
                </span>
              ) : (
                <span className={styles.status}>
                  {row.attended && <span className={`${styles.attendedTag} ${styles[`tag_${row.attended}`]}`}>{ATTENDED_LABEL[row.attended]}</span>}
                  <ResponseIcon response={row.response} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {data.canManage && data.rows.length > 0 && (
        <div className={styles.actions}>
          {editing ? (
            <>
              <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Ukládám…' : 'Uložit docházku'}
              </button>
              <button type="button" className="btn" onClick={() => setEditing(false)} disabled={saving}>
                Zrušit
              </button>
            </>
          ) : data.started ? (
            <button type="button" className="btn" onClick={startEditing}>
              {summary.recorded ? 'Upravit docházku' : 'Zapsat docházku'}
            </button>
          ) : (
            <p className={styles.muted}>Skutečnou docházku zapíšete po začátku události.</p>
          )}
        </div>
      )}
    </div>
  )
}

export function ResponseIcon({ response }: { response: 'yes' | 'no' | null }) {
  if (response === 'yes') {
    return <span className={`${styles.icon} ${styles.iconYes}`} title="Přijde" aria-label="Přijde"><Check size={13} strokeWidth={3} /></span>
  }
  if (response === 'no') {
    return <span className={`${styles.icon} ${styles.iconNo}`} title="Nepřijde" aria-label="Nepřijde"><X size={13} strokeWidth={3} /></span>
  }
  return <span className={`${styles.icon} ${styles.iconPending}`} title="Bez odpovědi" aria-label="Bez odpovědi"><HelpCircle size={13} strokeWidth={2.5} /></span>
}
