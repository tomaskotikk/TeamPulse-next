import AdminPanelClient from '@/components/AdminPanelClient'
import { requireAdminUser } from '@/lib/auth/admin-page'
import { createAdminClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const admin = await requireAdminUser('/admin/login')
  const supabase = await createAdminClient()

  const [{ data: clubsRaw }, { data: usersRaw }] = await Promise.all([
    supabase
      .from('clubs')
      .select('id, name, city, sport, club_email, club_phone, website, approved, rejected_at, rejection_reason, created_at, owner_user_id')
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, first_name, last_name, email, role, organization, admin, profile_picture, banned, banned_at, ban_reason, created_at')
      .order('created_at', { ascending: false })
      .limit(1000),
  ])

  return <AdminPanelClient admin={admin} clubs={clubsRaw ?? []} users={usersRaw ?? []} />
}
