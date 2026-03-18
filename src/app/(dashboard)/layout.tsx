import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { readSessionFromCookies } from '@/lib/auth/session'
import { getCurrentAppUser, getClubForUser, getThemeVars } from '@/lib/app-context'

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

  // Inject theme CSS variables before any React hydration so there is no color flash
  const appUser = await getCurrentAppUser()
  const club = appUser ? await getClubForUser(appUser) : null

  if (appUser?.banned) {
    redirect('/api/auth/logout')
  }

  if (appUser?.role === 'manažer' && club && !club.approved) {
    redirect('/awaiting-approval')
  }

  const themeVars = getThemeVars(club)
  const themeCss = `.app-layout{${Object.entries(themeVars).map(([k, v]) => `${k}:${v}`).join(';')}}`

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      {children}
    </>
  )
}
