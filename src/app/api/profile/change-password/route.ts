import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentAppUser } from '@/lib/app-context'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })

    const { currentPassword, newPassword, confirmPassword } = await request.json()

    const safeCurrent = String(currentPassword || '')
    const safeNew = String(newPassword || '')
    const safeConfirm = String(confirmPassword || '')

    if (!safeCurrent || !safeNew || !safeConfirm) {
      return NextResponse.json({ error: 'Vyplňte prosím všechna pole.' }, { status: 400 })
    }

    if (safeNew.length < 6) {
      return NextResponse.json({ error: 'Nové heslo musí mít alespoň 6 znaků.' }, { status: 400 })
    }

    if (safeNew !== safeConfirm) {
      return NextResponse.json({ error: 'Nová hesla se neshodují.' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data: dbUser } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', user.id)
      .maybeSingle()

    if (!dbUser?.password_hash) {
      return NextResponse.json({ error: 'Nepodařilo se ověřit heslo.' }, { status: 400 })
    }

    const match = await bcrypt.compare(safeCurrent, dbUser.password_hash)
    if (!match) {
      return NextResponse.json({ error: 'Současné heslo je nesprávné.' }, { status: 400 })
    }

    const hash = await bcrypt.hash(safeNew, 12)

    const { error } = await supabase
      .from('users')
      .update({ password_hash: hash })
      .eq('id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Nepodařilo se uložit nové heslo.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Change password error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
