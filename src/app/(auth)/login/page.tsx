import { redirect } from 'next/navigation'
import { readSessionFromCookies } from '@/lib/auth/session'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const session = await readSessionFromCookies()
  if (session) {
    redirect('/dashboard')
  }

  return <LoginForm />
}
