import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getClubForUser, getCurrentAppUser } from '@/lib/app-context'

type EventType = 'training' | 'match' | 'meeting' | 'event'

type RepeatPayload = {
  enabled: boolean
  weekdays?: number[]
  endDate?: string
}

type CreateEventPayload = {
  type: EventType
  title: string
  description?: string
  location?: string
  date: string
  startTime: string
  endTime?: string
  allDay?: boolean
  repeat?: RepeatPayload
}

type UpdateEventPayload = {
  id: number
  type: EventType
  title: string
  description?: string
  location?: string
  date: string
  startTime: string
  endTime?: string
  allDay?: boolean
}

const ALLOWED_TYPES = new Set<EventType>(['training', 'match', 'meeting', 'event'])
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

function toDateRange(value: string | null, fallback: Date) {
  if (!value || !DATE_RE.test(value)) return fallback
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return fallback
  return parsed
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildStartDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`)
}

function normalizeWeekdays(weekdays: unknown): number[] {
  if (!Array.isArray(weekdays)) return []
  const unique = new Set<number>()
  for (const raw of weekdays) {
    const value = Number(raw)
    if (Number.isInteger(value) && value >= 0 && value <= 6) unique.add(value)
  }
  return [...unique].sort((a, b) => a - b)
}

function expandDates(date: string, repeat?: RepeatPayload) {
  if (!repeat?.enabled) return [date]
  if (!repeat.endDate || !DATE_RE.test(repeat.endDate)) return null

  const start = new Date(`${date}T00:00:00`)
  const end = new Date(`${repeat.endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  if (end < start) return null

  const weekdays = normalizeWeekdays(repeat.weekdays)
  if (!weekdays.length) return null

  const dates: string[] = []
  const cursor = new Date(start)

  while (cursor <= end) {
    if (weekdays.includes(cursor.getDay())) {
      dates.push(toLocalDateKey(cursor))
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  if (!dates.length) return null
  if (dates.length > 260) return null

  return dates
}

function toEventRow(payload: {
  type: EventType
  title: string
  description?: string
  location?: string
  date: string
  startTime: string
  endTime?: string
  allDay?: boolean
}) {
  const startsAt = buildStartDateTime(payload.date, payload.startTime)
  const endsAt = payload.endTime ? buildStartDateTime(payload.date, payload.endTime) : null

  if (Number.isNaN(startsAt.getTime())) {
    throw new Error('Neplatný datum/čas začátku')
  }
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    throw new Error('Neplatný datum/čas konce')
  }
  if (endsAt && endsAt <= startsAt) {
    throw new Error('Čas konce musí být později než čas začátku')
  }

  return {
    type: payload.type,
    title: payload.title,
    description: payload.description?.trim() ? payload.description.trim() : null,
    location: payload.location?.trim() ? payload.location.trim() : null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt ? endsAt.toISOString() : null,
    all_day: Boolean(payload.allDay),
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })

    const url = new URL(request.url)
    const now = new Date()
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const from = toDateRange(url.searchParams.get('from'), defaultFrom)
    const to = toDateRange(url.searchParams.get('to'), defaultTo)

    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('club_events')
      .select('id, club_id, created_by_user_id, type, title, description, location, starts_at, ends_at, all_day, created_at')
      .eq('club_id', club.id)
      .gte('starts_at', new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0).toISOString())
      .lte('starts_at', new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59).toISOString())
      .order('starts_at', { ascending: true })

    if (error) {
      console.error('Events GET error:', error)
      return NextResponse.json({ error: 'Nepodařilo se načíst události.' }, { status: 500 })
    }

    return NextResponse.json({ events: data ?? [] })
  } catch (err) {
    console.error('Events GET error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })
    if (user.role !== 'manažer' && user.role !== 'trenér') {
      return NextResponse.json({ error: 'Pouze manažer nebo trenér může vytvářet události.' }, { status: 403 })
    }

    const body = (await request.json().catch(() => ({}))) as Partial<CreateEventPayload>

    const type = body.type && ALLOWED_TYPES.has(body.type) ? body.type : null
    const title = (body.title ?? '').trim()
    const description = (body.description ?? '').trim()
    const location = (body.location ?? '').trim()
    const date = body.date ?? ''
    const startTime = body.startTime ?? ''
    const endTime = body.endTime ?? ''
    const allDay = Boolean(body.allDay)

    if (!type) return NextResponse.json({ error: 'Neplatný typ události.' }, { status: 400 })
    if (!title) return NextResponse.json({ error: 'Název události je povinný.' }, { status: 400 })
    if (!DATE_RE.test(date)) return NextResponse.json({ error: 'Neplatné datum.' }, { status: 400 })
    if (!TIME_RE.test(startTime)) return NextResponse.json({ error: 'Neplatný čas začátku.' }, { status: 400 })
    if (endTime && !TIME_RE.test(endTime)) return NextResponse.json({ error: 'Neplatný čas konce.' }, { status: 400 })

    const days = expandDates(date, body.repeat)
    if (!days) {
      return NextResponse.json({ error: 'Neplatné nastavení opakování. Zkontrolujte dny a období.' }, { status: 400 })
    }

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })

    const rows = days.map((day) => {
      const startsAt = buildStartDateTime(day, startTime)
      const endsAt = endTime ? buildStartDateTime(day, endTime) : null

      if (Number.isNaN(startsAt.getTime())) {
        throw new Error('Neplatný datum/čas začátku')
      }
      if (endsAt && Number.isNaN(endsAt.getTime())) {
        throw new Error('Neplatný datum/čas konce')
      }

      if (endsAt && endsAt <= startsAt) {
        throw new Error('Čas konce musí být později než čas začátku')
      }

      return {
        club_id: club.id,
        created_by_user_id: user.id,
        type,
        title,
        description: description || null,
        location: location || null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt ? endsAt.toISOString() : null,
        all_day: allDay,
      }
    })

    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('club_events')
      .insert(rows)
      .select('id, club_id, created_by_user_id, type, title, description, location, starts_at, ends_at, all_day, created_at')

    if (error) {
      console.error('Events POST error:', error)
      return NextResponse.json({ error: 'Nepodařilo se uložit událost.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, createdCount: rows.length, events: data ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Nastala chyba serveru.'
    if (message.includes('Čas konce')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    console.error('Events POST error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })
    if (user.role !== 'manažer' && user.role !== 'trenér') {
      return NextResponse.json({ error: 'Pouze manažer nebo trenér může upravovat události.' }, { status: 403 })
    }

    const body = (await request.json().catch(() => ({}))) as Partial<UpdateEventPayload>
    const id = Number(body.id)
    const type = body.type && ALLOWED_TYPES.has(body.type) ? body.type : null
    const title = (body.title ?? '').trim()
    const date = body.date ?? ''
    const startTime = body.startTime ?? ''
    const endTime = body.endTime ?? ''

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Neplatné ID události.' }, { status: 400 })
    }
    if (!type) return NextResponse.json({ error: 'Neplatný typ události.' }, { status: 400 })
    if (!title) return NextResponse.json({ error: 'Název události je povinný.' }, { status: 400 })
    if (!DATE_RE.test(date)) return NextResponse.json({ error: 'Neplatné datum.' }, { status: 400 })
    if (!TIME_RE.test(startTime)) return NextResponse.json({ error: 'Neplatný čas začátku.' }, { status: 400 })
    if (endTime && !TIME_RE.test(endTime)) return NextResponse.json({ error: 'Neplatný čas konce.' }, { status: 400 })

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })

    const supabase = await createAdminClient()

    const { data: existing, error: existingError } = await supabase
      .from('club_events')
      .select('id, club_id')
      .eq('id', id)
      .eq('club_id', club.id)
      .maybeSingle()

    if (existingError) {
      console.error('Events PATCH find error:', existingError)
      return NextResponse.json({ error: 'Nepodařilo se načíst událost.' }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json({ error: 'Událost nebyla nalezena.' }, { status: 404 })
    }

    const row = toEventRow({
      type,
      title,
      description: body.description,
      location: body.location,
      date,
      startTime,
      endTime,
      allDay: body.allDay,
    })

    const { data, error } = await supabase
      .from('club_events')
      .update(row)
      .eq('id', id)
      .eq('club_id', club.id)
      .select('id, club_id, created_by_user_id, type, title, description, location, starts_at, ends_at, all_day, created_at')
      .single()

    if (error) {
      console.error('Events PATCH error:', error)
      return NextResponse.json({ error: 'Nepodařilo se upravit událost.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, event: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Nastala chyba serveru.'
    if (message.includes('Čas konce')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    console.error('Events PATCH error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })
    if (user.role !== 'manažer' && user.role !== 'trenér') {
      return NextResponse.json({ error: 'Pouze manažer nebo trenér může mazat události.' }, { status: 403 })
    }

    const url = new URL(request.url)
    const id = Number(url.searchParams.get('id'))
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Neplatné ID události.' }, { status: 400 })
    }

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })

    const supabase = await createAdminClient()
    const { error } = await supabase
      .from('club_events')
      .delete()
      .eq('id', id)
      .eq('club_id', club.id)

    if (error) {
      console.error('Events DELETE error:', error)
      return NextResponse.json({ error: 'Nepodařilo se smazat událost.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Events DELETE error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
