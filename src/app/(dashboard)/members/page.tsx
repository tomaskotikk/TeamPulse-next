import DashboardLayout from '@/components/DashboardLayout'
import Topbar from '@/components/Topbar'
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
          <div className="member-list">
            {members.length === 0 ? (
              <div className="section-content">
                <div className="empty-state">
                  <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <div className="empty-title">Žádní členové</div>
                  <div className="empty-description">Pozvěte první členy do vašeho klubu a začněte spolupracovat.</div>
                  {isManager && (
                    <Link href="/invite" className="btn btn-primary" style={{ display: 'inline-flex', width: 'auto', marginTop: '16px' }}>
                      <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                      Pozvat členy
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              members.map((member) => {
                const mInitials =
                  (member.first_name?.[0] ?? '').toUpperCase() +
                  (member.last_name?.[0] ?? '').toUpperCase()
                const href = member.id === user.id ? '/profile' : `/members/${member.id}`

                return (
                  <Link key={member.id} href={href} className="member-item">
                    {member.profile_picture ? (
                      <img
                        src={`/uploads/profiles/${member.profile_picture}`}
                        alt=""
                        className="member-avatar-img"
                      />
                    ) : (
                      <div className="member-avatar">{mInitials}</div>
                    )}
                    <div className="member-info">
                      <div className="member-name">
                        {member.first_name} {member.last_name}
                      </div>
                      <div className="member-role">{member.role}</div>
                      <div className="member-contact">
                        {member.email}
                        {member.phone && ` · ${member.phone}`}
                      </div>
                    </div>
                    <span className={`member-badge ${member.role === 'manažer' ? 'manager' : ''}`}>
                      {member.role}
                    </span>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
