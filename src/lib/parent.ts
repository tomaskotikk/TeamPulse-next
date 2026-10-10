import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'

export const SELECTED_CHILD_COOKIE = 'tp_child'

export type ParentChild = {
  id: number
  first_name: string
  last_name: string
  profile_picture: string | null
  dateBirth: string | null
  email: string
  phone: string | null
}

export async function getChildrenForParent(parentId: number): Promise<ParentChild[]> {
  const supabase = await createAdminClient()
  const { data: links } = await supabase
    .from('parent_children')
    .select('child_user_id')
    .eq('parent_user_id', parentId)

  const ids = (links ?? []).map((l: { child_user_id: number }) => l.child_user_id)
  if (ids.length === 0) return []

  const { data } = await supabase
    .from('users')
    .select('id, first_name, last_name, profile_picture, dateBirth, email, phone')
    .in('id', ids)
    .order('first_name', { ascending: true })

  return (data ?? []) as ParentChild[]
}

export async function getParentsForChild(childId: number) {
  const supabase = await createAdminClient()
  const { data: links } = await supabase
    .from('parent_children')
    .select('parent_user_id')
    .eq('child_user_id', childId)

  const ids = (links ?? []).map((l: { parent_user_id: number }) => l.parent_user_id)
  if (ids.length === 0) return []

  const { data } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, phone')
    .in('id', ids)

  return (data ?? []) as Array<{ id: number; first_name: string; last_name: string; email: string; phone: string | null }>
}

export async function isParentOf(parentId: number, childId: number) {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('parent_children')
    .select('child_user_id')
    .eq('parent_user_id', parentId)
    .eq('child_user_id', childId)
    .maybeSingle()

  return Boolean(data)
}

/** Picks the child stored in the selection cookie, falling back to the first child. */
export async function getSelectedChild(children: ParentChild[]) {
  if (children.length === 0) return null
  const cookieStore = await cookies()
  const selectedId = Number(cookieStore.get(SELECTED_CHILD_COOKIE)?.value)
  return children.find((c) => c.id === selectedId) ?? children[0]
}
