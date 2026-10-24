import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAppUser } from '@/lib/app-context'
import { createAdminClient } from '@/lib/supabase/server'
import {
  canManageAttendance,
  eventHasStarted,
  getEventForUser,
  getInvitees,
  type AttendanceRow,
  type Attended,
} from '@/lib/attendance'

type Params = { params: Promise<{ id: string }> }

async function resolve(params: Params['params']) {
  const user = await getCurrentAppUser()
  if (!user) return { error: NextResponse.json({ error: 'Nejste přihlášen.' }, { status: 401 }) }
  const eventId = Number.parseInt((await params).id, 10)
  if (!Number.isInteger(eventId)) return { error: NextResponse.json({ error: 'Neplatná událost.' }, { status: 400 }) }
  const supabase = await createAdminClient()
  const found = await getEventForUser(supabase, user, eventId)
  if (!found) return { error: NextResponse.json({ error: 'Událost nebyla nalezena.' }, { status: 404 }) }
  return { user, supabase, eventId, ...found }
}

/** Invitees with their response and recorded attendance + summary. */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const ctx = await resolve(params)
    if ('error' in ctx) return ctx.error

    const invitees = await getInvitees(ctx.supabase, ctx.club, ctx.eventId)
    const { data } = await ctx.supabase.from('event_attendance').select('*').eq('event_id', ctx.eventId)
    const byUser = new Map(((data ?? []) as AttendanceRow[]).map((r) => [r.user_id, r]))
    const canManage = canManageAttendance(ctx.user)

    const rows = invitees.map((p) => {
      const a = byUser.get(p.id)
      return {
        user: p,
        response: a?.response ?? null,
        // reasons are visible only to staff and the member themselves
        reason: canManage || p.id === ctx.user.id ? a?.response_reason ?? null : null,
        responded_at: a?.responded_at ?? null,
        responded_by_parent: Boolean(a?.responded_by && a.responded_by !== p.id),
        attended: a?.attended ?? null,
      }
    })

    const summary = {
      invited: rows.length,
      yes: rows.filter((r) => r.response === 'yes').length,
      no: rows.filter((r) => r.response === 'no').length,
      pending: rows.filter((r) => !r.response).length,
      recorded: rows.some((r) => r.attended),
      present: rows.filter((r) => r.attended === 'present').length,
    }

    return NextResponse.json({
      event: ctx.event,
      started: eventHasStarted(ctx.event),
      canManage,
      summary,
      rows,
    })
  } catch (err) {
    console.error('Attendance GET error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

/** Coach / manager records actual attendance: { entries: [{ userId, attended }] }. */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const ctx = await resolve(params)
    if ('error' in ctx) return ctx.error
    if (!canManageAttendance(ctx.user)) {
      return NextResponse.json({ error: 'Docházku může zapisovat jen trenér nebo manažer.' }, { status: 403 })
    }
    if (!eventHasStarted(ctx.event)) {
      return NextResponse.json({ error: 'Docházku lze zapsat až po začátku události.' }, { status: 409 })
    }

    const body = (await request.json().catch(() => ({}))) as { entries?: Array<{ userId?: unknown; attended?: unknown }> }
    const allowed = new Set(['present', 'absent', 'excused'])
    const invitedIds = new Set((await getInvitees(ctx.supabase, ctx.club, ctx.eventId)).map((p) => p.id))
    const now = new Date().toISOString()

    const entries = (body.entries ?? [])
      .map((e) => ({ userId: Number(e.userId), attended: String(e.attended) }))
      .filter((e) => invitedIds.has(e.userId) && allowed.has(e.attended))

    if (entries.length === 0) return NextResponse.json({ error: 'Nic k uložení.' }, { status: 400 })

    // keep existing responses: update rows that exist, insert the rest
    const { data: existing } = await ctx.supabase
      .from('event_attendance')
      .select('user_id')
      .eq('event_id', ctx.eventId)
    const existingIds = new Set((existing ?? []).map((r: { user_id: number }) => r.user_id))

    for (const e of entries) {
      const values = { attended: e.attended as Attended, recorded_by: ctx.user.id, recorded_at: now }
      const { error } = existingIds.has(e.userId)
        ? await ctx.supabase.from('event_attendance').update(values).eq('event_id', ctx.eventId).eq('user_id', e.userId)
        : await ctx.supabase.from('event_attendance').insert({ event_id: ctx.eventId, user_id: e.userId, ...values })
      if (error) {
        console.error('Attendance PUT error:', error)
        return NextResponse.json({ error: 'Docházku se nepodařilo uložit.' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, saved: entries.length })
  } catch (err) {
    console.error('Attendance PUT error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
