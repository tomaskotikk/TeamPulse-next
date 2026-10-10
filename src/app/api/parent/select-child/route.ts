import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAppUser } from '@/lib/app-context'
import { SELECTED_CHILD_COOKIE, isParentOf } from '@/lib/parent'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Nejste přihlášen.' }, { status: 401 })

    const body = (await request.json().catch(() => ({}))) as { childId?: unknown }
    const childId = Number(body.childId)

    if (!Number.isInteger(childId) || !(await isParentOf(user.id, childId))) {
      return NextResponse.json({ error: 'Dítě nebylo nalezeno.' }, { status: 403 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(SELECTED_CHILD_COOKIE, String(childId), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
    return response
  } catch (err) {
    console.error('Select child error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
