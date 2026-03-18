'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import ClubApprovalActions from '@/components/ClubApprovalActions'
import UserModerationActions from '@/components/UserModerationActions'
import DeleteClubButton from '@/components/DeleteClubButton'
import styles from '@/components/admin-panel.module.css'

type ClubRow = {
  id: number
  name: string
  city: string
  sport: string
  club_email: string
  club_phone: string
  website: string
  approved: boolean
  rejected_at: string | null
  rejection_reason: string | null
  created_at: string
  owner_user_id: number
}

type UserRow = {
  id: number
  first_name: string
  last_name: string
  email: string
  role: string
  organization: string | null
  admin: boolean
  profile_picture: string | null
  created_at: string
}

type AdminPanelClientProps = {
  admin: {
    id: number
    first_name: string
    last_name: string
    email: string
  }
  clubs: ClubRow[]
  users: UserRow[]
}

function statusOf(club: ClubRow) {
  if (club.approved) return 'approved'
  if (club.rejected_at) return 'rejected'
  return 'pending'
}

export default function AdminPanelClient({ admin, clubs, users }: AdminPanelClientProps) {
  const [search, setSearch] = useState('')
  const [clubStatusFilter, setClubStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'manažer' | 'trenér' | 'hráč' | 'rodič' | 'jiné'>('all')
  const [focusMode, setFocusMode] = useState<'all' | 'requests' | 'clubs' | 'users'>('all')

  const ownerById = useMemo(() => {
    const m = new Map<number, UserRow>()
    for (const u of users) {
      m.set(u.id, u)
    }
    return m
  }, [users])

  const searchLower = search.trim().toLowerCase()

  const filteredClubs = useMemo(() => {
    return clubs.filter((club) => {
      const status = statusOf(club)
      if (clubStatusFilter !== 'all' && status !== clubStatusFilter) return false
      if (!searchLower) return true

      const owner = ownerById.get(club.owner_user_id)
      const hay = [
        club.name,
        club.sport,
        club.city,
        club.club_email,
        club.club_phone,
        club.website,
        owner?.first_name,
        owner?.last_name,
        owner?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return hay.includes(searchLower)
    })
  }, [clubStatusFilter, clubs, ownerById, searchLower])

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false

      if (!searchLower) return true
      const hay = [u.first_name, u.last_name, u.email, u.role, u.organization].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(searchLower)
    })
  }, [searchLower, userRoleFilter, users])

  const pendingClubs = filteredClubs.filter((c) => statusOf(c) === 'pending')
  const rejectedClubs = filteredClubs.filter((c) => statusOf(c) === 'rejected')

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brandWrap}>
            <img src="/tp-logo.png" alt="TeamPulse" className={styles.logo} />
            <div>
              <h1 className={styles.brandTitle}>TeamPulse Admin</h1>
              <div className={styles.brandSub}>Přihlášen: {admin.first_name} {admin.last_name} ({admin.email})</div>
            </div>
          </div>
          <a href="/api/auth/logout" className={styles.logoutBtn}>Odhlásit</a>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.kpis}>
          <div className={styles.kpiCard}><div className={styles.kpiLabel}>Kluby celkem</div><div className={styles.kpiValue}>{clubs.length}</div></div>
          <div className={styles.kpiCard}><div className={styles.kpiLabel}>Čekající žádosti</div><div className={styles.kpiValue}>{clubs.filter((c) => statusOf(c) === 'pending').length}</div></div>
          <div className={styles.kpiCard}><div className={styles.kpiLabel}>Zamítnuté žádosti</div><div className={styles.kpiValue}>{clubs.filter((c) => statusOf(c) === 'rejected').length}</div></div>
          <div className={styles.kpiCard}><div className={styles.kpiLabel}>Uživatelé</div><div className={styles.kpiValue}>{users.length}</div></div>
        </section>

        <section className={styles.filters}>
          <input className={styles.searchInput} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Vyhledat klub, uživatele, e-mail, město..." />
          <select className={styles.select} value={focusMode} onChange={(e) => setFocusMode(e.target.value as typeof focusMode)}>
            <option value="all">Všechny sekce</option>
            <option value="requests">Jen žádosti</option>
            <option value="clubs">Jen kluby</option>
            <option value="users">Jen uživatelé</option>
          </select>
          <select className={styles.select} value={clubStatusFilter} onChange={(e) => setClubStatusFilter(e.target.value as typeof clubStatusFilter)}>
            <option value="all">Stav klubu: vše</option>
            <option value="pending">Čeká</option>
            <option value="approved">Schváleno</option>
            <option value="rejected">Zamítnuto</option>
          </select>
          <select className={styles.select} value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value as typeof userRoleFilter)}>
            <option value="all">Role: všechny</option>
            <option value="manažer">Manažer</option>
            <option value="trenér">Trenér</option>
            <option value="hráč">Hráč</option>
            <option value="rodič">Rodič</option>
            <option value="jiné">Jiné</option>
          </select>
        </section>

        {(focusMode === 'all' || focusMode === 'requests') && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Žádosti o nový klub</h2>
                <p className={styles.sectionSub}>Přijmout/odmítnout registrace klubů.</p>
              </div>
            </div>
            <div className={styles.sectionBody}>
              {pendingClubs.length === 0 ? (
                <div className={styles.empty}>Žádné čekající žádosti podle aktuálních filtrů.</div>
              ) : (
                <div className={styles.requestList}>
                  {pendingClubs.map((club) => {
                    const owner = ownerById.get(club.owner_user_id)
                    return (
                      <article key={club.id} className={styles.requestCard}>
                        <div className={styles.requestHead}>
                          <div>
                            <h3 className={styles.requestTitle}>
                              <Link href={`/admin/clubs/${club.id}`} className={styles.link}>{club.name}</Link>
                            </h3>
                            <div className={styles.requestMeta}>{club.sport} - {club.city}</div>
                            <div style={{ marginTop: 8 }}><span className={`${styles.badge} ${styles.pending}`}>Čeká na schválení</span></div>
                          </div>
                          <ClubApprovalActions clubId={club.id} />
                        </div>
                        <div className={styles.infoGrid}>
                          <div><strong>Správce:</strong> {owner ? `${owner.first_name} ${owner.last_name}` : 'Neznámý'}</div>
                          <div><strong>E-mail správce:</strong> {owner?.email ?? '-'}</div>
                          <div><strong>Klubový e-mail:</strong> {club.club_email}</div>
                          <div><strong>Telefon:</strong> {club.club_phone}</div>
                          <div><strong>Web:</strong> {club.website}</div>
                          <div><strong>Vytvořeno:</strong> {new Date(club.created_at).toLocaleString('cs-CZ')}</div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {(focusMode === 'all' || focusMode === 'clubs') && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Kluby</h2>
                <p className={styles.sectionSub}>Rozklik pro detail, správu a zrušení celého týmu.</p>
              </div>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>ID</th><th>Název</th><th>Sport</th><th>Město</th><th>Stav</th><th>Správce</th><th>Akce</th></tr></thead>
                  <tbody>
                    {filteredClubs.map((club) => {
                      const owner = ownerById.get(club.owner_user_id)
                      return (
                        <tr key={club.id}>
                          <td>{club.id}</td>
                          <td><Link href={`/admin/clubs/${club.id}`} className={styles.link}>{club.name}</Link></td>
                          <td>{club.sport}</td>
                          <td>{club.city}</td>
                          <td>
                            {statusOf(club) === 'approved' && <span className={`${styles.badge} ${styles.approved}`}>Schváleno</span>}
                            {statusOf(club) === 'pending' && <span className={`${styles.badge} ${styles.pending}`}>Čeká</span>}
                            {statusOf(club) === 'rejected' && <span className={`${styles.badge} ${styles.rejected}`}>Zamítnuto</span>}
                          </td>
                          <td>{owner ? `${owner.first_name} ${owner.last_name}` : '-'}</td>
                          <td><DeleteClubButton clubId={club.id} clubName={club.name} compact /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {(focusMode === 'all' || focusMode === 'users') && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Uživatelé</h2>
                <p className={styles.sectionSub}>Rozklik profilu a bezpečné smazání účtu.</p>
              </div>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>ID</th><th>Jméno</th><th>E-mail</th><th>Role</th><th>Klub</th><th>Akce</th></tr></thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td>
                          <div className={styles.userCell}>
                            {u.profile_picture ? (
                              <img
                                src={`/uploads/profiles/${u.profile_picture}`}
                                alt={`${u.first_name} ${u.last_name}`}
                                className={styles.userAvatar}
                              />
                            ) : (
                              <div className={styles.userAvatarPlaceholder}>
                                {(u.first_name?.[0] ?? '').toUpperCase()}
                              </div>
                            )}
                            <Link href={`/admin/users/${u.id}`} className={styles.link}>{u.first_name} {u.last_name}</Link>
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                        <td>{u.organization ?? '-'}</td>
                        <td><UserModerationActions userId={u.id} compact disabled={u.admin && u.id === admin.id} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {focusMode !== 'requests' && rejectedClubs.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Zamítnuté žádosti</h2>
                <p className={styles.sectionSub}>Historie odmítnutých registrací klubů.</p>
              </div>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.requestList}>
                {rejectedClubs.map((club) => {
                  const owner = ownerById.get(club.owner_user_id)
                  return (
                    <article key={club.id} className={styles.requestCard}>
                      <div className={styles.requestHead}>
                        <div>
                          <h3 className={styles.requestTitle}><Link href={`/admin/clubs/${club.id}`} className={styles.link}>{club.name}</Link></h3>
                          <div className={styles.requestMeta}>{club.sport} - {club.city}</div>
                          <div style={{ marginTop: 8 }}><span className={`${styles.badge} ${styles.rejected}`}>Zamítnuto</span></div>
                        </div>
                        <div style={{ fontSize: 12, color: '#9aa4b5' }}>{club.rejected_at ? new Date(club.rejected_at).toLocaleString('cs-CZ') : '-'}</div>
                      </div>
                      <div className={styles.infoGrid}>
                        <div><strong>Správce:</strong> {owner ? `${owner.first_name} ${owner.last_name}` : 'Neznámý'}</div>
                        <div><strong>E-mail správce:</strong> {owner?.email ?? '-'}</div>
                        <div><strong>Důvod:</strong> {club.rejection_reason || 'Neuveden'}</div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
