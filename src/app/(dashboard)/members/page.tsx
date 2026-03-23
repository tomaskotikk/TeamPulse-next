import DashboardLayout from '@/components/DashboardLayout'
import Topbar from '@/components/Topbar'
import MembersDirectory from './MembersDirectory'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  getClubForUser,
  getCurrentAppUser,
  getMembersForClub,
  getThemeVars,
} from '@/lib/app-context'

export default async function MembersPage() {
  const user = await getCurrentAppUser()
  if (!user) redirect('/login')

  const club = await getClubForUser(user)
  if (!club) redirect('/dashboard')

  const isManager = user.role === 'manažer'
  const members = await getMembersForClub(club.name)
  const themeVars = getThemeVars(club)

  return (
    <DashboardLayout user={user} isManager={isManager} themeVars={themeVars}>
      <Topbar
        title="Členové"
        actions={
          isManager ? (
            <Link href="/invite" className="topbar-btn primary">
              <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Pozvat člena
            </Link>
          ) : null
        }
        backHref="/dashboard"
      />

      <div className="app-content">
        <div className="content-header">
          <h2 className="content-title">Tým • {members.length} členů</h2>
          <p className="content-subtitle">
            Přehled všech registrovaných členů a jejich rolí v klubu
          </p>
        </div>

        <div className="section">
          <div className="section-header">
            <h3 className="section-title">Seznam členů</h3>
            <p className="section-description">Všichni hráči, trenéři a partneři</p>
          </div>
          <MembersDirectory members={members} currentUserId={user.id} isManager={isManager} />
        </div>
      </div>
    </DashboardLayout>
  )
}
