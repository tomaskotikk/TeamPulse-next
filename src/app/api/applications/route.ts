import { NextRequest, NextResponse } from 'next/server'
import { countPendingForClub, listApplicationsForClub } from '@/lib/onboarding/applications'
import { requireManager } from '@/lib/onboarding/route-helpers'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireManager()
    if (ctx instanceof NextResponse) {
      // the sidebar polls the count for every role; non-managers simply have none
      if (request.nextUrl.searchParams.get('count')) return NextResponse.json({ count: 0 })
      return ctx
    }

    if (request.nextUrl.searchParams.get('count')) {
      return NextResponse.json({ count: await countPendingForClub(ctx.supabase, ctx.club.id) })
    }

    return NextResponse.json({ applications: await listApplicationsForClub(ctx.supabase, ctx.club.id) })
  } catch (err) {
    console.error('Applications GET error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
