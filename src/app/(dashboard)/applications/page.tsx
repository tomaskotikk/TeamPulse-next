import DashboardLayout from '@/components/DashboardLayout'
import Topbar from '@/components/Topbar'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentAppUser, getThemeVars } from '@/lib/app-context'
import { createAdminClient } from '@/lib/supabase/server'
import { getManagedClub, listApplicationsForClub } from '@/lib/onboarding/applications'
import { APPLICATION_STATUS_LABELS, formatDate } from '@/lib/onboarding/labels'
import { getAge } from '@/lib/onboarding/validation'
import styles from './applications.module.css'

export default async function ApplicationsPage() {
  const user = await getCurrentAppUser()
  if (!user) redirect('/login')

  const club = await getManagedClub(user)
  if (!club) redirect('/dashboard')

  const supabase = await createAdminClient()
  const applications = await listApplicationsForClub(supabase, club.id)
  const open = applications.filter((a) => a.status === 'pending_manager' || a.status === 'pending_parent')
  const closed = applications.filter((a) => a.status === 'completed' || a.status === 'rejected')

  return (
    <DashboardLayout user={user} isManager themeVars={getThemeVars(club)}>
      <Topbar title="Přihlášky" backHref="/dashboard" />

      <div className="app-content">
        <div className="page-intro">
          <div className="page-intro-meta">Nábor hráčů</div>
          <h2 className="content-title">Přihlášky hráčů</h2>
          <p className="content-subtitle">
            Hráči, kteří vyplnili přihlášku z pozvánky. U nezletilých před schválením ověřte e-mail rodiče.
          </p>
        </div>

        <ApplicationsTable title="Otevřené" items={open} emptyText="Žádné přihlášky nečekají na vyřízení." />
        <ApplicationsTable title="Vyřízené" items={closed} emptyText="Zatím žádné vyřízené přihlášky." />
      </div>
    </DashboardLayout>
  )
}

function ApplicationsTable({
  title,
  items,
  emptyText,
}: {
  title: string
  items: Awaited<ReturnType<typeof listApplicationsForClub>>
  emptyText: string
}) {
  return (
    <div className="section">
      <div className="section-header">
        <h3 className="section-title">
          {title} <span className={styles.muted}>({items.length})</span>
        </h3>
      </div>
      <div className="section-content">
        {items.length === 0 ? (
          <p className={styles.empty}>{emptyText}</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Hráč</th>
                <th className={styles.hideMobile}>Věk</th>
                <th className={styles.hideMobile}>Rodič</th>
                <th>Stav</th>
                <th className={styles.hideMobile}>Odesláno</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/applications/${a.id}`} className={styles.rowLink}>
                      {a.first_name} {a.last_name}
                    </Link>
                    <div className={styles.muted}>{a.email}</div>
                  </td>
                  <td className={`${styles.hideMobile} ${styles.num}`}>{getAge(a.date_birth)}</td>
                  <td className={styles.hideMobile}>{a.parent_email ?? <span className={styles.muted}>–</span>}</td>
                  <td>
                    <span className={`${styles.status} ${styles[a.status]}`}>{APPLICATION_STATUS_LABELS[a.status]}</span>
                  </td>
                  <td className={`${styles.hideMobile} ${styles.num}`}>{formatDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
