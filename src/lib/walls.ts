import { createAdminClient } from '@/lib/supabase/server'
import type { AppClub, AppUser } from '@/lib/app-context'
import { canManageAttendance } from '@/lib/attendance'

export type WallCategory = { id: number; name: string; color: string; birth_year_from: number | null; birth_year_to: number | null }

/** Categories whose wall the viewer may open: staff see all, others their (or their child's) categories. */
export async function getAccessibleCategories(user: AppUser, club: AppClub, memberId: number | null) {
  const supabase = await createAdminClient()
  const { data: cats } = await supabase
    .from('club_categories')
    .select('id, name, color, birth_year_from, birth_year_to')
    .eq('club_id', club.id)
    .order('sort_order', { ascending: true })
  const all = (cats ?? []) as WallCategory[]
  if (canManageAttendance(user)) return all
  if (!memberId || all.length === 0) return []

  const { data: memberships } = await supabase
    .from('category_members')
    .select('category_id')
    .eq('user_id', memberId)
    .eq('excluded', false)
    .in('category_id', all.map((c) => c.id))
  const mine = new Set((memberships ?? []).map((m: { category_id: number }) => m.category_id))
  return all.filter((c) => mine.has(c.id))
}

export async function getAccessibleCategory(user: AppUser, club: AppClub, memberId: number | null, categoryId: number) {
  return (await getAccessibleCategories(user, club, memberId)).find((c) => c.id === categoryId) ?? null
}
