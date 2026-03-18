import { NextRequest, NextResponse } from 'next/server'
import { getClubForUser, getCurrentAppUser } from '@/lib/app-context'
import { createAdminClient } from '@/lib/supabase/server'
import { buildClubInviteEmail } from '@/lib/email/templates'
import { getInviteAcceptUrl } from '@/lib/email/config'
import { sendTransactionalEmail } from '@/lib/email/send'

const ALLOWED_ROLES = new Set(['hráč', 'trenér', 'rodič'])

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()

    if (!user) {
      return NextResponse.json({ error: 'Nejste přihlášen.' }, { status: 401 })
    }

    if (user.role !== 'manažer') {
      return NextResponse.json({ error: 'Pozvánky může posílat pouze manažer.' }, { status: 403 })
    }

    const club = await getClubForUser(user)

    if (!club || club.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'K vašemu účtu se nepodařilo najít spravovaný klub.' }, { status: 400 })
    }

    if (!club.approved) {
      return NextResponse.json({ error: 'Klub zatím čeká na schválení administrátorem.' }, { status: 403 })
    }

    const body = await request.json()
    const email = String(body.email || '').trim().toLowerCase()
    const role = String(body.role || '').trim()

    if (!email || !role) {
      return NextResponse.json({ error: 'Vyplňte prosím e-mail i roli.' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Neplatný formát e-mailu.' }, { status: 400 })
    }

    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: 'Neplatná role.' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .ilike('email', email)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: 'Tento e-mail už je registrovaný v systému.' }, { status: 409 })
    }

    const nowIso = new Date().toISOString()

    const { data: existingInvitation } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('email', email)
      .eq('club_id', club.id)
      .eq('used', false)
      .gt('expires_at', nowIso)
      .limit(1)
      .maybeSingle()

    if (existingInvitation) {
      return NextResponse.json({ error: 'Pro tento e-mail už existuje aktivní pozvánka.' }, { status: 409 })
    }

    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    const { data: invitation, error: insertError } = await supabase
      .from('team_invitations')
      .insert({
        token,
        club_id: club.id,
        inviter_user_id: user.id,
        email,
        role,
        expires_at: expiresAt,
        used: false,
      })
      .select('id')
      .single()

    if (insertError || !invitation) {
      console.error('Invite insert error:', insertError)
      return NextResponse.json({ error: 'Nepodařilo se uložit pozvánku.' }, { status: 500 })
    }

    const inviteUrl = getInviteAcceptUrl(token)
    const inviterName = `${user.first_name} ${user.last_name}`.trim()
    const emailContent = buildClubInviteEmail({
      clubName: club.name,
      inviterName,
      role,
      inviteUrl,
      expiresHours: 1,
    })

    try {
      await sendTransactionalEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      })
    } catch (emailError) {
      await supabase.from('team_invitations').delete().eq('id', invitation.id)
      console.error('Invite email error:', emailError)
      return NextResponse.json({ error: 'Nepodařilo se odeslat e-mail. Zkuste to prosím znovu.' }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      message: `Pozvánka byla odeslána na ${email}.`,
    })
  } catch (err) {
    console.error('Invite send error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
