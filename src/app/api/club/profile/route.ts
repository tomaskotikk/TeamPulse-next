import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getClubForUser, getCurrentAppUser } from '@/lib/app-context'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })
    if (user.role !== 'manažer') {
      return NextResponse.json({ error: 'Pouze manažer může upravovat klubový profil.' }, { status: 403 })
    }

    const payload = await request.json().catch(() => ({}))
    const name = String(payload.name || '').trim()
    const sport = String(payload.sport || '').trim()
    const city = String(payload.city || '').trim()
    const website = String(payload.website || '').trim()
    const clubEmail = String(payload.club_email || '').trim()
    const clubPhone = String(payload.club_phone || '').trim()

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Název klubu musí mít alespoň 2 znaky.' }, { status: 400 })
    }
    if (!sport || !city) {
      return NextResponse.json({ error: 'Sport a město jsou povinné.' }, { status: 400 })
    }
    if (website && !/^https?:\/\//i.test(website)) {
      return NextResponse.json({ error: 'Web musí začínat na http:// nebo https://.' }, { status: 400 })
    }

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })

    const supabase = await createAdminClient()

    const { error: updateClubError } = await supabase
      .from('clubs')
      .update({
        name,
        sport,
        city,
        website: website || null,
        club_email: clubEmail || null,
        club_phone: clubPhone || null,
      })
      .eq('id', club.id)

    if (updateClubError) {
      return NextResponse.json({ error: 'Nepodařilo se uložit klubový profil.' }, { status: 500 })
    }

    if (club.name !== name) {
      const { error: updateUsersError } = await supabase
        .from('users')
        .update({ organization: name })
        .eq('organization', club.name)

      if (updateUsersError) {
        return NextResponse.json({ error: 'Profil klubu byl uložen, ale nepodařilo se synchronizovat členy.' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Club profile update error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
