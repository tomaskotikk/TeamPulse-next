'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Eye,
  MapPin,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import EventAttendancePanel from '@/components/attendance/EventAttendancePanel'
import DashboardLayout from '@/components/DashboardLayout'
import Topbar from '@/components/Topbar'
import styles from './events.module.css'

type AppUser = {
  id: number
  first_name: string
  last_name: string
  role: string
  organization: string | null
  profile_picture: string | null
}

type ClubEvent = {
  id: number
  club_id: number
  created_by_user_id: number
  type: 'training' | 'match' | 'meeting' | 'event'
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string | null
  all_day: boolean
  created_at: string
  categoryIds?: number[]
}

type EventFormState = {
  type: 'training' | 'match' | 'meeting' | 'event'
  title: string
  location: string
  description: string
  date: string
  startTime: string
  endTime: string
  repeatEnabled: boolean
  repeatWeekdays: number[]
  repeatEndDate: string
}

type CategoryMemberUser = {
  id: number
  first_name: string
  last_name: string
  profile_picture: string | null
}

type CategoryMembersById = Record<number, CategoryMemberUser[]>

const WEEKDAYS = [
  { label: 'po', value: 1 },
  { label: 'út', value: 2 },
  { label: 'st', value: 3 },
  { label: 'čt', value: 4 },
  { label: 'pá', value: 5 },
  { label: 'so', value: 6 },
  { label: 'ne', value: 0 },
]

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateKeyFromIso(iso: string) {
  const date = new Date(iso)
  return dateKey(date)
}

function localTimeLabel(iso: string, allDay: boolean) {
  if (allDay) return 'Celý den'
  return new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('cs-CZ', {
    month: 'long',
    year: 'numeric',
  })
}

function startOfMonthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const mondayOffset = (first.getDay() + 6) % 7
  return new Date(first.getFullYear(), first.getMonth(), first.getDate() - mondayOffset)
}

function chipClass(type: ClubEvent['type']) {
  if (type === 'training') return `${styles.eventChip} ${styles.training}`
  if (type === 'match') return `${styles.eventChip} ${styles.match}`
  if (type === 'meeting') return `${styles.eventChip} ${styles.meeting}`
  return `${styles.eventChip} ${styles.event}`
}

function eventTypeLabel(type: ClubEvent['type']) {
  if (type === 'training') return 'Trénink'
  if (type === 'match') return 'Zápas'
  if (type === 'meeting') return 'Schůzka'
  return 'Událost'
}

function timeStartClass(type: ClubEvent['type']) {
  if (type === 'training') return styles.timeStartTraining
  if (type === 'match') return styles.timeStartMatch
  if (type === 'meeting') return styles.timeStartMeeting
  return styles.timeStartEvent
}

function eventTypeIcon(type: ClubEvent['type']) {
  if (type === 'training') return <Dumbbell size={15} />
  if (type === 'match') return <Trophy size={15} />
  if (type === 'meeting') return <Users size={15} />
  return <CalendarDays size={15} />
}

function defaultForm(selectedDay: string): EventFormState {
  return {
    type: 'training',
    title: 'Trénink',
    location: '',
    description: '',
    date: selectedDay,
    startTime: '17:00',
    endTime: '18:30',
    repeatEnabled: false,
    repeatWeekdays: [2, 4],
    repeatEndDate: selectedDay,
  }
}

export default function EventsPage() {
  const router = useRouter()
  const [user, setUser] = useState<AppUser | null>(null)
  const [themeVars, setThemeVars] = useState<Record<string, string>>({})
  const [events, setEvents] = useState<ClubEvent[]>([])
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [form, setForm] = useState<EventFormState>(() => defaultForm(dateKey(new Date())))
  const [clubCategories, setClubCategories] = useState<{ id: number; name: string; color: string; member_count: number }[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [categoryMembersById, setCategoryMembersById] = useState<CategoryMembersById>({})
  const [categoryMembersLoading, setCategoryMembersLoading] = useState<number[]>([])
  const [categoryMembersError, setCategoryMembersError] = useState<Record<number, string>>({})
  const [includeUncategorized, setIncludeUncategorized] = useState(false)

  const canCreate = user?.role === 'manažer' || user?.role === 'trenér'

  const gridStart = useMemo(() => startOfMonthGrid(currentMonth), [currentMonth])
  const gridDays = useMemo(() => {
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(gridStart)
      day.setDate(gridStart.getDate() + index)
      return day
    })
  }, [gridStart])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ClubEvent[]>()
    for (const event of events) {
      const key = dateKeyFromIso(event.starts_at)
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }

    for (const [, list] of map) {
      list.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    }

    return map
  }, [events])

  const upcomingEvents = useMemo(() => {
    const nowTs = Date.now()
    return [...events]
      .filter((event) => new Date(event.starts_at).getTime() >= nowTs)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
      .slice(0, 3)
  }, [events])

  const selectedDateEvents = useMemo(() => {
    return eventsByDay.get(selectedDate) ?? []
  }, [eventsByDay, selectedDate])

  const loadMonthEvents = useCallback(async (month: Date) => {
    const fromDate = startOfMonthGrid(month)
    const toDate = new Date(fromDate)
    toDate.setDate(fromDate.getDate() + 41)

    const from = dateKey(fromDate)
    const to = dateKey(toDate)

    const res = await fetch(`/api/events?from=${from}&to=${to}`, { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error ?? 'Nepodařilo se načíst události.')
    }

    setEvents(data.events ?? [])
  }, [])

  useEffect(() => {
    let mounted = true

    async function boot() {
      try {
        const ctxRes = await fetch('/api/app/context', { cache: 'no-store' })
        if (!ctxRes.ok) {
          window.location.href = '/login'
          return
        }
        const ctx = await ctxRes.json()
        if (!mounted) return

        setUser(ctx.user)
        setThemeVars(ctx.themeVars ?? {})

        if (ctx.user?.role === 'manažer' || ctx.user?.role === 'trenér') {
          const catRes = await fetch('/api/categories', { cache: 'no-store' })
          if (catRes.ok) {
            const catData = await catRes.json()
            setClubCategories(catData.categories ?? [])
          }
        }

        await loadMonthEvents(currentMonth)
      } catch (error) {
        if (mounted) {
          const message = error instanceof Error ? error.message : 'Nepodařilo se načíst stránku událostí.'
          setErrorMsg(message)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    boot()

    return () => {
      mounted = false
    }
  }, [currentMonth, loadMonthEvents])

  useEffect(() => {
    if (selectedCategoryIds.length === 0) return

    const missing = selectedCategoryIds.filter((id) => !categoryMembersById[id] && !categoryMembersLoading.includes(id))
    if (missing.length === 0) return

    setCategoryMembersLoading((prev) => [...prev, ...missing])

    missing.forEach(async (categoryId) => {
      try {
        const res = await fetch(`/api/categories/members?category_id=${categoryId}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error ?? 'Nepodařilo se načíst členy kategorie.')
        }

        const members = (data.members ?? [])
          .map((row: { users?: CategoryMemberUser | null }) => row.users ?? null)
          .filter(Boolean) as CategoryMemberUser[]

        setCategoryMembersById((prev) => ({ ...prev, [categoryId]: members }))
        setCategoryMembersError((prev) => {
          const next = { ...prev }
          delete next[categoryId]
          return next
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Nepodařilo se načíst členy.'
        setCategoryMembersError((prev) => ({ ...prev, [categoryId]: message }))
      } finally {
        setCategoryMembersLoading((prev) => prev.filter((id) => id !== categoryId))
      }
    })
  }, [categoryMembersById, categoryMembersLoading, selectedCategoryIds])

  useEffect(() => {
    function syncViewport() {
      setIsMobileViewport(window.innerWidth <= 780)
    }

    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => {
      window.removeEventListener('resize', syncViewport)
    }
  }, [])

  function switchMonth(delta: number) {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  function setFormField<K extends keyof EventFormState>(key: K, value: EventFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function openEventDetails(event: ClubEvent) {
    setSelectedEvent(event)
    setSelectedDate(dateKeyFromIso(event.starts_at))
    if (isMobileViewport) {
      router.push(`/events/${event.id}`)
    } else {
      setShowEventModal(false)
    }
  }

  function toInputTime(iso: string) {
    const date = new Date(iso)
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }

  function toFormFromEvent(event: ClubEvent): EventFormState {
    const day = dateKeyFromIso(event.starts_at)
    return {
      type: event.type,
      title: event.title,
      location: event.location ?? '',
      description: event.description ?? '',
      date: day,
      startTime: toInputTime(event.starts_at),
      endTime: event.ends_at ? toInputTime(event.ends_at) : '',
      repeatEnabled: false,
      repeatWeekdays: [2, 4],
      repeatEndDate: day,
    }
  }

  function selectDate(key: string) {
    setSelectedDate(key)
    setForm((prev) => ({ ...prev, date: key, repeatEndDate: prev.repeatEndDate || key }))

    const list = eventsByDay.get(key) ?? []
    if (list.length > 0) {
      setSelectedEvent(list[0])
      if (isMobileViewport) {
        setShowEventModal(true)
      } else {
        setShowEventModal(false)
      }
      return
    }

    setSelectedEvent(null)
    setShowEventModal(false)
  }

  function toggleWeekday(day: number) {
    setForm((prev) => {
      const hasDay = prev.repeatWeekdays.includes(day)
      const nextDays = hasDay
        ? prev.repeatWeekdays.filter((value) => value !== day)
        : [...prev.repeatWeekdays, day]
      return { ...prev, repeatWeekdays: nextDays }
    })
  }

  function initialsForUser(userInfo: CategoryMemberUser) {
    const first = userInfo.first_name?.[0] ?? ''
    const last = userInfo.last_name?.[0] ?? ''
    return `${first}${last}`.toUpperCase()
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setSaving(true)

    const payload = {
      type: form.type,
      title: form.title,
      location: form.location,
      description: form.description,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      categoryIds: selectedCategoryIds,
      includeUncategorized,
      repeat: form.repeatEnabled
        ? {
            enabled: true,
            weekdays: form.repeatWeekdays,
            endDate: form.repeatEndDate,
          }
        : { enabled: false },
    }

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Nepodařilo se vytvořit událost.')
        setSaving(false)
        return
      }

      const createdCount = Number(data.createdCount ?? 1)
      setSuccessMsg(createdCount > 1 ? `Vytvořeno ${createdCount} opakovaných událostí.` : 'Událost byla vytvořena.')
      setSelectedDate(form.date)
      setForm(defaultForm(form.date))
      setSelectedCategoryIds([])
      setShowCreateModal(false)
      await loadMonthEvents(currentMonth)
    } catch {
      setErrorMsg('Nepodařilo se vytvořit událost.')
    } finally {
      setSaving(false)
    }
  }

  async function updateEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEvent) return

    setErrorMsg(null)
    setSuccessMsg(null)
    setSaving(true)

    try {
      const res = await fetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedEvent.id,
          type: form.type,
          title: form.title,
          location: form.location,
          description: form.description,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          categoryIds: selectedCategoryIds,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Nepodařilo se upravit událost.')
        setSaving(false)
        return
      }

      setSuccessMsg('Událost byla upravena.')
      setShowEditModal(false)
      setSelectedEvent(data.event ?? null)
      await loadMonthEvents(currentMonth)
    } catch {
      setErrorMsg('Nepodařilo se upravit událost.')
    } finally {
      setSaving(false)
    }
  }

  function requestRemoveSelectedEvent() {
    if (!selectedEvent) return
    setShowDeleteConfirmModal(true)
  }

  async function confirmRemoveSelectedEvent() {
    if (!selectedEvent) return

    setErrorMsg(null)
    setSuccessMsg(null)
    setSaving(true)

    try {
      const res = await fetch(`/api/events?id=${selectedEvent.id}`, { method: 'DELETE' })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Nepodařilo se smazat událost.')
        setSaving(false)
        return
      }

      setSuccessMsg('Událost byla smazána.')
      setSelectedEvent(null)
      setShowEditModal(false)
      setShowEventModal(false)
      setShowDeleteConfirmModal(false)
      await loadMonthEvents(currentMonth)
    } catch {
      setErrorMsg('Nepodařilo se smazat událost.')
    } finally {
      setSaving(false)
    }
  }

  const layoutUser = user ?? {
    id: 0,
    first_name: '',
    last_name: '',
    role: '',
    organization: null,
    profile_picture: null,
  }

  const isManager = user?.role === 'manažer'

  return (
    <DashboardLayout user={layoutUser} isManager={isManager} themeVars={themeVars}>
      <Topbar title="Události" />

      <div className="app-content">
        <div className="page-intro page-intro-row">
          <div>
            <div className="page-intro-meta">Kalendář klubu</div>
            <h2 className="content-title">Události a tréninky</h2>
            <p className="content-subtitle">Plánujte tréninky jednorázově i opakovaně, hráči vše uvidí v kalendáři.</p>
          </div>
        </div>

        {errorMsg && <div className="alert alert-error"><div>{errorMsg}</div></div>}
        {successMsg && <div className="alert alert-success"><div>{successMsg}</div></div>}

        {loading ? (
          <div className="section">
            <div className="section-content" style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)' }}>
              Načítám kalendář…
            </div>
          </div>
        ) : (
          <div className={styles.eventsRoot}>
            <section className={styles.calendarCard}>
              <div className={styles.calendarHeader}>
                <h3 className={styles.monthTitle}>{monthLabel(currentMonth)}</h3>
                <div className={styles.headerActions}>
                  {canCreate && (
                    <button
                      type="button"
                      className={styles.createBtn}
                      onClick={() => {
                        setForm((prev) => ({ ...prev, date: selectedDate, repeatEndDate: selectedDate }))
                        setSelectedCategoryIds([])
                        setIncludeUncategorized(false)
                        setShowCreateModal(true)
                      }}
                    >
                      <Plus size={15} /> Nová událost
                    </button>
                  )}
                  <button type="button" className={styles.iconBtn} onClick={() => switchMonth(-1)} aria-label="Předchozí měsíc">
                    <ChevronLeft size={17} />
                  </button>
                  <button type="button" className={styles.iconBtn} onClick={() => switchMonth(1)} aria-label="Další měsíc">
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>

              <div className={styles.weekdayRow}>
                {WEEKDAYS.map((day) => (
                  <div key={day.label} className={styles.weekday}>{day.label}</div>
                ))}
              </div>

              <div className={styles.daysGrid}>
                {gridDays.map((day) => {
                  const key = dateKey(day)
                  const inCurrentMonth = day.getMonth() === currentMonth.getMonth()
                  const list = eventsByDay.get(key) ?? []
                  const topTwo = list.slice(0, 2)
                  const isSelected = key === selectedDate

                  return (
                    <div
                      key={key}
                      className={`${styles.dayCell} ${!inCurrentMonth ? styles.dayMuted : ''} ${isSelected ? styles.daySelected : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectDate(key)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          selectDate(key)
                        }
                      }}
                    >
                      <button type="button" className={styles.dayButton} onClick={() => selectDate(key)}>
                        {day.getDate()}
                      </button>

                      {topTwo.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          className={`${styles.timeStackBtn} ${selectedEvent?.id === event.id ? styles.timeStackActive : ''}`}
                          title={`${eventTypeLabel(event.type)}: ${event.title}`}
                          aria-label={`${eventTypeLabel(event.type)} ${event.title}, ${localTimeLabel(event.starts_at, event.all_day)}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            openEventDetails(event)
                          }}
                        >
                          <span className={`${styles.timeBlock} ${timeStartClass(event.type)}`}>{localTimeLabel(event.starts_at, event.all_day)}</span>
                          <span className={styles.timeStackTitle}>{event.title}</span>
                        </button>
                      ))}

                      {list.length > 2 && (
                        <div className={styles.moreBadge}>+{list.length - 2} další</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            <aside className={styles.sideRail}>
              <section className={styles.panelCard}>
                <h4 className={styles.panelTitle}>Detail události</h4>
                {selectedEvent ? (
                  <div className={styles.selectedCard}>
                    <div className={styles.dayEventTop}>
                      <p className={styles.dayEventTitle}>{selectedEvent.title}</p>
                      <span className={chipClass(selectedEvent.type)}>{eventTypeLabel(selectedEvent.type)}</span>
                    </div>
                    <p className={styles.dayEventMeta}>
                      <Clock3 size={13} /> {localTimeLabel(selectedEvent.starts_at, selectedEvent.all_day)} - {selectedEvent.ends_at ? localTimeLabel(selectedEvent.ends_at, selectedEvent.all_day) : '--:--'}
                    </p>
                    {selectedEvent.location && (
                      <p className={styles.dayEventMeta}><MapPin size={13} /> {selectedEvent.location}</p>
                    )}
                    <p className={styles.dayEventMeta}>{new Date(selectedEvent.starts_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

                    <div className={styles.selectedActions}>
                      <button
                        type="button"
                        className={styles.iconActionBtn}
                        onClick={() => setShowEventModal(true)}
                        title="Otevřít detail"
                        aria-label="Otevřít detail"
                      >
                        <Eye size={15} />
                        Detail
                      </button>

                      {canCreate && (
                        <>
                          <button
                            type="button"
                            className={styles.iconActionBtn}
                            onClick={() => {
                              setForm(toFormFromEvent(selectedEvent))
                              setSelectedCategoryIds(selectedEvent.categoryIds ?? [])
                              setIncludeUncategorized(false)
                              setShowEditModal(true)
                            }}
                            title="Upravit událost"
                            aria-label="Upravit událost"
                            disabled={saving}
                          >
                            <Pencil size={15} />
                            Upravit
                          </button>

                          <button
                            type="button"
                            className={`${styles.iconActionBtn} ${styles.iconActionDelete}`}
                            onClick={requestRemoveSelectedEvent}
                            title="Smazat událost"
                            aria-label="Smazat událost"
                            disabled={saving}
                          >
                            <Trash2 size={15} />
                            Smazat
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className={styles.panelSub}>Klikněte na událost v kalendáři.</p>
                )}

                {selectedEvent && canCreate && (
                  <div className={styles.attendanceBlock}>
                    <h5 className={styles.dayEventsTitle}>Docházka</h5>
                    <EventAttendancePanel eventId={selectedEvent.id} />
                  </div>
                )}

                <div className={styles.dayEventsList}>
                  <h5 className={styles.dayEventsTitle}>
                    Události dne ({new Date(selectedDate).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })})
                  </h5>
                  {selectedDateEvents.length === 0 ? (
                    <p className={styles.panelSub}>Pro tento den zatím není naplánovaná žádná akce.</p>
                  ) : (
                    selectedDateEvents.map((event) => (
                      <button key={event.id} type="button" className={styles.dayEventBtn} onClick={() => openEventDetails(event)}>
                        <div className={styles.dayEventTop}>
                          <p className={styles.dayEventTitle}>{event.title}</p>
                          <span className={chipClass(event.type)}>{eventTypeLabel(event.type)}</span>
                        </div>
                        <p className={styles.dayEventMeta}>
                          <Clock3 size={13} /> {localTimeLabel(event.starts_at, event.all_day)}
                          {event.ends_at ? ` - ${localTimeLabel(event.ends_at, event.all_day)}` : ''}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </section>

              <section className={styles.panelCard}>
                <h4 className={styles.panelTitle}>Nadcházející události</h4>
                <div className={styles.upcomingList}>
                  {upcomingEvents.length === 0 ? (
                    <div className={styles.dayEvent}>Žádné nadcházející události.</div>
                  ) : (
                    upcomingEvents.map((event) => (
                      <button key={event.id} type="button" className={styles.upcomingItem} onClick={() => openEventDetails(event)}>
                        <span className={`${styles.upcomingIcon} ${styles[`upcomingIcon${event.type.charAt(0).toUpperCase()}${event.type.slice(1)}`]}`}>
                          {eventTypeIcon(event.type)}
                        </span>

                        <div className={styles.upcomingContent}>
                          <div className={styles.upcomingTop}>
                            <p className={styles.upcomingTitle}>{event.title}</p>
                            <span className={chipClass(event.type)}>{eventTypeLabel(event.type)}</span>
                          </div>
                          <p className={styles.upcomingMeta}>{new Date(event.starts_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })}</p>
                          <p className={styles.upcomingTimeRow}>
                            <span className={styles.upcomingTimeIcon}><Clock3 size={13} /></span>
                            <span>{localTimeLabel(event.starts_at, event.all_day)}</span>
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>

      {selectedEvent && showEventModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowEventModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>{selectedEvent.title}</h3>
              <button type="button" className="btn btn-secondary" onClick={() => setShowEventModal(false)}>
                <X size={15} /> Zavřít
              </button>
            </div>

            <div className={styles.modalMeta}>
              <div><strong>Typ:</strong> {eventTypeLabel(selectedEvent.type)}</div>
              <div><strong>Čas:</strong> {localTimeLabel(selectedEvent.starts_at, selectedEvent.all_day)} - {selectedEvent.ends_at ? localTimeLabel(selectedEvent.ends_at, selectedEvent.all_day) : '--:--'}</div>
              {selectedEvent.location && <div><strong>Místo:</strong> {selectedEvent.location}</div>}
              {selectedEvent.description && <div><strong>Poznámka:</strong> {selectedEvent.description}</div>}
            </div>

            {canCreate && (
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setForm(toFormFromEvent(selectedEvent))
                    setShowEditModal(true)
                  }}
                  disabled={saving}
                >
                  Upravit
                </button>
                <button type="button" className={`btn ${styles.deleteBtn}`} onClick={requestRemoveSelectedEvent} disabled={saving}>
                  Smazat
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {canCreate && showCreateModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalCardWide} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Nová událost</h3>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                <X size={15} /> Zavřít
              </button>
            </div>

            <p className={styles.modalMeta}>Manažer a trenér mohou plánovat akce i opakované tréninky.</p>

            <form onSubmit={createEvent}>
              <div className={styles.formGrid}>
                <div>
                  <label className={styles.label}>Typ</label>
                  <select className={styles.select} value={form.type} onChange={(e) => setFormField('type', e.target.value as EventFormState['type'])}>
                    <option value="training">Trénink</option>
                    <option value="match">Zápas</option>
                    <option value="meeting">Schůzka</option>
                    <option value="event">Událost</option>
                  </select>
                </div>

                <div>
                  <label className={styles.label}>Název</label>
                  <input className={styles.field} value={form.title} onChange={(e) => setFormField('title', e.target.value)} required />
                </div>

                <div>
                  <label className={styles.label}>Datum</label>
                  <input type="date" className={styles.field} value={form.date} onChange={(e) => setFormField('date', e.target.value)} required />
                </div>

                <div>
                  <label className={styles.label}>Lokace</label>
                  <input className={styles.field} value={form.location} onChange={(e) => setFormField('location', e.target.value)} placeholder="Hřiště Letná" />
                </div>

                <div>
                  <label className={styles.label}>Od</label>
                  <input type="time" className={styles.field} value={form.startTime} onChange={(e) => setFormField('startTime', e.target.value)} required />
                </div>

                <div>
                  <label className={styles.label}>Do</label>
                  <input type="time" className={styles.field} value={form.endTime} onChange={(e) => setFormField('endTime', e.target.value)} required />
                </div>

                <div className={styles.formGridFull}>
                  <label className={styles.label}>Popis</label>
                  <textarea className={styles.textarea} value={form.description} onChange={(e) => setFormField('description', e.target.value)} />
                </div>

                {clubCategories.length > 0 && (
                  <div className={styles.formGridFull}>
                    <label className={styles.label}>Kategorie (kdo uvidí událost)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {clubCategories.map((cat) => {
                        const active = selectedCategoryIds.includes(cat.id)
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategoryIds((prev) =>
                              active ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                            )}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              height: 30,
                              padding: '0 11px',
                              borderRadius: 8,
                              border: `1.5px solid ${active ? cat.color : 'var(--color-border)'}`,
                              background: active ? `${cat.color}22` : 'transparent',
                              color: active ? cat.color : 'var(--color-text-muted)',
                              fontSize: 12.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 150ms ease',
                            }}
                          >
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                            {cat.name}
                            <span style={{ fontSize: 11, opacity: 0.7 }}>{cat.member_count}</span>
                          </button>
                        )
                      })}
                      <button
                        type="button"
                        onClick={() => setIncludeUncategorized((prev) => !prev)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          height: 30,
                          padding: '0 11px',
                          borderRadius: 8,
                          border: `1.5px solid ${includeUncategorized ? 'var(--color-text-muted)' : 'var(--color-border)'}`,
                          background: includeUncategorized ? 'rgba(128,128,128,0.15)' : 'transparent',
                          color: includeUncategorized ? 'var(--color-text)' : 'var(--color-text-muted)',
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-text-dim)', flexShrink: 0 }} />
                        Ostatní
                      </button>
                    </div>
                    {(selectedCategoryIds.length > 0 || includeUncategorized) && (
                      <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--color-text-dim)' }}>
                        Notifikace dostanou{' '}
                        <strong style={{ color: 'var(--color-text)' }}>
                          {clubCategories.filter((c) => selectedCategoryIds.includes(c.id)).reduce((sum, c) => sum + (c.member_count ?? 0), 0)} hráčů
                        </strong>
                        {includeUncategorized ? ' + nezařazení členové' : ''}.
                      </p>
                    )}
                    {selectedCategoryIds.length === 0 && !includeUncategorized && (
                      <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--color-text-dim)' }}>
                        Nevybráno → notifikaci dostanou všichni členové klubu.
                      </p>
                    )}
                    {selectedCategoryIds.length > 0 && (
                      <div className={styles.categoryMembersWrap}>
                        <div className={styles.categoryMembersHeader}>Hráči v kategoriích</div>
                        <div className={styles.categoryMembersGrid}>
                          {selectedCategoryIds.map((categoryId) => {
                            const cat = clubCategories.find((entry) => entry.id === categoryId)
                            const members = categoryMembersById[categoryId]
                            const isLoading = categoryMembersLoading.includes(categoryId)
                            const error = categoryMembersError[categoryId]
                            return (
                              <div key={categoryId} className={styles.categoryMembersCard}>
                                <div className={styles.categoryMembersTitle}>
                                  <span className={styles.categoryMembersDot} style={{ background: cat?.color ?? 'var(--color-primary)' }} />
                                  <span>{cat?.name ?? 'Kategorie'}</span>
                                  <span className={styles.categoryMembersCount}>
                                    {isLoading ? 'Načítám...' : `${members?.length ?? 0} hráčů`}
                                  </span>
                                </div>

                                {error && (
                                  <div className={styles.categoryMembersEmpty}>{error}</div>
                                )}

                                {!error && (isLoading || !members) && (
                                  <div className={styles.categoryMembersEmpty}>Načítám seznam hráčů…</div>
                                )}

                                {!error && members && members.length === 0 && (
                                  <div className={styles.categoryMembersEmpty}>Kategorie zatím nemá žádné hráče.</div>
                                )}

                                {!error && members && members.length > 0 && (
                                  <div className={styles.categoryMembersList}>
                                    {members.map((member) => (
                                      <div key={member.id} className={styles.categoryMemberRow}>
                                        {member.profile_picture ? (
                                          <img
                                            src={`/uploads/profiles/${member.profile_picture}`}
                                            alt=""
                                            className={styles.categoryMemberAvatarImg}
                                          />
                                        ) : (
                                          <div className={styles.categoryMemberAvatar}>
                                            {initialsForUser(member)}
                                          </div>
                                        )}
                                        <span className={styles.categoryMemberName}>
                                          {member.first_name} {member.last_name}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.repeatWrap}>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={form.repeatEnabled}
                    onChange={(e) => setFormField('repeatEnabled', e.target.checked)}
                  />
                  <Repeat size={14} /> Opakovaný trénink
                </label>

                {form.repeatEnabled && (
                  <>
                    <div className={styles.weekdayPickers}>
                      {WEEKDAYS.map((day) => (
                        <button
                          type="button"
                          key={day.value}
                          className={`${styles.weekdayBtn} ${form.repeatWeekdays.includes(day.value) ? styles.weekdayBtnActive : ''}`}
                          onClick={() => toggleWeekday(day.value)}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <label className={styles.label}>Opakovat do</label>
                      <input
                        type="date"
                        className={styles.field}
                        value={form.repeatEndDate}
                        onChange={(e) => setFormField('repeatEndDate', e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}
              </div>

              <div className={styles.actions}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <CalendarDays size={15} /> {saving ? 'Ukládám...' : 'Vytvořit událost'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {canCreate && selectedEvent && showEditModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowEditModal(false)}>
          <div className={styles.modalCardWide} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Upravit událost</h3>
              <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                <X size={15} /> Zavřít
              </button>
            </div>

            <form onSubmit={updateEvent}>
              <div className={styles.formGrid}>
                <div>
                  <label className={styles.label}>Typ</label>
                  <select className={styles.select} value={form.type} onChange={(e) => setFormField('type', e.target.value as EventFormState['type'])}>
                    <option value="training">Trénink</option>
                    <option value="match">Zápas</option>
                    <option value="meeting">Schůzka</option>
                    <option value="event">Událost</option>
                  </select>
                </div>

                <div>
                  <label className={styles.label}>Název</label>
                  <input className={styles.field} value={form.title} onChange={(e) => setFormField('title', e.target.value)} required />
                </div>

                <div>
                  <label className={styles.label}>Datum</label>
                  <input type="date" className={styles.field} value={form.date} onChange={(e) => setFormField('date', e.target.value)} required />
                </div>

                <div>
                  <label className={styles.label}>Lokace</label>
                  <input className={styles.field} value={form.location} onChange={(e) => setFormField('location', e.target.value)} />
                </div>

                <div>
                  <label className={styles.label}>Od</label>
                  <input type="time" className={styles.field} value={form.startTime} onChange={(e) => setFormField('startTime', e.target.value)} required />
                </div>

                <div>
                  <label className={styles.label}>Do</label>
                  <input type="time" className={styles.field} value={form.endTime} onChange={(e) => setFormField('endTime', e.target.value)} required />
                </div>

                <div className={styles.formGridFull}>
                  <label className={styles.label}>Popis</label>
                  <textarea className={styles.textarea} value={form.description} onChange={(e) => setFormField('description', e.target.value)} />
                </div>

                {clubCategories.length > 0 && (
                  <div className={styles.formGridFull}>
                    <label className={styles.label}>Kategorie (kdo uvidí událost)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {clubCategories.map((cat) => {
                        const active = selectedCategoryIds.includes(cat.id)
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategoryIds((prev) =>
                              active ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                            )}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              height: 30,
                              padding: '0 11px',
                              borderRadius: 8,
                              border: `1.5px solid ${active ? cat.color : 'var(--color-border)'}`,
                              background: active ? `${cat.color}22` : 'transparent',
                              color: active ? cat.color : 'var(--color-text-muted)',
                              fontSize: 12.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 150ms ease',
                            }}
                          >
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                            {cat.name}
                            <span style={{ fontSize: 11, opacity: 0.7 }}>{cat.member_count}</span>
                          </button>
                        )
                      })}
                      <button
                        type="button"
                        onClick={() => setIncludeUncategorized((prev) => !prev)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          height: 30,
                          padding: '0 11px',
                          borderRadius: 8,
                          border: `1.5px solid ${includeUncategorized ? 'var(--color-text-muted)' : 'var(--color-border)'}`,
                          background: includeUncategorized ? 'rgba(128,128,128,0.15)' : 'transparent',
                          color: includeUncategorized ? 'var(--color-text)' : 'var(--color-text-muted)',
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-text-dim)', flexShrink: 0 }} />
                        Ostatní
                      </button>
                    </div>
                    {selectedCategoryIds.length === 0 && !includeUncategorized && (
                      <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--color-text-dim)' }}>
                        Nevybráno → uvidí všichni členové klubu.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.actions}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Ukládám...' : 'Uložit změny'}
                </button>
                <button type="button" className={`btn ${styles.deleteBtn}`} onClick={requestRemoveSelectedEvent} disabled={saving}>
                  Smazat událost
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEvent && showDeleteConfirmModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowDeleteConfirmModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Smazat událost</h3>
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirmModal(false)}>
                <X size={15} /> Zavřít
              </button>
            </div>

            <p className={styles.modalMeta}>
              Opravdu chcete smazat událost <strong>{selectedEvent.title}</strong>? Tato akce nejde vrátit zpět.
            </p>

            <div className={styles.actions}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirmModal(false)} disabled={saving}>
                Zrušit
              </button>
              <button type="button" className={`btn ${styles.deleteBtn}`} onClick={confirmRemoveSelectedEvent} disabled={saving}>
                {saving ? 'Mažu...' : 'Ano, smazat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
