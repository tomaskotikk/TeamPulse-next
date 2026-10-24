import Link from 'next/link'
import { Check, HelpCircle, Users, X } from 'lucide-react'
import type { EventWithResponse } from '@/lib/attendance'
import styles from './mobile.module.css'

export const EVENT_TYPE_LABELS: Record<string, string> = {
  training: 'Trénink',
  match: 'Zápas',
  meeting: 'Schůzka',
  event: 'Akce',
}

export function formatEventRange(startsAt: string, endsAt: string | null, allDay: boolean) {
  const start = new Date(startsAt)
  const day = start.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' })
  if (allDay) return `${day} · celý den`
  const time = (d: Date) => d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
  if (!endsAt) return `${day} ${time(start)}`
  const end = new Date(endsAt)
  const sameDay = end.toDateString() === start.toDateString()
  return sameDay
    ? `${day} ${time(start)} – ${time(end)}`
    : `${day} ${time(start)} – ${end.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' })} ${time(end)}`
}

export function ResponseStatus({ response, size = 15 }: { response: 'yes' | 'no' | null; size?: number }) {
  if (response === 'yes') {
    return <span className={`${styles.status} ${styles.status_yes}`} aria-label="Přijdu"><Check size={size} strokeWidth={3} /></span>
  }
  if (response === 'no') {
    return <span className={`${styles.status} ${styles.status_no}`} aria-label="Nepřijdu"><X size={size} strokeWidth={3} /></span>
  }
  return <span className={`${styles.status} ${styles.status_pending}`} aria-label="Bez odpovědi"><HelpCircle size={size} strokeWidth={2.5} /></span>
}

/** Mobile event card: type stripe, title, time/place, categories, own response on the right. */
export default function EventCard({ event, goingCount }: { event: EventWithResponse; goingCount?: number }) {
  return (
    <Link href={`/events/${event.id}`} className={styles.card}>
      <span className={`${styles.stripe} ${styles[`type_${event.type}`]}`} aria-hidden="true" />
      <span className={styles.cardBody}>
        <span className={styles.cardTitle}>{event.title}</span>
        <span className={styles.cardMeta}>
          <span>{formatEventRange(event.starts_at, event.ends_at, event.all_day)}</span>
          {event.location && <span>{event.location}</span>}
        </span>
        <span className={styles.cardTags}>
          <span className={styles.tag}>{EVENT_TYPE_LABELS[event.type] ?? 'Akce'}</span>
          {event.categories.map((c) => (
            <span key={c.name} className={styles.tag}>
              <i style={{ background: c.color }} aria-hidden="true" />
              {c.name}
            </span>
          ))}
          {typeof goingCount === 'number' && (
            <span className={styles.tag}>
              <Users size={12} aria-hidden="true" /> {goingCount}
            </span>
          )}
        </span>
      </span>
      <span className={styles.cardStatus}>
        <ResponseStatus response={event.response} />
      </span>
    </Link>
  )
}
