import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/server'
import { buildManagerNewMemberEmail } from '@/lib/email/templates'
import { getAppBaseUrl } from '@/lib/email/config'
import { sendTransactionalEmail } from '@/lib/email/send'

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
      },
    })
  } catch (err) {
    console.error('Invite accept GET error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, firstName, lastName, phone, password, passwordConfirm } = await request.json()

    const safeToken = String(token || '').trim()
    const safeFirst = String(firstName || '').trim()
    const safeLast = String(lastName || '').trim()
    const safePhone = String(phone || '').trim()
    const safePassword = String(password || '')
    const safeConfirm = String(passwordConfirm || '')

    if (!safeToken) {
      return NextResponse.json({ error: 'Neplatný odkaz pozvánky.' }, { status: 400 })
    }

    if (!safeFirst || !safeLast || !safePassword || !safeConfirm) {
      return NextResponse.json({ error: 'Vyplňte prosím všechna povinná pole.' }, { status: 400 })
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
      .ilike('email', invitation.email)
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
      void supabase.from('notifications').insert({
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
