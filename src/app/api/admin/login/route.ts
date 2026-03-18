import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { attachSessionCookie } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    const safeEmail = String(email || '').trim().toLowerCase()
    const safePassword = String(password || '')

    if (!safeEmail || !safePassword) {
      return NextResponse.json({ error: 'Vyplňte e-mail i heslo.' }, { status: 400 })
    }

    const supabase = await createAdminClient()
    const { data: user } = await supabase
      .from('users')
      .select('id, email, role, password_hash, admin, banned, ban_reason')
      .eq('email', safeEmail)
      .eq('admin', true)
      .maybeSingle()

    if (!user) {
      return NextResponse.json({ error: 'Neplatné přihlašovací údaje.' }, { status: 401 })
    }

    const normalizedHash = user.password_hash.startsWith('$2y$')
      ? `$2b$${user.password_hash.slice(4)}`
      : user.password_hash

    const passwordOk = await bcrypt.compare(safePassword, normalizedHash)
    if (!passwordOk) {
      return NextResponse.json({ error: 'Neplatné přihlašovací údaje.' }, { status: 401 })
    }

    if (user.banned) {
      return NextResponse.json(
        {
          error: user.ban_reason
            ? `Admin účet je zablokován. Důvod: ${user.ban_reason}`
            : 'Admin účet je zablokován.',
        },
        { status: 403 }
      )
    }

    const response = NextResponse.json({ success: true })
    await attachSessionCookie(
      response,
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      false
    )

    return response
  } catch (err) {
    console.error('Admin login error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
