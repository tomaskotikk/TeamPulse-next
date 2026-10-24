import { NextRequest, NextResponse } from 'next/server'
import { publicUploadUrl, requireMobileContext } from '@/lib/mobile-api'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireMobileContext(request)
    if (ctx instanceof NextResponse) return ctx
    const { user, club, children, memberId } = ctx

    return NextResponse.json({
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        dateBirth: user.dateBirth ?? null,
        avatar: publicUploadUrl(request, 'profiles', user.profile_picture),
      },
      club: {
        id: club.id,
        name: club.name,
        sport: club.sport,
        city: club.city,
        logo: publicUploadUrl(request, 'clubs', club.logo),
        primary_color: club.primary_color || '#E8430A',
        secondary_color: club.secondary_color || '#0B0D10',
      },
      children: children.map((c) => ({
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        avatar: publicUploadUrl(request, 'profiles', c.profile_picture),
      })),
      selectedChildId: user.role === 'rodič' ? memberId : null,
    })
  } catch (err) {
    console.error('Mobile me error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
