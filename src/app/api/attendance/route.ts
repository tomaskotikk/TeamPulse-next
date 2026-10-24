import { NextRequest, NextResponse } from 'next/server'
import { getClubForUser, getCurrentAppUser } from '@/lib/app-context'
import { canManageAttendance, getAttendanceMatrix, matrixToCsv } from '@/lib/attendance'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TYPES = new Set(['training', 'match', 'meeting', 'event'])

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Nejste přihlášen.' }, { status: 401 })
    if (!canManageAttendance(user)) return NextResponse.json({ error: 'Nemáte oprávnění.' }, { status: 403 })

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })

    const sp = request.nextUrl.searchParams
    const from = sp.get('from') ?? ''
    const to = sp.get('to') ?? ''
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      return NextResponse.json({ error: 'Neplatné období.' }, { status: 400 })
    }
    const categoryId = Number(sp.get('category')) || null
    const type = TYPES.has(sp.get('type') ?? '') ? sp.get('type') : null

    const matrix = await getAttendanceMatrix(club, { from, to, categoryId, type })

    if (sp.get('format') === 'csv') {
      return new NextResponse(matrixToCsv(matrix), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="dochazka-${from}-${to}.csv"`,
        },
      })
    }

    return NextResponse.json(matrix)
  } catch (err) {
    console.error('Attendance matrix error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
