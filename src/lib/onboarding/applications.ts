import { createAdminClient } from '@/lib/supabase/server'
import { getClubForUser, type AppClub, type AppUser } from '@/lib/app-context'

export type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

/** Escapes LIKE wildcards so `.ilike()` performs a case-insensitive exact match. */
export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

export type ApplicationStatus = 'pending_manager' | 'pending_parent' | 'completed' | 'rejected'

export const OPEN_STATUSES: ApplicationStatus[] = ['pending_manager', 'pending_parent']

export type PlayerApplication = {
  id: number
  club_id: number
  invitation_id: number | null
  email: string
  password_hash: string
  first_name: string
  last_name: string
  date_birth: string
  phone: string | null
  street: string
  city: string
  zip: string
  health_insurance: string
  health_notes: string | null
  emergency_name: string | null
  emergency_phone: string | null
  parent_first_name: string | null
  parent_last_name: string | null
  parent_email: string | null
  parent_phone: string | null
  consent_gdpr: boolean
  consent_photos: boolean
  status: ApplicationStatus
  rejection_reason: string | null
  reviewed_by: number | null
  reviewed_at: string | null
  player_user_id: number | null
  created_at: string
  updated_at: string
}

/** Columns safe to send to the browser (no password hash). */
export const PUBLIC_APPLICATION_COLUMNS =
  'id, club_id, email, first_name, last_name, date_birth, phone, street, city, zip, health_insurance, health_notes, emergency_name, emergency_phone, parent_first_name, parent_last_name, parent_email, parent_phone, consent_gdpr, consent_photos, status, rejection_reason, reviewed_at, created_at'

export type PublicApplication = Omit<PlayerApplication, 'password_hash' | 'invitation_id' | 'reviewed_by' | 'player_user_id' | 'updated_at'>

/** Returns the club when the user is its owner (manager), otherwise null. */
export async function getManagedClub(user: AppUser | null): Promise<AppClub | null> {
  if (!user || user.role !== 'manažer') return null
  const club = await getClubForUser(user)
  if (!club || club.owner_user_id !== user.id) return null
  return club
}

export async function getApplicationForClub(supabase: AdminClient, clubId: number, id: number) {
  const { data } = await supabase
    .from('player_applications')
    .select('*')
    .eq('id', id)
    .eq('club_id', clubId)
    .maybeSingle()

  return (data as PlayerApplication | null) ?? null
}

export async function listApplicationsForClub(supabase: AdminClient, clubId: number) {
  const { data } = await supabase
    .from('player_applications')
    .select(PUBLIC_APPLICATION_COLUMNS)
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .limit(100)

  return (data ?? []) as PublicApplication[]
}

export async function countPendingForClub(supabase: AdminClient, clubId: number) {
  const { count } = await supabase
    .from('player_applications')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubId)
    .eq('status', 'pending_manager')

  return count ?? 0
}

export async function findOpenApplicationByEmail(supabase: AdminClient, email: string) {
  const { data } = await supabase
    .from('player_applications')
    .select('id, status, club_id')
    .ilike('email', escapeLike(email))
    .in('status', OPEN_STATUSES)
    .limit(1)
    .maybeSingle()

  return (data as { id: number; status: ApplicationStatus; club_id: number } | null) ?? null
}

export async function findLatestApplicationByEmail(supabase: AdminClient, email: string) {
  const { data } = await supabase
    .from('player_applications')
    .select('id, status, password_hash')
    .ilike('email', escapeLike(email))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as { id: number; status: ApplicationStatus; password_hash: string } | null) ?? null
}

export function toPublicApplication(app: PlayerApplication): PublicApplication {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, invitation_id, reviewed_by, player_user_id, updated_at, ...rest } = app
  return rest
}
