import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAppUser } from '@/lib/app-context'
import { createAdminClient } from '@/lib/supabase/server'
import { canRespondFor, eventHasStarted, getEventForUser, getInviteeIdsForEvents } from '@/lib/attendance'

type Params = { params: Promise<{ id: string }> }

/** Player (or their parent) answers "yes" / "no" / clears the answer. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Nejste přihlášen.' }, { status: 401 })

    const eventId = Number.parseInt((await params).id, 10)
    if (!Number.isInteger(eventId)) return NextResponse.json({ error: 'Neplatná událost.' }, { status: 400 })

    const body = (await request.json().catch(() => ({}))) as { response?: unknown; reason?: unknown; userId?: unknown }
    const response = body.response === 'yes' || body.response === 'no' ? body.response : null
    const reason = response === 'no' ? String(body.reason ?? '').trim().slice(0, 300) || null : null
    const targetUserId = body.userId ? Number(body.userId) : user.id

    if (!Number.isInteger(targetUserId) || !(await canRespondFor(user, targetUserId))) {
      return NextResponse.json({ error: 'Za tohoto člena nemůžete odpovídat.' }, { status: 403 })
    }

    const supabase = await createAdminClient()
    // a parent's own club is the child's club, so the club scope check still applies
    const found = await getEventForUser(supabase, user, eventId)
    if (!found) return NextResponse.json({ error: 'Událost nebyla nalezena.' }, { status: 404 })

    if (eventHasStarted(found.event)) {
      return NextResponse.json({ error: 'Událost už začala, odpověď nelze změnit.' }, { status: 409 })
    }

    const invited = (await getInviteeIdsForEvents(supabase, found.club, [eventId])).get(eventId)
    if (!invited?.has(targetUserId)) {
      return NextResponse.json({ error: 'Člen není na tuto událost pozván.' }, { status: 403 })
    }

    const { error } = await supabase.from('event_attendance').upsert(
      {
        event_id: eventId,
        user_id: targetUserId,
        response,
        response_reason: reason,
        responded_by: user.id,
        responded_at: new Date().toISOString(),
      },
      { onConflict: 'event_id,user_id' },
    )

    if (error) {
      console.error('Event response error:', error)
      return NextResponse.json({ error: 'Odpověď se nepodařilo uložit.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, response, reason })
  } catch (err) {
    console.error('Event response error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
