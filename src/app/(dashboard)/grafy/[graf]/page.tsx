import DashboardLayout from '@/components/DashboardLayout'
import Topbar from '@/components/Topbar'
import GraphDetail from '@/components/dashboard/GraphDetail'
import { redirect } from 'next/navigation'
import {
  getClubForUser,
  getCurrentAppUser,
  getMembersForClub,
  getThemeVars,
} from '@/lib/app-context'
import { buildDashboardMetrics } from '@/lib/dashboard-metrics'

type GraphKey = 'vykonnost' | 'dochazka' | 'slozeni'

const ALLOWED_GRAPHS: GraphKey[] = ['vykonnost', 'dochazka', 'slozeni']

export default async function GraphDetailPage({ params }: { params: Promise<{ graf: string }> }) {
  const { graf } = await params
  const graph = graf as GraphKey

  if (!ALLOWED_GRAPHS.includes(graph)) {
    redirect('/grafy')
  }

  const user = await getCurrentAppUser()
  if (!user) redirect('/login')

  const canSeeAnalytics = user.role === 'manažer' || user.role === 'trenér'
  if (!canSeeAnalytics) {
    redirect('/dashboard')
  }

  const club = await getClubForUser(user)
  if (!club) redirect('/dashboard')

  const members = await getMembersForClub(club.name)
  const themeVars = getThemeVars(club)
  const metrics = buildDashboardMetrics(members)

  return (
    <DashboardLayout user={user} isManager={user.role === 'manažer'} themeVars={themeVars}>
      <Topbar title="Detail grafu" backHref="/grafy" backLabel="Zpět na grafy" />
      <div className="app-content">
        <div className="page-intro">
          <div className="page-intro-meta">Analytika klubu</div>
          <h2 className="content-title">Podrobné metriky týmu</h2>
          <p className="content-subtitle">Detailní data jsou dostupná pouze pro manažery a trenéry.</p>
        </div>

        <GraphDetail
          graph={graph}
          trendData={metrics.trendData}
          attendanceData={metrics.attendanceData}
          compositionData={metrics.compositionData}
        />
      </div>
    </DashboardLayout>
  )
}
