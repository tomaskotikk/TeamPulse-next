import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { buildPasswordResetEmail } from '@/lib/email/templates'
import { getPasswordResetUrl } from '@/lib/email/config'
import { sendTransactionalEmail } from '@/lib/email/send'

const GENERIC_SUCCESS =
  'Pokud je e-mail registrován, byl na něj odeslán odkaz pro obnovení hesla.'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    const normalizedEmail = String(email || '').trim().toLowerCase()

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Zadejte prosím e-mailovou adresu.' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Zadejte prosím platný e-mail.' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data: user } = await supabase
      .from('users')
      .select('id, first_name, email')
      .ilike('email', normalizedEmail)
      .maybeSingle()

    if (!user) {
      return NextResponse.json({ success: true, message: GENERIC_SUCCESS })
    }

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    const { data: resetRecord, error: insertError } = await supabase
      .from('password_resets')
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt,
        used: false,
      })
      .select('id')
      .single()

    if (insertError || !resetRecord) {
      console.error('Password reset token insert error:', insertError)
      return NextResponse.json({ error: 'Nepodařilo se vytvořit reset token.' }, { status: 500 })
    }

    const resetUrl = getPasswordResetUrl(token)
    const emailContent = buildPasswordResetEmail({
      firstName: user.first_name || 'uživateli',
      resetUrl,
      expiresHours: 1,
    })

    try {
      await sendTransactionalEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      })
    } catch (mailError) {
      // Provider muze email dorucit i pri pozdni chybe na API vrstve. Pro stabilni UX
      // vracime generic success a token nechame platny.
      console.error('Password reset email dispatch warning:', mailError)
    }

    return NextResponse.json({ success: true, message: GENERIC_SUCCESS })
  } catch (err) {
    console.error('Password request reset error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
