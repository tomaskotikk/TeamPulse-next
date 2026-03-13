import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { attachSessionCookie } from '@/lib/auth/session'
import { verifyTwoFactorCode } from '@/lib/auth/two-factor'

export async function POST(request: NextRequest) {
  try {
    const { userId, code, rememberMe } = await request.json()

    if (!userId || !code || code.length !== 6) {
      return NextResponse.json({ error: 'Neplatný kód.' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Zkontrolovat kód v tabulce two_factor_codes
    const { data: tfaCodes } = await supabase
      .from('two_factor_codes')
      .select('id, code, expires_at, used')
      .eq('user_id', userId)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(5)

    if (!tfaCodes?.length) {
      return NextResponse.json({ error: 'Kód expiroval nebo je neplatný.' }, { status: 401 })
    }

    let matchedCode: { id: number } | null = null

    for (const candidate of tfaCodes) {
      const isValid = await verifyTwoFactorCode(code, candidate.code)
      if (isValid) {
        matchedCode = { id: candidate.id }
        break
      }
    }

    if (!matchedCode) {
      return NextResponse.json({ error: 'Nesprávný kód. Zkuste to znovu.' }, { status: 401 })
    }

    // Označit kód jako použitý
    await supabase
      .from('two_factor_codes')
      .update({ used: true })
      .eq('id', matchedCode.id)

    // Získat uživatele a vytvořit session
    const { data: user } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', userId)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'Uživatel nenalezen.' }, { status: 404 })
    }

    const response = NextResponse.json({ success: true })
    await attachSessionCookie(
      response,
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      Boolean(rememberMe)
    )

    return response
  } catch (err) {
    console.error('2FA verify error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
