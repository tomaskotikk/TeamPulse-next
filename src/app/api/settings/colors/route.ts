import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getClubForUser, getCurrentAppUser, getThemeVars } from '@/lib/app-context'

const HEX_RE = /^#[0-9A-Fa-f]{6}$/

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })
    if (user.role !== 'manažer') {
      return NextResponse.json({ error: 'Pouze manažer může měnit barvy klubu.' }, { status: 403 })
    }

    const { primaryColor, secondaryColor, accentColor } = await request.json()

    if (!HEX_RE.test(primaryColor) || !HEX_RE.test(secondaryColor) || !HEX_RE.test(accentColor)) {
      return NextResponse.json({ error: 'Barvy musí být ve formátu #RRGGBB.' }, { status: 400 })
    }

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })

    const supabase = await createAdminClient()
    const { error } = await supabase
      .from('clubs')
      .update({
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
      })
      .eq('id', club.id)

    if (error) {
      return NextResponse.json({ error: 'Nepodařilo se uložit barvy klubu.' }, { status: 500 })
    }

    const themeVars = getThemeVars({
      ...club,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: accentColor,
    })

    return NextResponse.json({ success: true, themeVars })
  } catch (err) {
    console.error('Club colors settings error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
