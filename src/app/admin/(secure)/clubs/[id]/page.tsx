import Link from 'next/link'
import { notFound } from 'next/navigation'
import ClubApprovalActions from '@/components/ClubApprovalActions'
import DeleteClubButton from '@/components/DeleteClubButton'
import { requireAdminUser } from '@/lib/auth/admin-page'
import { createAdminClient } from '@/lib/supabase/server'
import styles from '@/app/admin/(secure)/detail.module.css'

export default async function AdminClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminUser('/admin/login')

  const { id } = await params
  const clubId = Number(id)
  if (!Number.isFinite(clubId) || clubId <= 0) notFound()

  const supabase = await createAdminClient()

  const { data: club } = await supabase
    .from('clubs')
    .select('id, name, city, sport, approved, rejected_at, rejection_reason, club_email, club_phone, website, owner_user_id, created_at')
    .eq('id', clubId)
    .maybeSingle()

  if (!club) notFound()

  const { data: owner } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, admin, banned')
    .eq('id', club.owner_user_id)
    .maybeSingle()

  const { data: members } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, role, admin, profile_picture, organization, created_at')
    .eq('organization', club.name)
    .order('created_at', { ascending: false })

  const status = club.approved ? 'approved' : club.rejected_at ? 'rejected' : 'pending'

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/admin" className={styles.back}>← Zpět do admin panelu</Link>

        <section className={styles.card}>
          <h1 className={styles.title}>{club.name}</h1>
          <div className={styles.sub}>{club.sport} · {club.city}</div>
          <div style={{ marginTop: 10 }}>
            {status === 'approved' && <span className={`${styles.badge} ${styles.approved}`}>Schváleno</span>}
            {status === 'pending' && <span className={`${styles.badge} ${styles.pending}`}>Čeká na schválení</span>}
            {status === 'rejected' && <span className={`${styles.badge} ${styles.rejected}`}>Zamítnuto</span>}
          </div>

          {club.rejected_at && (
            <div style={{ marginTop: 12, color: '#fecaca', fontSize: 13 }}>
              Důvod zamítnutí: {club.rejection_reason || 'Neuveden'}
            </div>
          )}

          <div className={styles.grid} style={{ marginTop: 14 }}>
            <div><strong>Klubový e-mail:</strong> {club.club_email}</div>
            <div><strong>Telefon:</strong> {club.club_phone}</div>
            <div><strong>Web:</strong> {club.website}</div>
            <div><strong>Vytvořeno:</strong> {new Date(club.created_at).toLocaleString('cs-CZ')}</div>
            <div><strong>Správce:</strong> {owner ? `${owner.first_name} ${owner.last_name}` : '-'}</div>
            <div><strong>E-mail správce:</strong> {owner?.email ?? '-'}</div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            {!club.approved && !club.rejected_at && <ClubApprovalActions clubId={club.id} />}
            <DeleteClubButton clubId={club.id} clubName={club.name} />
          </div>
        </section>

        <section className={styles.card}>
          <h2 style={{ marginTop: 0 }}>Členové týmu ({members?.length ?? 0})</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Jméno</th>
                  <th>E-mail</th>
                  <th>Role</th>
                  <th>Admin</th>
                </tr>
              </thead>
              <tbody>
                {(members ?? []).map((m) => (
                  <tr key={m.id}>
                    <td>{m.id}</td>
                    <td>
                      <div className={styles.userCell}>
                        {m.profile_picture ? (
                          <img
                            src={`/uploads/profiles/${m.profile_picture}`}
                            alt={`${m.first_name} ${m.last_name}`}
                            className={styles.userAvatar}
                          />
                        ) : (
                          <div className={styles.userAvatarPlaceholder}>
                            {(m.first_name?.[0] ?? '').toUpperCase()}
                          </div>
                        )}
                        <Link href={`/admin/users/${m.id}`} className={styles.link}>{m.first_name} {m.last_name}</Link>
                      </div>
                    </td>
                    <td>{m.email}</td>
                    <td>{m.role}</td>
                    <td>{m.admin ? 'Ano' : 'Ne'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
