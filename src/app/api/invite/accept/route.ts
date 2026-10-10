import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/server'
import { buildManagerNewApplicationEmail, buildManagerNewMemberEmail } from '@/lib/email/templates'
import { getAppBaseUrl } from '@/lib/email/config'
import { fullResyncCategories } from '@/app/api/categories/route'
import { sendTransactionalEmail } from '@/lib/email/send'
import { escapeLike, findOpenApplicationByEmail } from '@/lib/onboarding/applications'
import { isMinor, parseApplication } from '@/lib/onboarding/validation'

function invitationExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() < Date.now()
}

async function getInvitationByToken(token: string) {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('team_invitations')
    .select('id, token, club_id, inviter_user_id, email, role, expires_at, used, clubs(name)')
    .eq('token', token)
    .maybeSingle()

  return data as
    | {
        id: number
        token: string
        club_id: number
        inviter_user_id: number
        email: string
        role: string
        expires_at: string
        used: boolean
        clubs: { name: string } | { name: string }[] | null
      }
    | null
}

function getClubName(invitation: Awaited<ReturnType<typeof getInvitationByToken>>) {
  if (!invitation?.clubs) return ''
  if (Array.isArray(invitation.clubs)) return invitation.clubs[0]?.name ?? ''
  return invitation.clubs.name
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')?.trim() || ''

    if (!token) {
      return NextResponse.json({ error: 'Neplatný odkaz pozvánky.' }, { status: 400 })
    }

    const invitation = await getInvitationByToken(token)

    if (!invitation) {
      return NextResponse.json({ error: 'Pozvánka nebyla nalezena.' }, { status: 404 })
    }

    if (invitation.used) {
      return NextResponse.json({ error: 'Tato pozvánka již byla použita.' }, { status: 409 })
    }

    if (invitationExpired(invitation.expires_at)) {
      return NextResponse.json({ error: 'Tato pozvánka vypršela.' }, { status: 410 })
    }

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        club_name: getClubName(invitation),
        expires_at: invitation.expires_at,
        requires_application: invitation.role === 'hráč',
      },
    })
  } catch (err) {
    console.error('Invite accept GET error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const safeToken = String(body.token || '').trim()

    if (!safeToken) {
      return NextResponse.json({ error: 'Neplatný odkaz pozvánky.' }, { status: 400 })
    }

    const invitation = await getInvitationByToken(safeToken)

    if (invitation?.role === 'hráč') {
      return submitPlayerApplication(invitation, body)
    }

    return acceptInvite(body)
  } catch (err) {
    console.error('Invite accept POST error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

type Invitation = NonNullable<Awaited<ReturnType<typeof getInvitationByToken>>>

async function getClubManager(clubId: number) {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('clubs')
    .select('owner_user_id, users!clubs_owner_user_id_fkey(first_name, email)')
    .eq('id', clubId)
    .maybeSingle()

  const row = data as
    | {
        owner_user_id: number
        users:
          | { first_name: string | null; email: string | null }
          | { first_name: string | null; email: string | null }[]
          | null
      }
    | null

  if (!row) return null
  const managerUser = Array.isArray(row.users) ? row.users[0] : row.users
  return { userId: row.owner_user_id, firstName: managerUser?.first_name ?? null, email: managerUser?.email ?? null }
}

async function submitPlayerApplication(invitation: Invitation, body: Record<string, unknown>) {
  if (invitation.used) {
    return NextResponse.json({ error: 'Tato pozvánka již byla použita.' }, { status: 409 })
  }

  if (invitationExpired(invitation.expires_at)) {
    return NextResponse.json({ error: 'Tato pozvánka vypršela. Kontaktujte prosím manažera klubu.' }, { status: 410 })
  }

  const parsed = parseApplication(body, invitation.email)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  const data = parsed.data

  const supabase = await createAdminClient()

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .ilike('email', escapeLike(invitation.email))
    .maybeSingle()

  if (existingUser) {
    return NextResponse.json({ error: 'Účet s tímto e-mailem už existuje.' }, { status: 409 })
  }

  if (await findOpenApplicationByEmail(supabase, invitation.email)) {
    return NextResponse.json({ error: 'Přihláška s tímto e-mailem už čeká na schválení.' }, { status: 409 })
  }

  const { data: claimRecord } = await supabase
    .from('team_invitations')
    .update({ used: true })
    .eq('id', invitation.id)
    .eq('used', false)
    .select('id')
    .maybeSingle()

  if (!claimRecord) {
    return NextResponse.json({ error: 'Tato pozvánka již byla použita.' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(data.password, 12)

  const { data: application, error: insertError } = await supabase
    .from('player_applications')
    .insert({
      club_id: invitation.club_id,
      invitation_id: invitation.id,
      email: invitation.email.toLowerCase(),
      password_hash: passwordHash,
      first_name: data.firstName,
      last_name: data.lastName,
      date_birth: data.dateBirth,
      phone: data.phone,
      street: data.street,
      city: data.city,
      zip: data.zip,
      health_insurance: data.healthInsurance,
      health_notes: data.healthNotes,
      emergency_name: data.emergencyName,
      emergency_phone: data.emergencyPhone,
      parent_first_name: data.parentFirstName,
      parent_last_name: data.parentLastName,
      parent_email: data.parentEmail,
      parent_phone: data.parentPhone,
      consent_gdpr: data.consentGdpr,
      consent_photos: data.consentPhotos,
      status: 'pending_manager',
    })
    .select('id')
    .single()

  if (insertError || !application) {
    await supabase.from('team_invitations').update({ used: false }).eq('id', invitation.id)
    console.error('Application insert error:', insertError)
    return NextResponse.json({ error: 'Nepodařilo se uložit přihlášku.' }, { status: 500 })
  }

  const playerName = `${data.firstName} ${data.lastName}`
  const minor = isMinor(data.dateBirth)
  const manager = await getClubManager(invitation.club_id)

  if (manager) {
    await supabase.from('notifications').insert({
      user_id: manager.userId,
      club_id: invitation.club_id,
      type: 'player_application',
      title: `Nová přihláška: ${playerName}`,
      body: minor ? 'Nezletilý hráč · zkontrolujte e-mail rodiče' : 'Čeká na schválení',
    })

    if (manager.email) {
      try {
        const emailContent = buildManagerNewApplicationEmail({
          managerFirstName: manager.firstName || 'manažere',
          clubName: getClubName(invitation),
          playerName,
          isMinor: minor,
          applicationUrl: `${getAppBaseUrl()}/applications/${application.id}`,
        })
        await sendTransactionalEmail({ to: manager.email, ...emailContent })
      } catch (mailErr) {
        console.error('Manager new application email error:', mailErr)
      }
    }
  }

  return NextResponse.json({ success: true, pending: true, minor })
}

async function acceptInvite(body: Record<string, unknown>) {
  try {
    const { token, firstName, lastName, phone, dateBirth, password, passwordConfirm } = body

    const safeToken = String(token || '').trim()
    const safeFirst = String(firstName || '').trim()
    const safeLast = String(lastName || '').trim()
    const safePhone = String(phone || '').trim()
    const safeDateBirth = String(dateBirth || '').trim()
    const safePassword = String(password || '')
    const safeConfirm = String(passwordConfirm || '')

    if (!safeToken) {
      return NextResponse.json({ error: 'Neplatný odkaz pozvánky.' }, { status: 400 })
    }

    if (!safeFirst || !safeLast || !safeDateBirth || !safePassword || !safeConfirm) {
      return NextResponse.json({ error: 'Vyplňte prosím všechna povinná pole.' }, { status: 400 })
    }

    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
    if (!DATE_RE.test(safeDateBirth) || new Date(safeDateBirth) >= new Date()) {
      return NextResponse.json({ error: 'Neplatné datum narození.' }, { status: 400 })
    }

    if (safePassword !== safeConfirm) {
      return NextResponse.json({ error: 'Hesla se neshodují.' }, { status: 400 })
    }

    if (safePassword.length < 6) {
      return NextResponse.json({ error: 'Heslo musí mít alespoň 6 znaků.' }, { status: 400 })
    }

    const invitation = await getInvitationByToken(safeToken)

    if (!invitation) {
      return NextResponse.json({ error: 'Pozvánka nebyla nalezena.' }, { status: 404 })
    }

    if (invitation.used) {
      return NextResponse.json({ error: 'Tato pozvánka již byla použita.' }, { status: 409 })
    }

    if (invitationExpired(invitation.expires_at)) {
      return NextResponse.json({ error: 'Tato pozvánka vypršela.' }, { status: 410 })
    }

    const clubName = getClubName(invitation)
    const supabase = await createAdminClient()

    const { data: claimRecord } = await supabase
      .from('team_invitations')
      .update({ used: true })
      .eq('id', invitation.id)
      .eq('used', false)
      .select('id')
      .maybeSingle()

    if (!claimRecord) {
      return NextResponse.json({ error: 'Tato pozvánka již byla použita.' }, { status: 409 })
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .ilike('email', invitation.email.toLowerCase())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Účet s tímto e-mailem už existuje.' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(safePassword, 12)

    const { data: createdUser, error: createUserError } = await supabase
      .from('users')
      .insert({
        first_name: safeFirst,
        last_name: safeLast,
        email: invitation.email,
        phone: safePhone || null,
        dateBirth: safeDateBirth,
        password_hash: passwordHash,
        role: invitation.role,
        organization: clubName,
      })
      .select('id')
      .single()

    if (createUserError || !createdUser) {
      console.error('Invite accept user create error:', createUserError)
      return NextResponse.json({ error: 'Nepodařilo se vytvořit účet.' }, { status: 500 })
    }

    // Auto-assign new member — full resync ensures exactly one category per member
    await fullResyncCategories(supabase, invitation.club_id, clubName)

    const { data: managerData } = await supabase
      .from('clubs')
      .select('owner_user_id, users!clubs_owner_user_id_fkey(first_name, email)')
      .eq('id', invitation.club_id)
      .maybeSingle()

    const manager = managerData as
      | {
          owner_user_id: number
          users:
            | { first_name: string | null; email: string | null }
            | { first_name: string | null; email: string | null }[]
            | null
        }
      | null

    if (manager?.users) {
      const managerUser = Array.isArray(manager.users) ? manager.users[0] : manager.users
      if (managerUser?.email) {
        try {
          const emailContent = buildManagerNewMemberEmail({
            managerFirstName: managerUser.first_name || 'manažere',
            clubName,
            memberName: `${safeFirst} ${safeLast}`,
            memberEmail: invitation.email,
            memberPhone: safePhone || null,
            role: invitation.role,
            membersUrl: `${getAppBaseUrl()}/members`,
          })

          await sendTransactionalEmail({
            to: managerUser.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          })
        } catch (mailErr) {
          console.error('Manager new member email error:', mailErr)
        }
      }
    }

    // Notify manager via in-app notification too (fire-and-forget)
    if (manager?.owner_user_id) {
      await supabase.from('notifications').insert({
        user_id: manager.owner_user_id,
        club_id: invitation.club_id,
        type: 'member_joined',
        title: `${safeFirst} ${safeLast} se přidal(a) do klubu`,
        body: `${invitation.role} · ${invitation.email}`,
        actor_id: createdUser.id,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Invite accept POST error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
