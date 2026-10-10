import { fullResyncCategories } from '@/app/api/categories/route'
import { escapeLike, type AdminClient, type ApplicationStatus, type PlayerApplication } from '@/lib/onboarding/applications'

export const PARENT_INVITATION_DAYS = 7

/** Error whose message is safe to show to the user. */
export class ActivationError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message)
  }
}

export function generateToken() {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
}

export type ParentResolution =
  | { kind: 'new' }
  | { kind: 'existing'; userId: number; firstName: string; email: string }
  | { kind: 'conflict'; reason: string }

/** Decides whether the parent e-mail belongs to a new parent, an existing parent in this club, or a conflicting account. */
export async function resolveParent(supabase: AdminClient, parentEmail: string, clubName: string): Promise<ParentResolution> {
  const { data } = await supabase
    .from('users')
    .select('id, first_name, email, role, organization')
    .ilike('email', escapeLike(parentEmail))
    .maybeSingle()

  if (!data) return { kind: 'new' }

  const existing = data as { id: number; first_name: string; email: string; role: string; organization: string | null }
  if (existing.role === 'rodič' && existing.organization === clubName) {
    return { kind: 'existing', userId: existing.id, firstName: existing.first_name, email: existing.email }
  }

  if (existing.role !== 'rodič') {
    return { kind: 'conflict', reason: `E-mail rodiče už používá účet s rolí „${existing.role}“. Zadejte jiný e-mail rodiče.` }
  }
  return { kind: 'conflict', reason: 'E-mail rodiče patří rodiči z jiného klubu. Zadejte jiný e-mail rodiče.' }
}

export type ParentForActivation =
  | { kind: 'none' }
  | { kind: 'existing'; userId: number }
  | { kind: 'new'; phone: string; passwordHash: string }

/**
 * Creates the player account (and optionally the parent account + link), resyncs categories
 * and marks the application completed. supabase-js has no transactions, so every created
 * row is deleted again if a later step fails.
 */
export async function activateApplication(
  supabase: AdminClient,
  app: PlayerApplication,
  clubName: string,
  expectedStatus: ApplicationStatus,
  parent: ParentForActivation,
): Promise<{ playerUserId: number; parentUserId: number | null }> {
  // Claim the application first so two concurrent approvals cannot both activate it.
  const { data: claimed } = await supabase
    .from('player_applications')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', app.id)
    .eq('status', expectedStatus)
    .select('id')
    .maybeSingle()

  if (!claimed) throw new ActivationError('Přihláška už byla zpracována.', 409)

  const createdUserIds: number[] = []
  let playerUserId = 0
  let parentUserId: number | null = null

  const rollback = async () => {
    let cleanupFailed = false
    for (const id of [...createdUserIds].reverse()) {
      // member_profiles, parent_children and category_members cascade with the user row
      const { error } = await supabase.from('users').delete().eq('id', id)
      if (error) {
        cleanupFailed = true
        console.error(`Activation rollback: failed to delete user ${id}`, error)
      }
    }

    if (cleanupFailed) {
      // A leftover account exists; keep the application 'completed' so it is not retried into a duplicate.
      console.error(`Activation rollback incomplete for application ${app.id}; manual check needed.`)
      return
    }

    await supabase
      .from('player_applications')
      .update({ status: expectedStatus, player_user_id: null })
      .eq('id', app.id)
  }

  try {
    const { data: taken } = await supabase
      .from('users')
      .select('id')
      .ilike('email', escapeLike(app.email))
      .maybeSingle()

    if (taken) throw new ActivationError('Účet s e-mailem hráče už existuje.', 409)

    const { data: player, error: playerError } = await supabase
      .from('users')
      .insert({
        first_name: app.first_name,
        last_name: app.last_name,
        email: app.email,
        phone: app.phone,
        dateBirth: app.date_birth,
        password_hash: app.password_hash,
        role: 'hráč',
        organization: clubName,
      })
      .select('id')
      .single()

    if (playerError || !player) throw new Error(`player insert: ${playerError?.message}`)
    createdUserIds.push(player.id)
    playerUserId = player.id

    const { error: profileError } = await supabase.from('member_profiles').insert({
      user_id: player.id,
      street: app.street,
      city: app.city,
      zip: app.zip,
      health_insurance: app.health_insurance,
      health_notes: app.health_notes,
      emergency_name: app.emergency_name,
      emergency_phone: app.emergency_phone,
      consent_gdpr_at: app.created_at,
      consent_photos: app.consent_photos,
    })
    if (profileError) throw new Error(`profile insert: ${profileError.message}`)

    if (parent.kind === 'new') {
      const { data: parentRow, error: parentError } = await supabase
        .from('users')
        .insert({
          first_name: app.parent_first_name,
          last_name: app.parent_last_name,
          email: app.parent_email,
          phone: parent.phone,
          password_hash: parent.passwordHash,
          role: 'rodič',
          organization: clubName,
        })
        .select('id')
        .single()

      if (parentError || !parentRow) throw new Error(`parent insert: ${parentError?.message}`)
      createdUserIds.push(parentRow.id)
      parentUserId = parentRow.id
    } else if (parent.kind === 'existing') {
      parentUserId = parent.userId
    }

    if (parentUserId) {
      const { error: linkError } = await supabase.from('parent_children').insert({
        parent_user_id: parentUserId,
        child_user_id: player.id,
        club_id: app.club_id,
      })
      if (linkError) throw new Error(`link insert: ${linkError.message}`)
    }

    const { error: finishError } = await supabase
      .from('player_applications')
      .update({ player_user_id: player.id })
      .eq('id', app.id)
    if (finishError) throw new Error(`application update: ${finishError.message}`)
  } catch (err) {
    await rollback()
    throw err
  }

  // Accounts are complete at this point; a category resync failure must not undo them.
  try {
    await fullResyncCategories(supabase, app.club_id, clubName)
  } catch (resyncErr) {
    console.error('Category resync after activation failed:', resyncErr)
  }

  return { playerUserId, parentUserId }
}

/** Invalidates previous parent invitations for the application and creates a fresh one. */
export async function createParentInvitation(supabase: AdminClient, applicationId: number, email: string) {
  await supabase
    .from('parent_invitations')
    .update({ used: true })
    .eq('application_id', applicationId)
    .eq('used', false)

  const token = generateToken()
  const expiresAt = new Date(Date.now() + PARENT_INVITATION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('parent_invitations')
    .insert({ token, application_id: applicationId, email, expires_at: expiresAt, used: false })
    .select('id')
    .single()

  if (error || !data) throw new Error(`parent invitation insert: ${error?.message}`)
  return { id: data.id as number, token }
}
