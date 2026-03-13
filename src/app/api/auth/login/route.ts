import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/server'
import { attachSessionCookie } from '@/lib/auth/session'
import { generateTwoFactorCode, getTwoFactorExpiryIso, hashTwoFactorCode } from '@/lib/auth/two-factor'
import { buildTwoFactorCodeEmail } from '@/lib/email/templates'
import { sendTransactionalEmail } from '@/lib/email/send'

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Vyplňte e-mail i heslo.' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data: profile } = await supabase
      .from('users')
      .select('id, email, role, password_hash, two_factor_enabled, first_name')
      .eq('email', email)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Neplatný e-mail nebo heslo.' }, { status: 401 })
    }

    const normalizedHash = profile.password_hash.startsWith('$2y$')
      ? `$2b$${profile.password_hash.slice(4)}`
      : profile.password_hash

    const passwordOk = await bcrypt.compare(password, normalizedHash)

    if (!passwordOk) {
      return NextResponse.json({ error: 'Neplatný e-mail nebo heslo.' }, { status: 401 })
    }

    if (profile?.two_factor_enabled) {
      const expiresMinutes = 10
      const code = generateTwoFactorCode()
      const hashedCode = await hashTwoFactorCode(code)
      const expiresAt = getTwoFactorExpiryIso(expiresMinutes)

      await supabase
        .from('two_factor_codes')
        .update({ used: true })
        .eq('user_id', profile.id)
        .eq('used', false)

      const { data: twoFactorRecord, error: insertError } = await supabase
        .from('two_factor_codes')
        .insert({
          user_id: profile.id,
          code: hashedCode,
          expires_at: expiresAt,
          used: false,
        })
        .select('id')
        .single()

      if (insertError || !twoFactorRecord) {
        console.error('2FA insert error:', insertError)
        return NextResponse.json({ error: 'Nepodařilo se vytvořit 2FA kód.' }, { status: 500 })
      }

      const emailContent = buildTwoFactorCodeEmail({
        firstName: profile.first_name,
        code,
        expiresMinutes,
      })

      try {
        await sendTransactionalEmail({
          to: profile.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        })
      } catch (emailError) {
        await supabase
          .from('two_factor_codes')
          .update({ used: true })
          .eq('id', twoFactorRecord.id)

        console.error('2FA email error:', emailError)
        return NextResponse.json({ error: 'Nepodařilo se odeslat ověřovací kód na email.' }, { status: 502 })
      }

      return NextResponse.json({
        requires2FA: true,
        userId: profile.id,
      })
    }

    const response = NextResponse.json({ success: true })
    await attachSessionCookie(
      response,
      {
        userId: profile.id,
        email: profile.email,
        role: profile.role,
      },
      Boolean(rememberMe)
    )

    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
