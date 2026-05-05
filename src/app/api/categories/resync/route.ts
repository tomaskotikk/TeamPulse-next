import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getClubForUser, getCurrentAppUser } from '@/lib/app-context'
import { fullResyncCategories } from '@/app/api/categories/route'

export async function POST() {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })
    if (user.role !== 'manažer') return NextResponse.json({ error: 'Pouze manažer.' }, { status: 403 })

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })

    const supabase = await createAdminClient()
    await fullResyncCategories(supabase, club.id, club.name)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Categories resync error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
