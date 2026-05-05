import { redirect } from 'next/navigation'
import { getClubForUser, getCurrentAppUser, getThemeVars } from '@/lib/app-context'
import DashboardLayout from '@/components/DashboardLayout'
import Topbar from '@/components/Topbar'
import CategoriesClient from './CategoriesClient'

export default async function CategoriesPage() {
  const user = await getCurrentAppUser()
  if (!user) redirect('/login')

  const club = await getClubForUser(user)
  if (!club) redirect('/dashboard')

  if (user.role !== 'manažer') redirect('/dashboard')

  const themeVars = getThemeVars(club)

  return (
    <DashboardLayout user={user} isManager themeVars={themeVars}>
      <Topbar
        title="Kategorie"
        backHref="/dashboard"
      />
      <div className="app-content">
        <div className="page-intro">
          <div className="page-intro-meta">Věkové skupiny</div>
          <h2 className="content-title">Kategorie</h2>
          <p className="content-subtitle">
            Vytvořte věkové kategorie, přiřaďte hráče a plánujte události pro konkrétní skupiny.
          </p>
        </div>

        <CategoriesClient />
      </div>
    </DashboardLayout>
  )
}
