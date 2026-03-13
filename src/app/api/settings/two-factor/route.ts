import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentAppUser } from '@/lib/app-context'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })

    const { enabled } = await request.json()
    const nextEnabled = Boolean(enabled)

    const supabase = await createAdminClient()
    const { error } = await supabase
      .from('users')
      .update({ two_factor_enabled: nextEnabled })
      .eq('id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Nepodařilo se uložit 2FA.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, enabled: nextEnabled })
  } catch (err) {
    console.error('2FA settings error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
