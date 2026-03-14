import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { buildRegistrationVerificationEmail } from '@/lib/email/templates'
import { getEmailVerificationUrl } from '@/lib/email/config'
import { sendTransactionalEmail } from '@/lib/email/send'

function normalizeWebsite(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const clubName = String(body.club_name || '').trim()
    const sport = String(body.sport || '').trim()
    const city = String(body.city || '').trim()
    const address = String(body.address || '').trim()
    const ico = String(body.ico || '').trim()
    const dic = String(body.dic || '').trim()
    const website = normalizeWebsite(String(body.website || ''))
    const clubEmail = String(body.club_email || '').trim().toLowerCase()
    const clubPhone = String(body.club_phone || '').trim()

    const firstName = String(body.first_name || '').trim()
    const lastName = String(body.last_name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const phone = String(body.phone || '').trim()
    const password = String(body.password || '')
    const passwordConfirm = String(body.password_confirm || '')
    const termsAccepted = Boolean(body.terms)

    if (!clubName || clubName.length < 2) {
      return NextResponse.json({ error: 'Zadejte prosím název klubu (min. 2 znaky).' }, { status: 400 })
    }
    if (!sport || !city || !address || !ico || !dic) {
      return NextResponse.json({ error: 'Vyplňte prosím všechny povinné údaje o klubu.' }, { status: 400 })
    }
    if (!clubEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clubEmail)) {
      return NextResponse.json({ error: 'Zadejte platný klubový e-mail.' }, { status: 400 })
    }
    if (!clubPhone) {
      return NextResponse.json({ error: 'Zadejte prosím klubový telefon.' }, { status: 400 })
    }
    if (!website || !/^https?:\/\//i.test(website)) {
      return NextResponse.json({ error: 'Zadejte prosím platný web (např. https://...).' }, { status: 400 })
    }

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'Vyplňte prosím jméno i příjmení správce.' }, { status: 400 })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Zadejte prosím platný e-mail správce.' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Heslo musí mít alespoň 6 znaků.' }, { status: 400 })
    }
    if (password !== passwordConfirm) {
      return NextResponse.json({ error: 'Hesla se neshodují.' }, { status: 400 })
    }
    if (!termsAccepted) {
      return NextResponse.json({ error: 'Musíte souhlasit se zpracováním osobních údajů.' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .ilike('email', email)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: 'Účet s tímto e-mailem už existuje.' }, { status: 409 })
    }

    const verificationToken = randomBytes(32).toString('hex')
    const passwordHash = await bcrypt.hash(password, 12)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { data: pendingRecord, error: pendingError } = await supabase
      .from('pending_registrations')
      .insert({
        verification_token: verificationToken,
        club_name: clubName,
        sport,
        city,
        address,
        ico,
        dic,
        website,
        club_email: clubEmail,
        club_phone: clubPhone,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        password_hash: passwordHash,
        expires_at: expiresAt,
      })
      .select('id')
      .single()

    if (pendingError || !pendingRecord) {
      console.error('Pending registration insert error:', pendingError)
      return NextResponse.json({ error: 'Nepodařilo se uložit registraci.' }, { status: 500 })
    }

    const verificationUrl = getEmailVerificationUrl(verificationToken)
    const emailContent = buildRegistrationVerificationEmail({
      fullName: `${firstName} ${lastName}`,
      clubName,
      verificationUrl,
      expiresHours: 24,
    })

    try {
      await sendTransactionalEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      })
    } catch (mailErr) {
      await supabase.from('pending_registrations').delete().eq('id', pendingRecord.id)
      console.error('Registration verification email error:', mailErr)
      return NextResponse.json({ error: 'Nepodařilo se odeslat ověřovací e-mail.' }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      message:
        'Registrace byla odeslána. Na e-mail jsme poslali ověřovací odkaz. Po jeho potvrzení bude klub aktivní.',
    })
  } catch (err) {
    console.error('Club register error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
