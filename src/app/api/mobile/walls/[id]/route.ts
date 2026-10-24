import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { EVENT_COLUMNS, canManageAttendance, withMemberResponses, type ClubEventRow } from '@/lib/attendance'
import { publicUploadUrl, requireMobileContext } from '@/lib/mobile-api'
import { getAccessibleCategory } from '@/lib/walls'

type Params = { params: Promise<{ id: string }> }

/** Category wall header data: category, members, upcoming category events. */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireMobileContext(request)
    if (ctx instanceof NextResponse) return ctx

    const categoryId = Number.parseInt((await params).id, 10)
    const category = Number.isInteger(categoryId) ? await getAccessibleCategory(ctx.user, ctx.club, ctx.memberId, categoryId) : null
    if (!category) return NextResponse.json({ error: 'Zeď nebyla nalezena.' }, { status: 404 })

    const supabase = await createAdminClient()
    const [{ data: memberRows }, { data: links }] = await Promise.all([
      supabase.from('category_members').select('user_id').eq('category_id', categoryId).eq('excluded', false),
      supabase.from('club_event_categories').select('event_id').eq('category_id', categoryId),
    ])

    const memberIds = (memberRows ?? []).map((m: { user_id: number }) => m.user_id)
    const eventIds = (links ?? []).map((l: { event_id: number }) => l.event_id)

    const [{ data: users }, { data: events }] = await Promise.all([
      memberIds.length
        ? supabase.from('users').select('id, first_name, last_name, role, profile_picture').in('id', memberIds)
        : Promise.resolve({ data: [] }),
      eventIds.length
        ? supabase
            .from('club_events')
            .select(EVENT_COLUMNS)
            .in('id', eventIds)
            .gte('starts_at', new Date().toISOString())
            .order('starts_at', { ascending: true })
            .limit(10)
        : Promise.resolve({ data: [] }),
    ])

    type U = { id: number; first_name: string; last_name: string; role: string; profile_picture: string | null }
    const members = ((users ?? []) as U[])
      .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'cs'))
      .map((u) => ({ id: u.id, first_name: u.first_name, last_name: u.last_name, role: u.role, avatar: publicUploadUrl(request, 'profiles', u.profile_picture) }))

    const staff = canManageAttendance(ctx.user)
    return NextResponse.json({
      category,
      staff,
      members,
      events: await withMemberResponses((events ?? []) as ClubEventRow[], ctx.memberId ?? -1),
    })
  } catch (err) {
    console.error('Mobile wall error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
