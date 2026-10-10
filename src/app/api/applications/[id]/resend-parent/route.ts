import { NextRequest, NextResponse } from 'next/server'
import { getParentRegisterUrl } from '@/lib/email/config'
import { buildParentRegistrationEmail } from '@/lib/email/templates'
import { sendTransactionalEmail } from '@/lib/email/send'
import { PARENT_INVITATION_DAYS, createParentInvitation, resolveParent } from '@/lib/onboarding/activation'
import { requireManagerApplication } from '@/lib/onboarding/route-helpers'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireManagerApplication((await params).id)
    if (ctx instanceof NextResponse) return ctx

    const { app, club, supabase } = ctx
    if (app.status !== 'pending_parent' || !app.parent_email) {
      return NextResponse.json({ error: 'Přihláška nečeká na registraci rodiče.' }, { status: 409 })
    }

    const parent = await resolveParent(supabase, app.parent_email, club.name)
    if (parent.kind === 'conflict') {
      return NextResponse.json({ error: parent.reason }, { status: 409 })
    }

    // An existing parent also completes activation through the link (they just confirm it).
    const invitation = await createParentInvitation(supabase, app.id, app.parent_email)

    try {
      await sendTransactionalEmail({
        to: app.parent_email,
        ...buildParentRegistrationEmail({
          parentFirstName: app.parent_first_name || '',
          childName: `${app.first_name} ${app.last_name}`,
          clubName: club.name,
          registerUrl: getParentRegisterUrl(invitation.token),
          expiresDays: PARENT_INVITATION_DAYS,
        }),
      })
    } catch (mailErr) {
      console.error('Parent registration resend error:', mailErr)
      return NextResponse.json({ error: 'Nepodařilo se odeslat e-mail rodiči.' }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Parent resend error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
