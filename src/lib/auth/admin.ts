import { readSessionFromCookies } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/server'

export type AdminUser = {
  id: number
  email: string
  first_name: string
  last_name: string
  admin: boolean
}

export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  const session = await readSessionFromCookies()
  if (!session?.userId) return null

  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, admin')
    .eq('id', session.userId)
    .eq('admin', true)
    .eq('banned', false)
    .maybeSingle()

  return (data as AdminUser | null) ?? null
}
