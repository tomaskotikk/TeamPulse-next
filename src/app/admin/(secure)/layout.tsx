import { requireAdminUser } from '@/lib/auth/admin-page'

export default async function AdminSecureLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminUser('/admin/login')
  return children
}
