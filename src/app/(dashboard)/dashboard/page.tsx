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
import DesktopOverview from '@/components/dashboard/DesktopOverview'

export default async function DashboardPage() {
  const user = await getCurrentAppUser()
  if (!user) redirect('/login')

  const club = await getClubForUser(user)
  const clubMembers = club ? await getMembersForClub(club.name) : []
  const isManager = user.role === 'manažer'
  const canSeeAnalytics = user.role === 'manažer' || user.role === 'trenér'
  const themeVars = getThemeVars(club)

  const totalMembers = clubMembers.length
  const players = clubMembers.filter((m) => m.role === 'hráč').length
  const coaches = clubMembers.filter((m) => m.role === 'trenér').length
  const userName = `${user.first_name} ${user.last_name}`
  const clubName = club?.name ?? user.organization ?? 'Bez klubu'
  const clubInitials = clubName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 3)

  return (
    <DashboardLayout user={user} isManager={isManager} themeVars={themeVars}>
      <Topbar title="Dashboard" />

      <div className="app-content dashboard-home">
        <div className="dashboard-mobile-shell">
          <section className="mobile-home-hero">
            <div className="mobile-home-hero-gradient" />

            <div className="mobile-home-club-logo-wrap">
              {club?.logo ? (
                <img
                  src={`/uploads/clubs/${club.logo}`}
                  alt={`Logo klubu ${clubName}`}
                  className="mobile-home-club-logo"
                />
              ) : (
                <div className="mobile-home-club-logo-fallback">{clubInitials || 'TP'}</div>
              )}
            </div>

            <h1 className="mobile-home-user-name">{userName}</h1>
            <p className="mobile-home-club-name">{clubName}</p>

            <Link href="/profile" className="mobile-home-profile-link">
              {user.profile_picture ? (
                <img src={`/uploads/profiles/${user.profile_picture}`} alt="Profil" className="mobile-home-profile-link-avatar" />
              ) : (
                <span className="mobile-home-profile-link-avatar-fallback">
                  {(user.first_name?.[0] ?? '').toUpperCase()}
                  {(user.last_name?.[0] ?? '').toUpperCase()}
                </span>
              )}
              <span>Otevřít profil</span>
            </Link>
          </section>

          <section className="mobile-home-section">
            <div className="mobile-home-section-header">
              <h2>Povinnosti a informace</h2>
              <p>Platforma vás upozorní, na co nezapomenout.</p>
            </div>

            <div className="mobile-home-action-list">
              <Link href="/members" className="mobile-home-action-card">
                <span className="mobile-home-action-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </span>
                <span className="mobile-home-action-content">
                  <strong>Členové klubu</strong>
                  <small>Přehled všech hráčů, trenérů a kontaktů.</small>
                </span>
                <span className="mobile-home-chevron" aria-hidden="true">›</span>
              </Link>

              <Link href="/profile" className="mobile-home-action-card">
                <span className="mobile-home-action-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <span className="mobile-home-action-content">
                  <strong>Můj profil</strong>
                  <small>Upravte osobní údaje, fotku a kontakty.</small>
                </span>
                <span className="mobile-home-chevron" aria-hidden="true">›</span>
              </Link>

              <Link href="/settings" className="mobile-home-action-card">
                <span className="mobile-home-action-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <span className="mobile-home-action-content">
                  <strong>Nastavení aplikace</strong>
                  <small>Barvy, zabezpečení a další volby účtu.</small>
                </span>
                <span className="mobile-home-chevron" aria-hidden="true">›</span>
              </Link>

              {isManager && (
                <Link href="/invite" className="mobile-home-action-card">
                  <span className="mobile-home-action-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </span>
                  <span className="mobile-home-action-content">
                    <strong>Pozvat nové členy</strong>
                    <small>Vygenerujte pozvánku do klubu během chvilky.</small>
                  </span>
                  <span className="mobile-home-chevron" aria-hidden="true">›</span>
                </Link>
              )}
            </div>
          </section>

          <section className="mobile-home-section">
            <div className="mobile-home-section-header">
              <h2>Novinky na zdech</h2>
              <p>Máte nepřečtené příspěvky, mrkněte na ně a buďte v obraze.</p>
            </div>

            <div className="mobile-home-news-list">
              <Link href="/chat" className="mobile-home-news-item">
                <span className="mobile-home-news-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </span>
                <span className="mobile-home-news-label">Klubová zeď</span>
                <span className="mobile-home-news-badge">Chat</span>
                <span className="mobile-home-chevron" aria-hidden="true">›</span>
              </Link>

              <Link href="/notifications" className="mobile-home-news-item">
                <span className="mobile-home-news-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </span>
                <span className="mobile-home-news-label">Inbox upozornění</span>
                <span className="mobile-home-news-badge">Nové</span>
                <span className="mobile-home-chevron" aria-hidden="true">›</span>
              </Link>
            </div>
          </section>

          {club && (
            <section className="mobile-home-section mobile-home-section-compact">
              <div className="mobile-home-section-header">
                <h2>Nejbližší přehled</h2>
                <p>Rychlý stav vašeho týmu na jedné kartě.</p>
              </div>

              <div className="mobile-home-stats-row">
                <div className="mobile-home-stat-pill">
                  <strong>{totalMembers}</strong>
                  <span>Členů</span>
                </div>
                <div className="mobile-home-stat-pill">
                  <strong>{players}</strong>
                  <span>Hráčů</span>
                </div>
                <div className="mobile-home-stat-pill">
                  <strong>{coaches}</strong>
                  <span>Trenérů</span>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="dashboard-desktop-shell">
          {club ? (
            <DesktopOverview
              userName={user.first_name}
              club={club}
              members={clubMembers}
              isManager={isManager}
              currentUserId={user.id}
              canSeeAnalytics={canSeeAnalytics}
            />
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
      </div>
    </DashboardLayout>
  )
}
