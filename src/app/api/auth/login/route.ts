import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/server'
import { attachSessionCookie, signMobileToken } from '@/lib/auth/session'
import { clearRememberedDeviceCookie, createRememberedDevice } from '@/lib/auth/device-tokens'
import { generateTwoFactorCode, getTwoFactorExpiryIso, hashTwoFactorCode } from '@/lib/auth/two-factor'
import { buildTwoFactorCodeEmail } from '@/lib/email/templates'
import { EmailSendError, sendTransactionalEmail } from '@/lib/email/send'
import { findLatestApplicationByEmail } from '@/lib/onboarding/applications'

const APPLICATION_STATUS_MESSAGES: Record<string, string> = {
  pending_manager: 'Váš účet čeká na schválení klubem.',
  pending_parent: 'Váš účet čeká na registraci rodiče. Rodiči přišel e-mail s odkazem.',
  rejected: 'Vaše přihláška do klubu nebyla schválena. Kontaktujte prosím vedení klubu.',
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe, client } = await request.json()
    const isMobile = client === 'mobile'
    const safeEmail = String(email || '').trim().toLowerCase()

    if (!safeEmail || !password) {
      return NextResponse.json({ error: 'Vyplňte e-mail i heslo.' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data: profile } = await supabase
      .from('users')
      .select('id, email, role, banned, ban_reason, password_hash, two_factor_enabled, first_name')
      .ilike('email', safeEmail)
      .single()

    if (!profile) {
      const application = await findLatestApplicationByEmail(supabase, safeEmail)
      const statusMessage = application ? APPLICATION_STATUS_MESSAGES[application.status] : undefined
      // only reveal the application state to someone who knows its password
      if (statusMessage && application && await bcrypt.compare(String(password), application.password_hash)) {
        return NextResponse.json({ error: statusMessage }, { status: 403 })
      }
      return NextResponse.json({ error: 'Neplatný e-mail nebo heslo.' }, { status: 401 })
    }

    const normalizedHash = profile.password_hash.startsWith('$2y$')
      ? `$2b$${profile.password_hash.slice(4)}`
      : profile.password_hash

    const passwordOk = await bcrypt.compare(password, normalizedHash)

    if (!passwordOk) {
      return NextResponse.json({ error: 'Neplatný e-mail nebo heslo.' }, { status: 401 })
    }

    if (profile.banned) {
      return NextResponse.json(
        {
          error: profile.ban_reason
            ? `Účet byl zablokován. Důvod: ${profile.ban_reason}`
            : 'Účet byl zablokován administrátorem.',
        },
        { status: 403 }
      )
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

        const fromAddress = process.env.EMAIL_FROM || 'TeamPulse <onboarding@resend.dev>'

        const debugDetails = emailError instanceof EmailSendError
          ? emailError.details
          : emailError instanceof Error
            ? emailError.message
            : String(emailError)

        console.error('2FA email error:', {
          message: emailError instanceof Error ? emailError.message : String(emailError),
          details: debugDetails,
          envHint: {
            hasResendKey: Boolean(process.env.RESEND_API_KEY),
            emailFrom: fromAddress,
          },
        })

        return NextResponse.json(
          {
            error: 'Nepodařilo se odeslat ověřovací kód na email.',
            debug: debugDetails,
          },
          { status: 502 }
        )
      }

      return NextResponse.json({
        requires2FA: true,
        userId: profile.id,
      })
    }

    if (isMobile) {
      const token = await signMobileToken({ userId: profile.id, email: profile.email, role: profile.role })
      return NextResponse.json({ success: true, token })
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

    if (rememberMe) {
      await createRememberedDevice(response, profile.id, request)
    } else {
      clearRememberedDeviceCookie(response)
    }

    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
