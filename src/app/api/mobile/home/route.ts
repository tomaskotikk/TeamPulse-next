import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUpcomingEventsForMember, withMemberResponses } from '@/lib/attendance'
import { requireMobileContext } from '@/lib/mobile-api'

/** Home screen: next events (with own response) + latest club chat message. */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireMobileContext(request)
    if (ctx instanceof NextResponse) return ctx

    const upcoming = ctx.memberId
      ? await withMemberResponses(await getUpcomingEventsForMember(ctx.club, ctx.memberId, 5), ctx.memberId)
      : []

    const supabase = await createAdminClient()
    const { data: last } = await supabase
      .from('chat_messages')
      .select('id, message, created_at, users(first_name, last_name)')
      .eq('club_id', ctx.club.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    type Author = { first_name: string | null; last_name: string | null }
    const author = last ? (Array.isArray(last.users) ? last.users[0] : last.users) as Author | null : null

    return NextResponse.json({
      upcoming,
      pendingCount: upcoming.filter((e) => !e.response).length,
      lastMessage: last
        ? { id: last.id, message: last.message, created_at: last.created_at, author: author ? `${author.first_name ?? ''} ${author.last_name ?? ''}`.trim() : '' }
        : null,
    })
  } catch (err) {
    console.error('Mobile home error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
