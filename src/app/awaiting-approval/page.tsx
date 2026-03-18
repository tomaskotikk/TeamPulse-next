import Link from 'next/link'
import { redirect } from 'next/navigation'
import PublicNavbar from '@/components/PublicNavbar'
import { getClubForUser, getCurrentAppUser } from '@/lib/app-context'
import styles from './awaiting-approval.module.css'

export default async function AwaitingApprovalPage() {
  const user = await getCurrentAppUser()
  if (!user) {
    redirect('/login')
  }

  const club = await getClubForUser(user)

  if (!club || club.approved || user.role !== 'manažer') {
    redirect('/dashboard')
  }

  const isRejected = Boolean(club.rejected_at)

  return (
    <div className={styles.page}>
      <PublicNavbar />

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.kicker}>Stav registrace klubu</p>
          <h1 className={styles.title}>{isRejected ? 'Žádost byla zamítnuta' : 'Žádost čeká na schválení'}</h1>
          <p className={styles.subtitle}>
            {isRejected
              ? 'Aplikace čeká na úpravu údajů a znovupodání registrace.'
              : 'Jakmile administrátor registraci potvrdí, dashboard se automaticky odemkne.'}
          </p>
        </section>

        <section className={styles.card}>
          <div className={styles.badgeRow}>
            <span className={`${styles.badge} ${isRejected ? styles.badgeRejected : styles.badgePending}`}>
              {isRejected ? 'Zamítnuto' : 'Čeká na schválení'}
            </span>
            <span className={styles.clubName}>{club.name}</span>
          </div>

          <p className={styles.description}>
            {isRejected
              ? (
                <>
                  Žádost o klub <strong>{club.name}</strong> zatím nebyla schválena. Po úpravě údajů můžete podat novou žádost.
                </>
              )
              : (
                <>
                  Klub <strong>{club.name}</strong> byl vytvořen, ale ještě není schválen administrátorem.
                  Po schválení získáte plný přístup do celé aplikace.
                </>
              )}
          </p>

          {isRejected && club.rejection_reason && (
            <div className={styles.rejectBox}>
              <strong>Důvod zamítnutí</strong>
              <div>{club.rejection_reason}</div>
            </div>
          )}

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span>Sport</span>
              <strong>{club.sport}</strong>
            </div>
            <div className={styles.infoItem}>
              <span>Město</span>
              <strong>{club.city}</strong>
            </div>
          </div>

          <div className={styles.actions}>
            <a href="/api/auth/logout" className={styles.primaryBtn}>
              Odhlásit se
            </a>
            <Link href="/login" className={styles.linkBtn}>
              Zpět na přihlášení
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
