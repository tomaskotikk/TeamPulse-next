import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getClubForUser, getCurrentAppUser } from '@/lib/app-context'

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
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 620 }}>
        <h1 style={{ marginTop: 0 }}>{isRejected ? 'Žádost byla zamítnuta' : 'Žádost čeká na schválení'}</h1>
        <p style={{ color: '#666', lineHeight: 1.7 }}>
          {isRejected
            ? (
              <>
                Žádost o klub <strong>{club.name}</strong> zatím nebyla schválena. Můžete upravit údaje a podat novou žádost.
              </>
            )
            : (
              <>
                Klub <strong>{club.name}</strong> byl vytvořen, ale ještě není schválen administrátorem.
                Jakmile bude schválení dokončeno, přístup do dashboardu se automaticky odemkne.
              </>
            )}
        </p>

        {isRejected && club.rejection_reason && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: '#fff4f4', border: '1px solid #f0c9c9', color: '#7a2222' }}>
            <strong>Důvod zamítnutí:</strong>
            <div style={{ marginTop: 6 }}>{club.rejection_reason}</div>
          </div>
        )}

        <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: '#f5f5f7', border: '1px solid #e7e7ea' }}>
          <div><strong>Sport:</strong> {club.sport}</div>
          <div><strong>Město:</strong> {club.city}</div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <a href="/api/auth/logout" className="auth-btn-primary" style={{ width: 'auto', textDecoration: 'none' }}>
            Odhlásit se
          </a>
          <Link href="/login" className="auth-switch" style={{ alignSelf: 'center' }}>
            Zpět na přihlášení
          </Link>
        </div>
      </div>
    </div>
  )
}
