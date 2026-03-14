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

export default async function DashboardPage() {
  const user = await getCurrentAppUser()
  if (!user) redirect('/login')

  const club = await getClubForUser(user)
  const clubMembers = club ? await getMembersForClub(club.name) : []
  const isManager = user.role === 'manažer'
  const themeVars = getThemeVars(club)

  const totalMembers = clubMembers.length
  const players = clubMembers.filter((m) => m.role === 'hráč').length
  const coaches = clubMembers.filter((m) => m.role === 'trenér').length

  return (
    <DashboardLayout user={user} isManager={isManager} themeVars={themeVars}>
      <Topbar title="Dashboard" />

      <div className="app-content">
        <div className="content-header">
          <h2 className="content-title">Vítejte, {user.first_name}</h2>
          <p className="content-subtitle">
            {isManager ? 'Přehled vašeho klubu a členů' : 'Informace o vašem týmu'}
          </p>
        </div>

        {club ? (
          <>
            {/* STATS */}
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-label">Celkem členů</div>
                <div className="stat-value">{totalMembers}</div>
                <div className="stat-description">Registrovaných v klubu</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Hráčů</div>
                <div className="stat-value">{players}</div>
                <div className="stat-description">Aktivních hráčů</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Trenérů</div>
                <div className="stat-value">{coaches}</div>
                <div className="stat-description">V týmu</div>
              </div>
            </div>

            <div className="grid-2">
              {/* Logo klubu */}
              <div className="section">
                <div className="section-header">
                  <h3 className="section-title">Logo klubu</h3>
                  <p className="section-description">
                    {isManager ? 'Nahrajte logo vašeho klubu' : 'Logo vašeho klubu'}
                  </p>
                </div>
                <div className="section-content">
                  <div className="profile-picture-section">
                    <div className="profile-picture-preview">
                      {club.logo ? (
                        <img src={`/uploads/clubs/${club.logo}`} alt="Logo klubu" />
                      ) : (
                        <div className="profile-picture-placeholder">
                          <svg style={{ width: 60, height: 60 }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {isManager && (
                      <div className="profile-picture-upload">
                        <div className="file-input-wrapper">
                          <input type="file" id="clubLogoInput" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" />
                          <label htmlFor="clubLogoInput" className="file-input-label">
                            <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Vybrat logo
                          </label>
                        </div>
                        <div className="file-info">Max 5MB · JPG, PNG, GIF, WEBP</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Informace o klubu */}
              <div className="section">
                <div className="section-header">
                  <h3 className="section-title">Informace o klubu</h3>
                  <p className="section-description">Kompletní údaje o vašem klubu</p>
                </div>
                <div className="section-content">
                  <div className="data-row">
                    <span className="data-label">Název klubu</span>
                    <span className="data-value">{club.name}</span>
                  </div>
                  <div className="data-row">
                    <span className="data-label">Sport</span>
                    <span className="data-value">{club.sport ?? '–'}</span>
                  </div>
                  <div className="data-row">
                    <span className="data-label">Město</span>
                    <span className="data-value">{club.city ?? '–'}</span>
                  </div>
                  <div className="data-row">
                    <span className="data-label">Registrováno</span>
                    <span className="data-value">
                      {new Date(club.created_at).toLocaleDateString('cs-CZ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ČLENOVÉ */}
            <div className="section">
              <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 className="section-title">Členové klubu</h3>
                  <p className="section-description">Všichni registrovaní členové vašeho klubu</p>
                </div>
                {isManager && (
                  <Link href="/invite" className="topbar-btn primary">
                    <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Přidat člena
                  </Link>
                )}
              </div>
              <div className="member-list">
                {clubMembers.map((member) => {
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
                        <div className="member-contact">{member.email}</div>
                      </div>
                      <span className={`member-badge ${member.role === 'manažer' ? 'manager' : ''}`}>
                        {member.role}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="section">
            <div className="section-content">
              <div className="empty-state">
                <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <div className="empty-title">Nejste členem žádného klubu</div>
                <div className="empty-description">
                  Čekejte na pozvánku od manažera klubu nebo kontaktujte správce.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
