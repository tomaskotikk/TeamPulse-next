import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { eventHasStarted, getClubEvent, getInviteeIdsForEvents, withMemberResponses } from '@/lib/attendance'
import { publicUploadUrl, requireMobileContext } from '@/lib/mobile-api'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireMobileContext(request)
    if (ctx instanceof NextResponse) return ctx

    const eventId = Number.parseInt((await params).id, 10)
    if (!Number.isInteger(eventId)) return NextResponse.json({ error: 'Neplatná událost.' }, { status: 400 })

    const supabase = await createAdminClient()
    // event row, invitees, all responses and the organiser in parallel
    const [found, inviteeMap, { data: attendance }, { data: eventMeta }] = await Promise.all([
      getClubEvent(supabase, ctx.club, eventId),
      getInviteeIdsForEvents(supabase, ctx.club, [eventId]),
      supabase.from('event_attendance').select('user_id, response').eq('event_id', eventId),
      supabase.from('club_events').select('created_by_user_id, users!club_events_created_by_user_id_fkey(first_name, last_name)').eq('id', eventId).maybeSingle(),
    ])
    if (!found) return NextResponse.json({ error: 'Událost nebyla nalezena.' }, { status: 404 })

    const invited = inviteeMap.get(eventId) ?? new Set<number>()
    const canRespond = ctx.memberId !== null && invited.has(ctx.memberId)
    const [event] = await withMemberResponses([found], ctx.memberId ?? -1)

    const responses = ((attendance ?? []) as Array<{ user_id: number; response: 'yes' | 'no' | null }>).filter((a) => invited.has(a.user_id))
    const goingIds = responses.filter((r) => r.response === 'yes').map((r) => r.user_id)
    const yes = goingIds.length
    const no = responses.filter((r) => r.response === 'no').length

    const { data: goingUsers } = goingIds.length
      ? await supabase.from('users').select('id, first_name, last_name, profile_picture').in('id', goingIds.slice(0, 6))
      : { data: [] }

    type Organizer = { first_name: string | null; last_name: string | null }
    const org = eventMeta ? ((Array.isArray(eventMeta.users) ? eventMeta.users[0] : eventMeta.users) as Organizer | null) : null

    return NextResponse.json({
      event,
      reason: canRespond ? event.reason : null,
      started: eventHasStarted(found),
      canRespond,
      memberId: ctx.memberId,
      summary: { invited: invited.size, yes, no, pending: Math.max(invited.size - yes - no, 0) },
      going: ((goingUsers ?? []) as Array<{ id: number; first_name: string; last_name: string; profile_picture: string | null }>).map((u) => ({
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        avatar: publicUploadUrl(request, 'profiles', u.profile_picture),
      })),
      organizer: org ? `${org.first_name ?? ''} ${org.last_name ?? ''}`.trim() || null : null,
    })
  } catch (err) {
    console.error('Mobile event detail error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
