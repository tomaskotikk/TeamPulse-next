import DashboardLayout from '@/components/DashboardLayout'
import Topbar from '@/components/Topbar'
import { redirect } from 'next/navigation'
import { getClubForUser, getCurrentAppUser, getThemeVars } from '@/lib/app-context'
import { createAdminClient } from '@/lib/supabase/server'
import { canManageAttendance } from '@/lib/attendance'
import AttendanceMatrix from './AttendanceMatrix'

export default async function AttendancePage() {
  const user = await getCurrentAppUser()
  if (!user) redirect('/login')
  if (!canManageAttendance(user)) redirect('/dashboard')

  const club = await getClubForUser(user)
  if (!club) redirect('/dashboard')

  const supabase = await createAdminClient()
  const { data: categories } = await supabase
    .from('club_categories')
    .select('id, name, color')
    .eq('club_id', club.id)
    .order('sort_order', { ascending: true })

  return (
    <DashboardLayout user={user} isManager={user.role === 'manažer'} themeVars={getThemeVars(club)}>
      <Topbar title="Docházka" />
      <div className="app-content">
        <div className="page-intro">
          <div className="page-intro-meta">Tréninky a zápasy</div>
          <h2 className="content-title">Docházka</h2>
          <p className="content-subtitle">
            Odpovědi hráčů a zapsaná skutečnost. Procento počítá přítomné z přítomných a neomluvených.
          </p>
        </div>
        <AttendanceMatrix categories={(categories ?? []) as Array<{ id: number; name: string; color: string }>} />
      </div>
    </DashboardLayout>
  )
}
