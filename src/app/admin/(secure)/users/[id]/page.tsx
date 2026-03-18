import Link from 'next/link'
import { notFound } from 'next/navigation'
import UserModerationActions from '@/components/UserModerationActions'
import { requireAdminUser } from '@/lib/auth/admin-page'
import { createAdminClient } from '@/lib/supabase/server'
import styles from '@/app/admin/(secure)/detail.module.css'

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser('/admin/login')

  const { id } = await params
  const userId = Number(id)
  if (!Number.isFinite(userId) || userId <= 0) notFound()

  const supabase = await createAdminClient()

  const { data: user } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, role, organization, admin, profile_picture, banned, banned_at, ban_reason, created_at')
    .eq('id', userId)
    .maybeSingle()

  if (!user) notFound()

  const { data: club } = user.organization
    ? await supabase
        .from('clubs')
        .select('id, name, approved')
        .eq('name', user.organization)
        .maybeSingle()
    : { data: null }

  const { data: usersOrdered } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .order('id', { ascending: true })
    .limit(2000)

  const users = usersOrdered ?? []
  const currentIndex = users.findIndex((u) => u.id === user.id)
  const prevUser = currentIndex > 0 ? users[currentIndex - 1] : null
  const nextUser = currentIndex >= 0 && currentIndex < users.length - 1 ? users[currentIndex + 1] : null

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/admin" className={styles.back}>← Zpět do admin panelu</Link>

        <section className={styles.card}>
          <div className={styles.profileHead}>
            {user.profile_picture ? (
              <img
                src={`/uploads/profiles/${user.profile_picture}`}
                alt={`${user.first_name} ${user.last_name}`}
                className={styles.profileAvatar}
              />
            ) : (
              <div className={styles.profileAvatarPlaceholder}>
                {(user.first_name?.[0] ?? '').toUpperCase()}
              </div>
            )}
            <div>
          <h1 className={styles.title}>{user.first_name} {user.last_name}</h1>
          <div className={styles.sub}>{user.email}</div>
            </div>
          </div>

          <div className={styles.grid} style={{ marginTop: 14 }}>
            <div><strong>ID:</strong> {user.id}</div>
            <div><strong>Role:</strong> {user.role}</div>
            <div><strong>Admin:</strong> {user.admin ? 'Ano' : 'Ne'}</div>
            <div><strong>Registrován:</strong> {new Date(user.created_at).toLocaleString('cs-CZ')}</div>
            <div><strong>Klub:</strong> {user.organization ?? '-'}</div>
            <div>
              <strong>Detail klubu:</strong>{' '}
              {club ? <Link href={`/admin/clubs/${club.id}`} className={styles.link}>{club.name}</Link> : '-'}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <UserModerationActions
              userId={user.id}
              disabled={user.admin && user.id === admin.id}
            />
          </div>

          <div className={styles.navRow}>
            {prevUser ? (
              <Link href={`/admin/users/${prevUser.id}`} className={styles.navBtn}>
                ← {prevUser.first_name} {prevUser.last_name}
              </Link>
            ) : (
              <div className={styles.navMuted}>← Předchozí není</div>
            )}

            {nextUser ? (
              <Link href={`/admin/users/${nextUser.id}`} className={styles.navBtn}>
                {nextUser.first_name} {nextUser.last_name} →
              </Link>
            ) : (
              <div className={styles.navMuted}>Další není →</div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
