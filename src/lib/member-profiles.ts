import { createAdminClient } from '@/lib/supabase/server'
import { getClubForUser, type AppUser } from '@/lib/app-context'
import { isParentOf } from '@/lib/parent'

export type MemberProfile = {
  user_id: number
  street: string | null
  city: string | null
  zip: string | null
  health_insurance: string | null
  health_notes: string | null
  emergency_name: string | null
  emergency_phone: string | null
  consent_gdpr_at: string | null
  consent_photos: boolean
  updated_at: string
}

export async function getMemberProfile(userId: number) {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('member_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  return (data as MemberProfile | null) ?? null
}

export type ProfileAccess = { canView: boolean; canEdit: boolean }

/**
 * Health and contact data: the member, their linked parents and the club manager may view and edit;
 * coaches of the same club may view.
 */
export async function getProfileAccess(viewer: AppUser, memberId: number): Promise<ProfileAccess> {
  if (viewer.id === memberId) return { canView: true, canEdit: true }

  if (viewer.role === 'rodič') {
    const linked = await isParentOf(viewer.id, memberId)
    return { canView: linked, canEdit: linked }
  }

  if (viewer.role !== 'manažer' && viewer.role !== 'trenér') return { canView: false, canEdit: false }

  const club = await getClubForUser(viewer)
  if (!club) return { canView: false, canEdit: false }

  const supabase = await createAdminClient()
  const { data: member } = await supabase
    .from('users')
    .select('organization')
    .eq('id', memberId)
    .maybeSingle()

  if (!member || member.organization !== club.name) return { canView: false, canEdit: false }

  const isOwner = viewer.role === 'manažer' && club.owner_user_id === viewer.id
  return { canView: true, canEdit: isOwner }
}
