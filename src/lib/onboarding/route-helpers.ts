import { NextResponse } from 'next/server'
import { getCurrentAppUser, type AppClub, type AppUser } from '@/lib/app-context'
import { createAdminClient } from '@/lib/supabase/server'
import { sendTransactionalEmail } from '@/lib/email/send'
import {
  getApplicationForClub,
  getManagedClub,
  type AdminClient,
  type PlayerApplication,
} from '@/lib/onboarding/applications'

type ManagerContext = { user: AppUser; club: AppClub; supabase: AdminClient }

/** Resolves the signed-in club manager, or a ready-made error response. */
export async function requireManager(): Promise<ManagerContext | NextResponse> {
  const user = await getCurrentAppUser()
  if (!user) return NextResponse.json({ error: 'Nejste přihlášen.' }, { status: 401 })

  const club = await getManagedClub(user)
  if (!club) return NextResponse.json({ error: 'Přihlášky může spravovat pouze manažer klubu.' }, { status: 403 })

  const supabase = await createAdminClient()
  return { user, club, supabase }
}

/** Resolves the manager plus an application of their club, or an error response. */
export async function requireManagerApplication(
  rawId: string,
): Promise<(ManagerContext & { app: PlayerApplication }) | NextResponse> {
  const ctx = await requireManager()
  if (ctx instanceof NextResponse) return ctx

  const id = Number.parseInt(rawId, 10)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Neplatné ID přihlášky.' }, { status: 400 })

  const app = await getApplicationForClub(ctx.supabase, ctx.club.id, id)
  if (!app) return NextResponse.json({ error: 'Přihláška nebyla nalezena.' }, { status: 404 })

  return { ...ctx, app }
}

/** Sends an e-mail without failing the request; returns false on error. */
export async function sendEmailQuietly(
  to: string,
  content: { subject: string; html: string; text: string },
  label: string,
) {
  try {
    await sendTransactionalEmail({ to, ...content })
    return true
  } catch (err) {
    console.error(`${label} email error:`, err)
    return false
  }
}
