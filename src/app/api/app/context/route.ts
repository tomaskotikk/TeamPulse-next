import { NextResponse } from 'next/server'
import {
  getClubForUser,
  getCurrentAppUser,
  getMembersForClub,
  getThemeVars,
} from '@/lib/app-context'

export async function GET() {
  try {
    const user = await getCurrentAppUser()

    if (!user) {
      return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })
    }

    const club = await getClubForUser(user)
    const members = club ? await getMembersForClub(club.name) : []
    const themeVars = getThemeVars(club)

    return NextResponse.json({
      user,
      club,
      members,
      themeVars,
    })
  } catch (err) {
    console.error('Context API error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
