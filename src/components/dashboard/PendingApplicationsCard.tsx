import Link from 'next/link'
import type { PublicApplication } from '@/lib/onboarding/applications'
import { formatDate } from '@/lib/onboarding/labels'
import { getAge } from '@/lib/onboarding/validation'
import styles from '@/app/(dashboard)/applications/applications.module.css'

/** Dashboard block listing applications that wait for the manager's decision. */
export default function PendingApplicationsCard({ applications }: { applications: PublicApplication[] }) {
  if (applications.length === 0) return null

  const shown = applications.slice(0, 5)

  return (
    <section className={`section ${styles.highlight}`} style={{ marginBottom: 'var(--space-4)' }}>
      <div className="section-header">
        <div>
          <h3 className="section-title">Čekající přihlášky ({applications.length})</h3>
          <p className="section-description">Noví hráči čekají na schválení. U nezletilých zkontrolujte e-mail rodiče.</p>
        </div>
        <Link href="/applications" className="btn">Všechny přihlášky</Link>
      </div>
      <div className="section-content">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Hráč</th>
              <th className={styles.hideMobile}>Věk</th>
              <th className={styles.hideMobile}>E-mail rodiče</th>
              <th className={styles.hideMobile}>Odesláno</th>
              <th aria-label="Akce" />
            </tr>
          </thead>
          <tbody>
            {shown.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link href={`/applications/${a.id}`} className={styles.rowLink}>
                    {a.first_name} {a.last_name}
                  </Link>
                </td>
                <td className={`${styles.hideMobile} ${styles.num}`}>{getAge(a.date_birth)}</td>
                <td className={styles.hideMobile}>{a.parent_email ?? <span className={styles.muted}>dospělý</span>}</td>
                <td className={`${styles.hideMobile} ${styles.num}`}>{formatDate(a.created_at)}</td>
                <td style={{ textAlign: 'right' }}>
                  <Link href={`/applications/${a.id}`} className="btn btn-primary">Zkontrolovat</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
