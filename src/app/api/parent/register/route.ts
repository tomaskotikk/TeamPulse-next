import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/server'
import { getAppBaseUrl } from '@/lib/email/config'
import { buildPlayerApprovedEmail, buildParentChildLinkedEmail } from '@/lib/email/templates'
import type { AdminClient, PlayerApplication } from '@/lib/onboarding/applications'
import { ActivationError, activateApplication, resolveParent } from '@/lib/onboarding/activation'
import { sendEmailQuietly } from '@/lib/onboarding/route-helpers'
import { isValidPhone, validatePassword } from '@/lib/onboarding/validation'

type InvitationWithApplication = {
  invitation: { id: number; email: string; expires_at: string; used: boolean }
  app: PlayerApplication
  club: { id: number; name: string; owner_user_id: number }
}

async function loadInvitation(supabase: AdminClient, token: string): Promise<InvitationWithApplication | NextResponse> {
  const { data: invitation } = await supabase
    .from('parent_invitations')
    .select('id, email, expires_at, used, application_id')
    .eq('token', token)
    .maybeSingle()

  if (!invitation) return NextResponse.json({ error: 'Odkaz pro registraci nebyl nalezen.' }, { status: 404 })
  if (invitation.used) return NextResponse.json({ error: 'Tento odkaz už byl použit.' }, { status: 409 })
  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Platnost odkazu vypršela. Požádejte manažera klubu o nový.' }, { status: 410 })
  }

  const { data: app } = await supabase
    .from('player_applications')
    .select('*')
    .eq('id', invitation.application_id)
    .maybeSingle()

  if (!app || app.status !== 'pending_parent') {
    return NextResponse.json({ error: 'Přihláška už nečeká na registraci rodiče.' }, { status: 409 })
  }

  const { data: club } = await supabase
    .from('clubs')
    .select('id, name, owner_user_id')
    .eq('id', app.club_id)
    .maybeSingle()

  if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })

  return { invitation, app: app as PlayerApplication, club }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')?.trim() || ''
    if (!token) return NextResponse.json({ error: 'Neplatný odkaz.' }, { status: 400 })

    const supabase = await createAdminClient()
    const loaded = await loadInvitation(supabase, token)
    if (loaded instanceof NextResponse) return loaded

    const { app, club, invitation } = loaded
    const parent = await resolveParent(supabase, invitation.email, club.name)

    return NextResponse.json({
      registration: {
        parent_first_name: app.parent_first_name,
        parent_last_name: app.parent_last_name,
        parent_email: invitation.email,
        parent_phone: app.parent_phone,
        child_name: `${app.first_name} ${app.last_name}`,
        club_name: club.name,
        parent_exists: parent.kind === 'existing',
        conflict: parent.kind === 'conflict' ? parent.reason : null,
      },
    })
  } catch (err) {
    console.error('Parent register GET error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const token = String(body.token ?? '').trim()
    if (!token) return NextResponse.json({ error: 'Neplatný odkaz.' }, { status: 400 })

    const supabase = await createAdminClient()
    const loaded = await loadInvitation(supabase, token)
    if (loaded instanceof NextResponse) return loaded

    const { app, club, invitation } = loaded
    const parent = await resolveParent(supabase, invitation.email, club.name)

    if (parent.kind === 'conflict') {
      return NextResponse.json({ error: parent.reason }, { status: 409 })
    }

    let passwordHash: string | null = null
    let phone = ''

    if (parent.kind === 'new') {
      phone = String(body.phone ?? '').trim()
      const passwordError = validatePassword(String(body.password ?? ''), String(body.passwordConfirm ?? ''))
      if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })
      if (!isValidPhone(phone)) return NextResponse.json({ error: 'Neplatný formát telefonu.' }, { status: 400 })
      passwordHash = await bcrypt.hash(String(body.password), 12)
    }

    const { data: claimed } = await supabase
      .from('parent_invitations')
      .update({ used: true })
      .eq('id', invitation.id)
      .eq('used', false)
      .select('id')
      .maybeSingle()

    if (!claimed) return NextResponse.json({ error: 'Tento odkaz už byl použit.' }, { status: 409 })

    // the link was sent to this address, so it is the verified parent e-mail
    const appForActivation = { ...app, parent_email: invitation.email }

    try {
      await activateApplication(
        supabase,
        appForActivation,
        club.name,
        'pending_parent',
        parent.kind === 'existing'
          ? { kind: 'existing', userId: parent.userId }
          : { kind: 'new', phone, passwordHash: passwordHash! },
      )
    } catch (activationErr) {
      await supabase.from('parent_invitations').update({ used: false }).eq('id', invitation.id)
      throw activationErr
    }

    const loginUrl = `${getAppBaseUrl()}/login`
    const childName = `${app.first_name} ${app.last_name}`

    await sendEmailQuietly(
      app.email,
      buildPlayerApprovedEmail({ firstName: app.first_name, clubName: club.name, loginUrl }),
      'Player approved',
    )
    await sendEmailQuietly(
      invitation.email,
      buildParentChildLinkedEmail({
        parentFirstName: app.parent_first_name || '',
        childName,
        clubName: club.name,
        loginUrl,
      }),
      'Parent child linked',
    )

    await supabase.from('notifications').insert({
      user_id: club.owner_user_id,
      club_id: club.id,
      type: 'member_joined',
      title: `${childName} je aktivní člen`,
      body: `Rodič ${app.parent_first_name ?? ''} ${app.parent_last_name ?? ''} dokončil registraci`.trim(),
    })

    return NextResponse.json({ success: true, linkedExistingParent: parent.kind === 'existing' })
  } catch (err) {
    if (err instanceof ActivationError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Parent register POST error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
