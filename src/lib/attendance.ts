import { createAdminClient } from '@/lib/supabase/server'
import { getClubForUser, type AppClub, type AppUser } from '@/lib/app-context'
import { isParentOf } from '@/lib/parent'

export type AdminClient = Awaited<ReturnType<typeof createAdminClient>>
export type Response = 'yes' | 'no'
export type Attended = 'present' | 'absent' | 'excused'

export type ClubEventRow = {
  id: number
  club_id: number
  type: 'training' | 'match' | 'meeting' | 'event'
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string | null
  all_day: boolean
}

export type AttendanceRow = {
  event_id: number
  user_id: number
  response: Response | null
  response_reason: string | null
  responded_by: number | null
  responded_at: string | null
  attended: Attended | null
  recorded_by: number | null
  recorded_at: string | null
}

export type Invitee = {
  id: number
  first_name: string
  last_name: string
  profile_picture: string | null
}

export const EVENT_COLUMNS = 'id, club_id, type, title, description, location, starts_at, ends_at, all_day'

export function eventHasStarted(event: Pick<ClubEventRow, 'starts_at'>, now = new Date()) {
  return new Date(event.starts_at).getTime() <= now.getTime()
}

export function canManageAttendance(user: AppUser) {
  return user.role === 'manažer' || user.role === 'trenér'
}

/** Loads an event only if it belongs to the viewer's club. */
export async function getEventForUser(supabase: AdminClient, user: AppUser, eventId: number) {
  const club = await getClubForUser(user)
  if (!club) return null
  const { data } = await supabase
    .from('club_events')
    .select(EVENT_COLUMNS)
    .eq('id', eventId)
    .eq('club_id', club.id)
    .maybeSingle()
  if (!data) return null
  return { event: data as ClubEventRow, club }
}

/**
 * Players invited to the given events: players of the event's categories
 * (all club players when the event has no category), plus manual additions,
 * minus manual exclusions. Returns eventId -> invitee ids.
 */
export async function getInviteeIdsForEvents(supabase: AdminClient, club: AppClub, eventIds: number[]) {
  const result = new Map<number, Set<number>>()
  if (eventIds.length === 0) return result

  const [{ data: players }, { data: eventCats }, { data: manual }] = await Promise.all([
    supabase.from('users').select('id').eq('organization', club.name).eq('role', 'hráč'),
    supabase.from('club_event_categories').select('event_id, category_id').in('event_id', eventIds),
    supabase.from('club_event_participants').select('event_id, user_id, excluded').in('event_id', eventIds),
  ])

  const playerIds = new Set((players ?? []).map((p: { id: number }) => p.id))
  const catsByEvent = new Map<number, number[]>()
  for (const row of eventCats ?? []) {
    catsByEvent.set(row.event_id, [...(catsByEvent.get(row.event_id) ?? []), row.category_id])
  }

  const allCatIds = [...new Set((eventCats ?? []).map((r: { category_id: number }) => r.category_id))]
  const membersByCat = new Map<number, number[]>()
  if (allCatIds.length > 0) {
    const { data: members } = await supabase
      .from('category_members')
      .select('category_id, user_id')
      .in('category_id', allCatIds)
      .eq('excluded', false)
    for (const m of members ?? []) {
      membersByCat.set(m.category_id, [...(membersByCat.get(m.category_id) ?? []), m.user_id])
    }
  }

  for (const eventId of eventIds) {
    const cats = catsByEvent.get(eventId)
    const ids = new Set<number>()
    if (!cats || cats.length === 0) {
      for (const id of playerIds) ids.add(id)
    } else {
      for (const c of cats) for (const id of membersByCat.get(c) ?? []) if (playerIds.has(id)) ids.add(id)
    }
    result.set(eventId, ids)
  }

  for (const row of manual ?? []) {
    const ids = result.get(row.event_id)
    if (!ids) continue
    if (row.excluded) ids.delete(row.user_id)
    else if (playerIds.has(row.user_id)) ids.add(row.user_id)
  }

  return result
}

export async function getInvitees(supabase: AdminClient, club: AppClub, eventId: number): Promise<Invitee[]> {
  const ids = [...((await getInviteeIdsForEvents(supabase, club, [eventId])).get(eventId) ?? [])]
  if (ids.length === 0) return []
  const { data } = await supabase
    .from('users')
    .select('id, first_name, last_name, profile_picture')
    .in('id', ids)
  return ((data ?? []) as Invitee[]).sort((a, b) =>
    `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'cs'),
  )
}

/** A user may answer for themselves or for a linked child. */
export async function canRespondFor(user: AppUser, targetUserId: number) {
  if (user.id === targetUserId) return true
  if (user.role === 'rodič') return isParentOf(user.id, targetUserId)
  return false
}

/** Upcoming events a member is invited to (used by the parent overview and mobile list). */
export async function getUpcomingEventsForMember(club: AppClub, memberId: number, limit = 10, allClubEvents = false) {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('club_events')
    .select(EVENT_COLUMNS)
    .eq('club_id', club.id)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(80)

  const events = (data ?? []) as ClubEventRow[]
  // staff (manager / coach) see every club event; players and parents only their invitations
  if (allClubEvents) return events.slice(0, limit)
  const invitees = await getInviteeIdsForEvents(supabase, club, events.map((e) => e.id))
  return events.filter((e) => invitees.get(e.id)?.has(memberId)).slice(0, limit)
}

/** Present ÷ (present + absent); excused and unrecorded events are left out. */
export function attendanceRate(rows: Array<Pick<AttendanceRow, 'attended'>>) {
  const present = rows.filter((r) => r.attended === 'present').length
  const absent = rows.filter((r) => r.attended === 'absent').length
  if (present + absent === 0) return null
  return Math.round((present / (present + absent)) * 100)
}

export type MatrixFilters = { from: string; to: string; categoryId: number | null; type: string | null }

export type MatrixCell = { response: Response | null; attended: Attended | null } | null

/** Players × events in a period, with per-player attendance rate. Staff only. */
export async function getAttendanceMatrix(club: AppClub, filters: MatrixFilters) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('club_events')
    .select(EVENT_COLUMNS)
    .eq('club_id', club.id)
    .gte('starts_at', new Date(`${filters.from}T00:00:00`).toISOString())
    .lte('starts_at', new Date(`${filters.to}T23:59:59`).toISOString())
    .order('starts_at', { ascending: true })
    .limit(200)
  if (filters.type) query = query.eq('type', filters.type)
  const { data: eventData } = await query
  let events = (eventData ?? []) as ClubEventRow[]

  const invitees = await getInviteeIdsForEvents(supabase, club, events.map((e) => e.id))

  let categoryMemberIds: Set<number> | null = null
  if (filters.categoryId) {
    const { data } = await supabase
      .from('category_members')
      .select('user_id')
      .eq('category_id', filters.categoryId)
      .eq('excluded', false)
    categoryMemberIds = new Set((data ?? []).map((r: { user_id: number }) => r.user_id))
    events = events.filter((e) => [...(invitees.get(e.id) ?? [])].some((id) => categoryMemberIds!.has(id)))
  }

  const playerIds = new Set<number>()
  for (const e of events) for (const id of invitees.get(e.id) ?? []) {
    if (!categoryMemberIds || categoryMemberIds.has(id)) playerIds.add(id)
  }

  const [{ data: users }, { data: att }] = await Promise.all([
    playerIds.size
      ? supabase.from('users').select('id, first_name, last_name, profile_picture').in('id', [...playerIds])
      : Promise.resolve({ data: [] }),
    events.length
      ? supabase.from('event_attendance').select('*').in('event_id', events.map((e) => e.id))
      : Promise.resolve({ data: [] }),
  ])

  const attByKey = new Map(((att ?? []) as AttendanceRow[]).map((r) => [`${r.event_id}:${r.user_id}`, r]))
  const players = ((users ?? []) as Invitee[]).sort((a, b) =>
    `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'cs'),
  )

  const rows = players.map((p) => {
    const cells: MatrixCell[] = events.map((e) => {
      if (!invitees.get(e.id)?.has(p.id)) return null
      const a = attByKey.get(`${e.id}:${p.id}`)
      return { response: a?.response ?? null, attended: a?.attended ?? null }
    })
    const rate = attendanceRate(cells.filter((c): c is NonNullable<MatrixCell> => c !== null))
    return { player: p, cells, rate }
  })

  return { events, rows }
}

function csvEscape(value: string) {
  return /[",;\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

const CELL_CSV: Record<string, string> = { present: 'přítomen', absent: 'nepřítomen', excused: 'omluven' }

export function matrixToCsv(matrix: Awaited<ReturnType<typeof getAttendanceMatrix>>) {
  const header = [
    'Hráč',
    ...matrix.events.map((e) => `${new Date(e.starts_at).toLocaleDateString('cs-CZ')} ${e.title}`),
    'Docházka %',
  ]
  const lines = matrix.rows.map((r) => [
    `${r.player.last_name} ${r.player.first_name}`,
    ...r.cells.map((c) => {
      if (!c) return ''
      if (c.attended) return CELL_CSV[c.attended]
      if (c.response === 'yes') return 'přijde'
      if (c.response === 'no') return 'nepřijde'
      return 'nevyjádřen'
    }),
    r.rate === null ? '' : String(r.rate),
  ])
  // BOM + semicolons so Czech Excel opens it correctly
  return '﻿' + [header, ...lines].map((l) => l.map(csvEscape).join(';')).join('\r\n')
}

export type EventWithResponse = ClubEventRow & {
  response: Response | null
  categories: Array<{ name: string; color: string }>
}

/** Adds the member's own response and category labels to a list of events. */
export async function withMemberResponses(events: ClubEventRow[], memberId: number): Promise<EventWithResponse[]> {
  if (events.length === 0) return []
  const supabase = await createAdminClient()
  const ids = events.map((e) => e.id)
  const [{ data: att }, { data: links }] = await Promise.all([
    supabase.from('event_attendance').select('event_id, response').eq('user_id', memberId).in('event_id', ids),
    supabase.from('club_event_categories').select('event_id, club_categories(name, color)').in('event_id', ids),
  ])
  const responseByEvent = new Map((att ?? []).map((r: { event_id: number; response: Response | null }) => [r.event_id, r.response]))
  const catsByEvent = new Map<number, Array<{ name: string; color: string }>>()
  type Cat = { name: string; color: string }
  for (const l of (links ?? []) as Array<{ event_id: number; club_categories: Cat | Cat[] | null }>) {
    const cat = Array.isArray(l.club_categories) ? l.club_categories[0] : l.club_categories
    if (cat) catsByEvent.set(l.event_id, [...(catsByEvent.get(l.event_id) ?? []), cat])
  }
  return events.map((e) => ({ ...e, response: responseByEvent.get(e.id) ?? null, categories: catsByEvent.get(e.id) ?? [] }))
}

/** Whose attendance the viewer manages on mobile: themselves, or the selected child for parents. */
export async function getAttendanceSubject(user: AppUser) {
  if (user.role !== 'rodič') return { memberId: user.id, memberName: null as string | null, children: [] as Array<{ id: number; first_name: string; last_name: string; profile_picture: string | null }> }
  const { getChildrenForParent, getSelectedChild } = await import('@/lib/parent')
  const children = await getChildrenForParent(user.id)
  const selected = await getSelectedChild(children)
  return {
    memberId: selected?.id ?? null,
    memberName: selected ? selected.first_name : null,
    children,
  }
}
