import DashboardLayout from '@/components/DashboardLayout'
import Topbar from '@/components/Topbar'
import { notFound, redirect } from 'next/navigation'
import {
  getClubForUser,
  getCurrentAppUser,
  getMembersForClub,
  getThemeVars,
} from '@/lib/app-context'
import RemoveMemberButton from '@/components/RemoveMemberButton'

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const memberId = parseInt(id, 10)

  const user = await getCurrentAppUser()
  if (!user) notFound()

  const club = await getClubForUser(user)
  if (!club) notFound()

  const members = await getMembersForClub(club.name)
  const themeVars = getThemeVars(club)
  const isManager = user.role === 'manažer'

  // Přesměrování na vlastní profil
  if (memberId === user.id) {
    redirect('/profile')
  }

  const member = members.find((m) => m.id === memberId)
  if (!member) notFound()

  // Ověřit, že je ve stejném klubu
  if (member.organization !== club.name) notFound()

  const mInitials =
    (member.first_name?.[0] ?? '').toUpperCase() +
    (member.last_name?.[0] ?? '').toUpperCase()

  return (
    <DashboardLayout user={user} isManager={isManager} themeVars={themeVars}>
      <Topbar title="Profil člena" backHref="/members" backLabel="Zpět na členy" />

      <div className="app-content">
        <div className="content-header">
          <h2 className="content-title">
            {member.first_name} {member.last_name}
          </h2>
          <p className="content-subtitle">Detaily profilu člena</p>
        </div>

        <div className="grid-2">
          {/* Profilový obrázek */}
          <div className="section">
            <div className="section-header">
              <h3 className="section-title">Profilové foto</h3>
            </div>
            <div className="section-content">
              <div className="profile-picture-section">
                <div className="profile-picture-preview">
                  {member.profile_picture ? (
                    <img src={`/uploads/profiles/${member.profile_picture}`} alt="Profilový obrázek" />
                  ) : (
                    <div className="profile-picture-placeholder">{mInitials}</div>
                  )}
                </div>
                <div style={{ marginTop: 16 }}>
                  <span className={`member-badge ${member.role === 'manažer' ? 'manager' : ''}`} style={{ fontSize: 14, padding: '6px 14px' }}>
                    {member.role}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Osobní údaje */}
          <div className="section">
            <div className="section-header">
              <h3 className="section-title">Osobní údaje</h3>
            </div>
            <div className="section-content">
              <div className="data-row">
                <span className="data-label">Jméno</span>
                <span className="data-value">{member.first_name} {member.last_name}</span>
              </div>
              <div className="data-row">
                <span className="data-label">E-mail</span>
                <span className="data-value">
                  <a href={`mailto:${member.email}`} style={{ color: 'var(--red)', textDecoration: 'none' }}>
                    {member.email}
                  </a>
                </span>
              </div>
              <div className="data-row">
                <span className="data-label">Telefon</span>
                <span className="data-value">
                  {member.phone ? (
                    <a href={`tel:${member.phone}`} style={{ color: 'var(--red)', textDecoration: 'none' }}>
                      {member.phone}
                    </a>
                  ) : '–'}
                </span>
              </div>
              <div className="data-row">
                <span className="data-label">Role</span>
                <span className="data-value">{member.role}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Klub</span>
                <span className="data-value">{member.organization ?? '–'}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Člen od</span>
                <span className="data-value">
                  {member.created_at
                    ? new Date(member.created_at).toLocaleDateString('cs-CZ', {
                        day: 'numeric',
                        month: 'numeric',
                        year: 'numeric',
                      })
                    : '–'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Akce manažera */}
        {isManager && (
          <div className="section">
            <div className="section-header">
              <h3 className="section-title">Správa člena</h3>
              <p className="section-description">Akce dostupné pro manažera</p>
            </div>
            <div className="section-content" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <RemoveMemberButton
                memberId={member.id}
                memberName={`${member.first_name} ${member.last_name}`}
                disabled={member.role === 'manažer'}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
