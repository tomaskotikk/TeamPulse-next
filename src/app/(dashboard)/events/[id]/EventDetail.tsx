'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CalendarClock, Check, ChevronRight, Clock3, MapPin, Tag, X } from 'lucide-react'
import EventAttendancePanel from '@/components/attendance/EventAttendancePanel'
import { EVENT_TYPE_LABELS, ResponseStatus, formatEventRange } from '@/components/mobile/EventCard'
import type { EventWithResponse } from '@/lib/attendance'
import m from '@/components/mobile/mobile.module.css'
import styles from './detail.module.css'

type Props = {
  event: EventWithResponse
  reason: string | null
  started: boolean
  canRespond: boolean
  subjectId: number | null
  subjectName: string | null
  canManage: boolean
}

const RESPONSE_LABEL = { yes: 'Přijdu', no: 'Nepřijdu' } as const

export default function EventDetail({ event, reason: initialReason, started, canRespond, subjectId, subjectName, canManage }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'info' | 'attendance'>('info')
  const [response, setResponse] = useState(event.response)
  const [reason, setReason] = useState(initialReason ?? '')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(next: 'yes' | 'no' | null, nextReason = '') {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/events/${event.id}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: next, reason: nextReason, userId: subjectId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setResponse(next)
      setReason(next === 'no' ? nextReason : '')
      setSheetOpen(false)
      setDeclining(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Odpověď se nepodařilo uložit.')
    } finally {
      setSaving(false)
    }
  }

  const start = new Date(event.starts_at)
  const timeOnly = (iso: string) => new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={`${styles.heroStripe} ${m[`type_${event.type}`]}`} aria-hidden="true" />
        <div className={styles.heroBody}>
          <span className={styles.heroType}>{EVENT_TYPE_LABELS[event.type] ?? 'Akce'}</span>
          <h1 className={styles.heroTitle}>{event.title}</h1>
          <p className={styles.heroMeta}>
            {formatEventRange(event.starts_at, event.ends_at, event.all_day)}
            {event.location ? ` · ${event.location}` : ''}
          </p>
        </div>
      </header>

      <div className={styles.tabs} role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'info'} className={styles.tab} onClick={() => setTab('info')}>
          Informace
        </button>
        <button type="button" role="tab" aria-selected={tab === 'attendance'} className={styles.tab} onClick={() => setTab('attendance')}>
          Docházka
        </button>
      </div>

      {tab === 'info' && (
        <>
          {canRespond && (
            <>
              <button
                type="button"
                className={`${m.group} ${styles.myResponse}`}
                onClick={() => !started && setSheetOpen(true)}
                disabled={started}
              >
                <span className={styles.myResponseLabel}>
                  {subjectName ? `Účast · ${subjectName}` : 'Moje účast'}
                </span>
                <span className={styles.myResponseValue}>
                  {response ? RESPONSE_LABEL[response] : started ? 'bez odpovědi' : 'vyberte možnost'}
                  <ResponseStatus response={response} size={13} />
                </span>
              </button>
              <p className={styles.note}>
                {started
                  ? 'Událost už začala, odpověď nelze změnit.'
                  : response === 'no' && reason
                    ? `Důvod: ${reason}`
                    : 'Odpovídat můžete až do začátku události.'}
              </p>
            </>
          )}

          <p className={m.groupLabel}>Základní údaje</p>
          <ul className={m.group}>
            <li>
              <div className={m.row}>
                <span className={m.rowIcon}><CalendarClock size={17} /></span>
                <span className={m.rowLabel}>Datum</span>
                <span className={m.rowValue}>{start.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' })}</span>
              </div>
            </li>
            <li>
              <div className={m.row}>
                <span className={m.rowIcon}><Clock3 size={17} /></span>
                <span className={m.rowLabel}>Čas</span>
                <span className={m.rowValue}>
                  {event.all_day ? 'celý den' : `${timeOnly(event.starts_at)}${event.ends_at ? ` – ${timeOnly(event.ends_at)}` : ''}`}
                </span>
              </div>
            </li>
            {event.location && (
              <li>
                <a
                  className={m.row}
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className={m.rowIcon}><MapPin size={17} /></span>
                  <span className={m.rowLabel}>{event.location}</span>
                  <ChevronRight size={18} className={m.chevron} />
                </a>
              </li>
            )}
            {event.categories.length > 0 && (
              <li>
                <div className={m.row}>
                  <span className={m.rowIcon}><Tag size={17} /></span>
                  <span className={m.rowLabel}>Kategorie</span>
                  <span className={m.rowValue}>{event.categories.map((c) => c.name).join(', ')}</span>
                </div>
              </li>
            )}
          </ul>

          {event.description && (
            <>
              <p className={m.groupLabel}>Popis</p>
              <div className={`${m.group} ${styles.description}`}>{event.description}</div>
            </>
          )}

          {canManage && (
            <p className={styles.staffHint}>
              Úpravy události a zápis docházky najdete v <Link href="/events">kalendáři</Link> nebo v záložce Docházka.
            </p>
          )}
        </>
      )}

      {tab === 'attendance' && (
        <div className={`${m.group} ${styles.attendance}`}>
          <EventAttendancePanel eventId={event.id} />
        </div>
      )}

      {sheetOpen && (
        <div className={styles.sheetBackdrop} onClick={() => !saving && setSheetOpen(false)}>
          <div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label="Vaše účast"
            onClick={(e) => e.stopPropagation()}
          >
            <span className={styles.sheetHandle} aria-hidden="true" />
            <h2 className={styles.sheetTitle}>{event.title}</h2>
            <p className={styles.sheetSub}>{formatEventRange(event.starts_at, event.ends_at, event.all_day)}</p>

            {declining ? (
              <div className={styles.declineForm}>
                <label htmlFor="decline-reason" className={styles.sheetLabel}>Důvod (nepovinné)</label>
                <textarea
                  id="decline-reason"
                  className={styles.textarea}
                  rows={3}
                  maxLength={300}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Např. nemoc, škola, rodinné důvody"
                  autoFocus
                />
                <button type="button" className={`${styles.sheetBtn} ${styles.sheetNo}`} onClick={() => submit('no', reason)} disabled={saving}>
                  {saving ? 'Ukládám…' : 'Potvrdit, že nepřijdu'}
                </button>
                <button type="button" className={styles.sheetGhost} onClick={() => setDeclining(false)} disabled={saving}>
                  Zpět
                </button>
              </div>
            ) : (
              <div className={styles.sheetActions}>
                <button type="button" className={`${styles.sheetBtn} ${styles.sheetYes}`} onClick={() => submit('yes')} disabled={saving}>
                  <Check size={18} strokeWidth={3} /> Přijdu
                </button>
                <button type="button" className={`${styles.sheetBtn} ${styles.sheetNo}`} onClick={() => setDeclining(true)} disabled={saving}>
                  <X size={18} strokeWidth={3} /> Nepřijdu
                </button>
                {response && (
                  <button type="button" className={styles.sheetGhost} onClick={() => submit(null)} disabled={saving}>
                    Zrušit odpověď
                  </button>
                )}
              </div>
            )}

            {error && <p className={styles.error}>{error}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
