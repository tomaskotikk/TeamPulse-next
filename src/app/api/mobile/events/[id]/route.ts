import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { eventHasStarted, getClubEvent, getInviteeIdsForEvents, withMemberResponses } from '@/lib/attendance'
import { requireMobileContext } from '@/lib/mobile-api'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireMobileContext(request)
    if (ctx instanceof NextResponse) return ctx

    const eventId = Number.parseInt((await params).id, 10)
    if (!Number.isInteger(eventId)) return NextResponse.json({ error: 'Neplatná událost.' }, { status: 400 })

    const supabase = await createAdminClient()
    // event row and invitee list in parallel; club comes from the context (no second lookup)
    const [found, inviteeMap] = await Promise.all([
      getClubEvent(supabase, ctx.club, eventId),
      getInviteeIdsForEvents(supabase, ctx.club, [eventId]),
    ])
    if (!found) return NextResponse.json({ error: 'Událost nebyla nalezena.' }, { status: 404 })

    const invited = inviteeMap.get(eventId) ?? new Set<number>()
    const canRespond = ctx.memberId !== null && invited.has(ctx.memberId)
    const [event] = await withMemberResponses([found], ctx.memberId ?? -1)
    const reason = canRespond ? event.reason : null

    return NextResponse.json({
      event,
      reason,
      started: eventHasStarted(found),
      canRespond,
      memberId: ctx.memberId,
    })
  } catch (err) {
    console.error('Mobile event detail error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
