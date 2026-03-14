import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword, confirmPassword } = await request.json()

    const safeToken = String(token || '').trim()
    const safePassword = String(newPassword || '')
    const safeConfirm = String(confirmPassword || '')

    if (!safeToken) {
      return NextResponse.json({ error: 'Neplatný odkaz pro obnovení hesla.' }, { status: 400 })
    }

    if (!safePassword || !safeConfirm) {
      return NextResponse.json({ error: 'Vyplňte prosím všechna pole.' }, { status: 400 })
    }

    if (safePassword !== safeConfirm) {
      return NextResponse.json({ error: 'Hesla se neshodují.' }, { status: 400 })
    }

    if (safePassword.length < 6) {
      return NextResponse.json({ error: 'Heslo musí mít alespoň 6 znaků.' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data: resetRecord } = await supabase
      .from('password_resets')
      .select('id, user_id, expires_at, used')
      .eq('token', safeToken)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (!resetRecord) {
      return NextResponse.json(
        { error: 'Tento odkaz pro obnovení hesla je neplatný nebo vypršel.' },
        { status: 400 }
      )
    }

    const { data: claimRecord } = await supabase
      .from('password_resets')
      .update({ used: true })
      .eq('id', resetRecord.id)
      .eq('used', false)
      .select('id')
      .maybeSingle()

    if (!claimRecord) {
      return NextResponse.json(
        { error: 'Tento odkaz pro obnovení hesla již byl použit.' },
        { status: 400 }
      )
    }

    const hash = await bcrypt.hash(safePassword, 12)

    const { error: updateUserError } = await supabase
      .from('users')
      .update({ password_hash: hash })
      .eq('id', resetRecord.user_id)

    if (updateUserError) {
      console.error('Password update error:', updateUserError)
      return NextResponse.json({ error: 'Nepodařilo se uložit nové heslo.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Password reset error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
