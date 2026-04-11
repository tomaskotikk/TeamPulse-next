import Link from 'next/link'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import Topbar from '@/components/Topbar'
import {
  getClubForUser,
  getCurrentAppUser,
  getThemeVars,
} from '@/lib/app-context'

const GRAPH_CARDS = [
  {
    key: 'vykonnost',
    title: 'Výkonnost týmu',
    description: 'Forma, trend a připravenost týmu v průběhu sezony.',
  },
  {
    key: 'dochazka',
    title: 'Docházka',
    description: 'Měsíční přehled účasti hráčů na trénincích.',
  },
  {
    key: 'slozeni',
    title: 'Složení týmu',
    description: 'Rozložení hráčů a realizačního týmu v klubu.',
  },
] as const

export default async function GraphsPage() {
  const user = await getCurrentAppUser()
  if (!user) redirect('/login')

  const canSeeAnalytics = user.role === 'manažer' || user.role === 'trenér'
  if (!canSeeAnalytics) redirect('/dashboard')

  const club = await getClubForUser(user)
  if (!club) redirect('/dashboard')

  const themeVars = getThemeVars(club)

  return (
    <DashboardLayout user={user} isManager={user.role === 'manažer'} themeVars={themeVars}>
      <Topbar title="Grafy" backHref="/dashboard" backLabel="Zpět" />

      <div className="app-content">
        <div className="page-intro">
          <div className="page-intro-meta">Analytika klubu</div>
          <h2 className="content-title">Přehled grafů</h2>
          <p className="content-subtitle">Vyberte si metriku, kterou chcete analyzovat do detailu.</p>
        </div>

        <div className="grid-3">
          {GRAPH_CARDS.map((card) => (
            <Link key={card.key} href={`/grafy/${card.key}`} className="section" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="section-header">
                <h3 className="section-title">{card.title}</h3>
                <p className="section-description">{card.description}</p>
              </div>
              <div className="section-content" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                Otevřít detail grafu
              </div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
