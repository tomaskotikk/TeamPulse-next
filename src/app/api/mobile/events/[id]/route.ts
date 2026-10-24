import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { eventHasStarted, getEventForUser, getInviteeIdsForEvents, withMemberResponses } from '@/lib/attendance'
import { requireMobileContext } from '@/lib/mobile-api'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireMobileContext(request)
    if (ctx instanceof NextResponse) return ctx

    const eventId = Number.parseInt((await params).id, 10)
    if (!Number.isInteger(eventId)) return NextResponse.json({ error: 'Neplatná událost.' }, { status: 400 })

    const supabase = await createAdminClient()
    const found = await getEventForUser(supabase, ctx.user, eventId)
    if (!found) return NextResponse.json({ error: 'Událost nebyla nalezena.' }, { status: 404 })

    const invited = (await getInviteeIdsForEvents(supabase, ctx.club, [eventId])).get(eventId) ?? new Set<number>()
    const canRespond = ctx.memberId !== null && invited.has(ctx.memberId)
    const [event] = await withMemberResponses([found.event], ctx.memberId ?? -1)

    let reason: string | null = null
    if (canRespond) {
      const { data } = await supabase
        .from('event_attendance')
        .select('response_reason')
        .eq('event_id', eventId)
        .eq('user_id', ctx.memberId!)
        .maybeSingle()
      reason = data?.response_reason ?? null
    }

    return NextResponse.json({
      event,
      reason,
      started: eventHasStarted(found.event),
      canRespond,
      memberId: ctx.memberId,
    })
  } catch (err) {
    console.error('Mobile event detail error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
