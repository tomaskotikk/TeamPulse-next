import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getClubForUser, getCurrentAppUser } from '@/lib/app-context'

const ALLOWED_ANALYTICS_CARD_IDS = [
  'trend',
  'attendance',
  'composition',
  'recommendations',
  'radar',
  'topMembers',
]

const ALLOWED_KPI_CARD_IDS = [
  'kpiTotalMembers',
  'kpiPlayerBase',
  'kpiReadiness',
  'kpiAttendance',
]

type DashboardLayoutPayload = {
  kpiOrder: string[]
  kpiHidden: string[]
  analyticsOrder: string[]
  analyticsHidden: string[]
}

function validateSegment(order: string[], hidden: string[], allowed: string[]) {
  const allowedSet = new Set(allowed)
  const all = [...order, ...hidden]

  if (all.length !== allowed.length) return false

  const unique = new Set(all)
  if (unique.size !== allowed.length) return false

  return all.every((id) => allowedSet.has(id))
}

function normalizeLayout(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null

  const payload = raw as Partial<DashboardLayoutPayload>
  const kpiOrder = Array.isArray(payload.kpiOrder) ? payload.kpiOrder.map((value) => String(value)) : null
  const kpiHidden = Array.isArray(payload.kpiHidden) ? payload.kpiHidden.map((value) => String(value)) : null
  const analyticsOrder = Array.isArray(payload.analyticsOrder) ? payload.analyticsOrder.map((value) => String(value)) : null
  const analyticsHidden = Array.isArray(payload.analyticsHidden) ? payload.analyticsHidden.map((value) => String(value)) : null

  if (!kpiOrder || !kpiHidden || !analyticsOrder || !analyticsHidden) return null

  if (!validateSegment(kpiOrder, kpiHidden, ALLOWED_KPI_CARD_IDS)) return null
  if (!validateSegment(analyticsOrder, analyticsHidden, ALLOWED_ANALYTICS_CARD_IDS)) return null

  return {
    kpiOrder,
    kpiHidden,
    analyticsOrder,
    analyticsHidden,
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })
    if (user.role !== 'manažer') {
      return NextResponse.json({ error: 'Pouze manažer může měnit rozvržení dashboardu.' }, { status: 403 })
    }

    const payload = await request.json().catch(() => ({}))
    const layout = normalizeLayout(payload.layout)
    if (!layout) {
      return NextResponse.json({ error: 'Neplatný formát rozvržení dashboardu.' }, { status: 400 })
    }

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })

    const supabase = await createAdminClient()
    const { error } = await supabase
      .from('clubs')
      .update({ dashboard_layout: JSON.stringify(layout) })
      .eq('id', club.id)

    if (error) {
      return NextResponse.json({ error: 'Nepodařilo se uložit rozvržení dashboardu.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, layout })
  } catch (err) {
    console.error('Dashboard layout update error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
