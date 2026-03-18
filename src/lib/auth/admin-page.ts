import { redirect } from 'next/navigation'
import { getCurrentAdminUser } from '@/lib/auth/admin'

export async function requireAdminUser(redirectTo = '/admin/login') {
  const adminUser = await getCurrentAdminUser()
  if (!adminUser) {
    redirect(redirectTo)
  }

  return adminUser
}
