import { NextRequest, NextResponse } from 'next/server'
import { OPEN_STATUSES, toPublicApplication } from '@/lib/onboarding/applications'
import { resolveParent } from '@/lib/onboarding/activation'
import { requireManagerApplication } from '@/lib/onboarding/route-helpers'
import { isValidEmail } from '@/lib/onboarding/validation'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireManagerApplication((await params).id)
    if (ctx instanceof NextResponse) return ctx

    const parentCheck = ctx.app.parent_email
      ? await resolveParent(ctx.supabase, ctx.app.parent_email, ctx.club.name)
      : null

    return NextResponse.json({ application: toPublicApplication(ctx.app), parentCheck })
  } catch (err) {
    console.error('Application GET error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireManagerApplication((await params).id)
    if (ctx instanceof NextResponse) return ctx

    const { app, supabase } = ctx
    if (!app.parent_email) {
      return NextResponse.json({ error: 'Tato přihláška nemá rodiče.' }, { status: 400 })
    }
    if (!OPEN_STATUSES.includes(app.status)) {
      return NextResponse.json({ error: 'Přihláška už byla uzavřena.' }, { status: 409 })
    }

    const body = (await request.json().catch(() => ({}))) as { parentEmail?: unknown }
    const parentEmail = String(body.parentEmail ?? '').trim().toLowerCase()

    if (!isValidEmail(parentEmail)) {
      return NextResponse.json({ error: 'Neplatný e-mail rodiče.' }, { status: 400 })
    }
    if (parentEmail === app.email.toLowerCase()) {
      return NextResponse.json({ error: 'E-mail rodiče musí být jiný než e-mail hráče.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('player_applications')
      .update({ parent_email: parentEmail, updated_at: new Date().toISOString() })
      .eq('id', app.id)

    if (error) {
      console.error('Application PATCH error:', error)
      return NextResponse.json({ error: 'Nepodařilo se uložit e-mail.' }, { status: 500 })
    }

    // the old address must not be able to complete the registration any more
    await supabase.from('parent_invitations').update({ used: true }).eq('application_id', app.id).eq('used', false)

    const parentCheck = await resolveParent(supabase, parentEmail, ctx.club.name)
    return NextResponse.json({ success: true, parentEmail, parentCheck })
  } catch (err) {
    console.error('Application PATCH error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
