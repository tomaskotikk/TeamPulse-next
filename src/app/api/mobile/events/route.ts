import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { EVENT_COLUMNS, canManageAttendance, getInviteeIdsForEvents, withMemberResponses, type ClubEventRow } from '@/lib/attendance'
import { requireMobileContext } from '@/lib/mobile-api'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Events in a date range that the member is invited to, with their response. */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireMobileContext(request)
    if (ctx instanceof NextResponse) return ctx
    if (!ctx.memberId) return NextResponse.json({ events: [] })

    const sp = request.nextUrl.searchParams
    const from = sp.get('from') ?? ''
    const to = sp.get('to') ?? ''
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      return NextResponse.json({ error: 'Neplatné období.' }, { status: 400 })
    }

    const supabase = await createAdminClient()
    const { data } = await supabase
      .from('club_events')
      .select(EVENT_COLUMNS)
      .eq('club_id', ctx.club.id)
      .gte('starts_at', new Date(`${from}T00:00:00`).toISOString())
      .lte('starts_at', new Date(`${to}T23:59:59`).toISOString())
      .order('starts_at', { ascending: true })
      .limit(300)

    const events = (data ?? []) as ClubEventRow[]
    const invitees = await getInviteeIdsForEvents(supabase, ctx.club, events.map((e) => e.id))
    const mine = canManageAttendance(ctx.user) ? events : events.filter((e) => invitees.get(e.id)?.has(ctx.memberId!))

    return NextResponse.json({ staff: canManageAttendance(ctx.user), events: await withMemberResponses(mine, ctx.memberId) })
  } catch (err) {
    console.error('Mobile events error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
