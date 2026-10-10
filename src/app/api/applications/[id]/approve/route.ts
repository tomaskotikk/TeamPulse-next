import { NextRequest, NextResponse } from 'next/server'
import { getAppBaseUrl, getParentRegisterUrl } from '@/lib/email/config'
import {
  buildParentChildLinkedEmail,
  buildParentRegistrationEmail,
  buildPlayerApprovedEmail,
} from '@/lib/email/templates'
import { sendTransactionalEmail } from '@/lib/email/send'
import {
  ActivationError,
  PARENT_INVITATION_DAYS,
  activateApplication,
  createParentInvitation,
  resolveParent,
} from '@/lib/onboarding/activation'
import { requireManagerApplication, sendEmailQuietly } from '@/lib/onboarding/route-helpers'
import { isMinor } from '@/lib/onboarding/validation'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireManagerApplication((await params).id)
    if (ctx instanceof NextResponse) return ctx

    const { app, club, supabase, user } = ctx

    if (app.status !== 'pending_manager') {
      return NextResponse.json({ error: 'Přihláška už byla zpracována.' }, { status: 409 })
    }

    const reviewed = { reviewed_by: user.id, reviewed_at: new Date().toISOString() }
    const loginUrl = `${getAppBaseUrl()}/login`
    const childName = `${app.first_name} ${app.last_name}`
    // age is evaluated at the moment the application was submitted
    const parentEmail = isMinor(app.date_birth, new Date(app.created_at)) ? app.parent_email : null

    if (!parentEmail) {
      await activateApplication(supabase, app, club.name, 'pending_manager', { kind: 'none' })
      await supabase.from('player_applications').update(reviewed).eq('id', app.id)
      await sendEmailQuietly(
        app.email,
        buildPlayerApprovedEmail({ firstName: app.first_name, clubName: club.name, loginUrl }),
        'Player approved',
      )
      return NextResponse.json({ success: true, status: 'completed' })
    }

    const parent = await resolveParent(supabase, parentEmail, club.name)

    if (parent.kind === 'conflict') {
      return NextResponse.json({ error: parent.reason }, { status: 409 })
    }

    if (parent.kind === 'existing') {
      await activateApplication(supabase, app, club.name, 'pending_manager', { kind: 'existing', userId: parent.userId })
      await supabase.from('player_applications').update(reviewed).eq('id', app.id)
      await sendEmailQuietly(
        app.email,
        buildPlayerApprovedEmail({ firstName: app.first_name, clubName: club.name, loginUrl }),
        'Player approved',
      )
      await sendEmailQuietly(
        parent.email,
        buildParentChildLinkedEmail({ parentFirstName: parent.firstName, childName, clubName: club.name, loginUrl }),
        'Parent child linked',
      )
      return NextResponse.json({ success: true, status: 'completed', linkedExistingParent: true })
    }

    // New parent: claim the transition first so concurrent approvals cannot send two links.
    const { data: moved } = await supabase
      .from('player_applications')
      .update({ ...reviewed, status: 'pending_parent', updated_at: new Date().toISOString() })
      .eq('id', app.id)
      .eq('status', 'pending_manager')
      .select('id')
      .maybeSingle()

    if (!moved) {
      return NextResponse.json({ error: 'Přihláška už byla zpracována.' }, { status: 409 })
    }

    const revertToManager = () =>
      supabase
        .from('player_applications')
        .update({ status: 'pending_manager', reviewed_by: null, reviewed_at: null })
        .eq('id', app.id)

    let invitation: { id: number; token: string }
    try {
      invitation = await createParentInvitation(supabase, app.id, parentEmail)
    } catch (inviteErr) {
      await revertToManager()
      throw inviteErr
    }

    try {
      await sendTransactionalEmail({
        to: parentEmail,
        ...buildParentRegistrationEmail({
          parentFirstName: app.parent_first_name || '',
          childName,
          clubName: club.name,
          registerUrl: getParentRegisterUrl(invitation.token),
          expiresDays: PARENT_INVITATION_DAYS,
        }),
      })
    } catch (mailErr) {
      console.error('Parent registration email error:', mailErr)
      await supabase.from('parent_invitations').delete().eq('id', invitation.id)
      await revertToManager()
      return NextResponse.json(
        { error: 'Nepodařilo se odeslat e-mail rodiči. Zkontrolujte adresu a zkuste to znovu.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true, status: 'pending_parent' })
  } catch (err) {
    if (err instanceof ActivationError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Application approve error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
