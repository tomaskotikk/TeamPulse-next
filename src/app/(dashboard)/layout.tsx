import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { readSessionFromCookies } from '@/lib/auth/session'

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const session = await readSessionFromCookies()

  if (!user && !session) {
    redirect('/login')
  }

  return <>{children}</>
}
