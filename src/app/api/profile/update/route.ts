import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentAppUser } from '@/lib/app-context'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })

    const { firstName, lastName, phone } = await request.json()

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'Jméno a příjmení jsou povinné.' }, { status: 400 })
    }

    const supabase = await createAdminClient()
    const { error } = await supabase
      .from('users')
      .update({
        first_name: String(firstName).trim(),
        last_name: String(lastName).trim(),
        phone: String(phone ?? '').trim(),
      })
      .eq('id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Nepodařilo se uložit profil.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Profile update error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
