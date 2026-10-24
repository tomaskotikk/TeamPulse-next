const time = (d: Date) => d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })

export function formatEventRange(startsAt: string, endsAt: string | null, allDay: boolean) {
  const start = new Date(startsAt)
  const day = start.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' })
  if (allDay) return `${day} · celý den`
  if (!endsAt) return `${day} ${time(start)}`
  const end = new Date(endsAt)
  if (end.toDateString() === start.toDateString()) return `${day} ${time(start)} – ${time(end)}`
  return `${day} ${time(start)} – ${end.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })} ${time(end)}`
}

export function formatTime(iso: string) {
  return time(new Date(iso))
}

export function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(Date.now() - 86400000)
  if (d.toDateString() === today.toDateString()) return 'Dnes'
  if (d.toDateString() === yesterday.toDateString()) return 'Včera'
  return d.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function initials(first?: string | null, last?: string | null) {
  return `${(first ?? '').charAt(0)}${(last ?? '').charAt(0)}`.toUpperCase()
}
