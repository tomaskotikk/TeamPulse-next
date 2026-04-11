import type { AppUser } from '@/lib/app-context'

export const DASHBOARD_MONTHS = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro']

function seededOffset(seed: number, index: number) {
  const raw = Math.sin(seed * 17.17 + index * 4.73) * 6
  return Math.round(raw)
}

export function buildDashboardMetrics(members: AppUser[]) {
  const totalMembers = members.length
  const players = members.filter((m) => m.role === 'hráč').length
  const coaches = members.filter((m) => m.role === 'trenér').length
  const management = members.filter((m) => m.role === 'manažer' || m.role === 'trenér').length

  const readiness = Math.max(58, Math.min(98, Math.round((players / Math.max(totalMembers, 1)) * 72 + 28)))
  const attendance = Math.max(55, Math.min(97, Math.round(readiness - 3)))
  const quarterGrowth = Math.max(0, Math.round(totalMembers * 0.18))

  const trendData = DASHBOARD_MONTHS.map((month, i) => {
    const base = 48 + i * 2
    return {
      month,
      trend: Math.max(35, Math.min(96, base + seededOffset(totalMembers + players, i))),
      attendance: Math.max(32, Math.min(94, base - 3 + seededOffset(totalMembers + management, i + 2))),
    }
  })

  const attendanceData = DASHBOARD_MONTHS.map((month, i) => ({
    month,
    value: Math.max(36, Math.min(92, 50 + i * 2 + seededOffset(players + 3, i + 1))),
  }))

  const compositionData = [
    { name: 'Hráči', value: Math.max(players, 0) },
    { name: 'Vedení', value: Math.max(management, 0) },
  ].filter((item) => item.value > 0)

  return {
    totalMembers,
    players,
    coaches,
    management,
    readiness,
    attendance,
    quarterGrowth,
    trendData,
    attendanceData,
    compositionData,
  }
}
