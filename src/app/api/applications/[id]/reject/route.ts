import { NextRequest, NextResponse } from 'next/server'
import { buildPlayerApplicationRejectedEmail } from '@/lib/email/templates'
import { OPEN_STATUSES } from '@/lib/onboarding/applications'
import { requireManagerApplication, sendEmailQuietly } from '@/lib/onboarding/route-helpers'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireManagerApplication((await params).id)
    if (ctx instanceof NextResponse) return ctx

    const { app, club, supabase, user } = ctx
    if (!OPEN_STATUSES.includes(app.status)) {
      return NextResponse.json({ error: 'Přihláška už byla zpracována.' }, { status: 409 })
    }

    const body = (await request.json().catch(() => ({}))) as { reason?: unknown }
    const reason = String(body.reason ?? '').trim().slice(0, 500) || null
    const now = new Date().toISOString()

    const { data: updated } = await supabase
      .from('player_applications')
      .update({ status: 'rejected', rejection_reason: reason, reviewed_by: user.id, reviewed_at: now, updated_at: now })
      .eq('id', app.id)
      .in('status', OPEN_STATUSES)
      .select('id')
      .maybeSingle()

    if (!updated) {
      return NextResponse.json({ error: 'Přihláška už byla zpracována.' }, { status: 409 })
    }

    await supabase.from('parent_invitations').update({ used: true }).eq('application_id', app.id).eq('used', false)

    await sendEmailQuietly(
      app.email,
      buildPlayerApplicationRejectedEmail({ firstName: app.first_name, clubName: club.name, reason }),
      'Application rejected',
    )

    return NextResponse.json({ success: true, status: 'rejected' })
  } catch (err) {
    console.error('Application reject error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
