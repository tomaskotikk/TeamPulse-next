import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { attachSessionCookie } from '@/lib/auth/session'
import {
  buildClubCreatedClubEmail,
  buildClubPendingApprovalOwnerEmail,
} from '@/lib/email/templates'
import { getAppBaseUrl } from '@/lib/email/config'
import { sendTransactionalEmail } from '@/lib/email/send'

type PendingRegistration = {
  id: number
  verification_token: string
  club_name: string
  sport: string
  city: string
  address: string
  ico: string
  dic: string
  website: string
  club_email: string
  club_phone: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  password_hash: string
  expires_at: string
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    const safeToken = String(token || '').trim()

    if (!safeToken) {
      return NextResponse.json({ error: 'Neplatný verifikační odkaz.' }, { status: 400 })
    }

    const supabase = await createAdminClient()
    const nowIso = new Date().toISOString()

    const { data: pendingRaw } = await supabase
      .from('pending_registrations')
      .select('*')
      .eq('verification_token', safeToken)
      .gt('expires_at', nowIso)
      .maybeSingle()

    const pending = pendingRaw as PendingRegistration | null

    if (!pending) {
      return NextResponse.json(
        { error: 'Verifikační odkaz je neplatný nebo vypršel.' },
        { status: 400 }
      )
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .ilike('email', pending.email)
      .maybeSingle()

    if (existingUser) {
      await supabase.from('pending_registrations').delete().eq('id', pending.id)
      return NextResponse.json({ error: 'Účet s tímto e-mailem už existuje.' }, { status: 409 })
    }

    const { data: createdUser, error: createUserError } = await supabase
      .from('users')
      .insert({
        first_name: pending.first_name,
        last_name: pending.last_name,
        email: pending.email,
        phone: pending.phone,
        role: 'manažer',
        organization: pending.club_name,
        password_hash: pending.password_hash,
      })
      .select('id, email, role')
      .single()

    if (createUserError || !createdUser) {
      console.error('Verify email create user error:', createUserError)
      return NextResponse.json({ error: 'Nepodařilo se vytvořit uživatele.' }, { status: 500 })
    }

    const { data: createdClub, error: createClubError } = await supabase
      .from('clubs')
      .insert({
        owner_user_id: createdUser.id,
        approved: false,
        name: pending.club_name,
        sport: pending.sport,
        city: pending.city,
        address: pending.address,
        ico: pending.ico,
        dic: pending.dic,
        website: pending.website,
        club_email: pending.club_email,
        club_phone: pending.club_phone,
      })
      .select('id')
      .single()

    if (createClubError || !createdClub) {
      console.error('Verify email create club error:', createClubError)
      return NextResponse.json({ error: 'Nepodařilo se vytvořit klub.' }, { status: 500 })
    }

    await supabase.from('pending_registrations').delete().eq('id', pending.id)

    const loginUrl = `${getAppBaseUrl()}/login`

    try {
      const ownerMail = buildClubPendingApprovalOwnerEmail({
        fullName: `${pending.first_name} ${pending.last_name}`,
        clubName: pending.club_name,
        clubId: createdClub.id,
        sport: pending.sport,
        city: pending.city,
        loginUrl,
        email: pending.email,
      })

      await sendTransactionalEmail({
        to: pending.email,
        subject: ownerMail.subject,
        html: ownerMail.html,
        text: ownerMail.text,
      })

      if (pending.club_email && pending.club_email.toLowerCase() !== pending.email.toLowerCase()) {
        const clubMail = buildClubCreatedClubEmail({
          clubName: pending.club_name,
          managerName: `${pending.first_name} ${pending.last_name}`,
          managerEmail: pending.email,
          website: pending.website,
        })

        await sendTransactionalEmail({
          to: pending.club_email,
          subject: clubMail.subject,
          html: clubMail.html,
          text: clubMail.text,
        })
      }
    } catch (mailErr) {
      console.error('Verify email confirmation send error:', mailErr)
    }

    const response = NextResponse.json({ success: true })
    await attachSessionCookie(
      response,
      {
        userId: createdUser.id,
        email: createdUser.email,
        role: createdUser.role,
      },
      false
    )

    return response
  } catch (err) {
    console.error('Verify email route error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
