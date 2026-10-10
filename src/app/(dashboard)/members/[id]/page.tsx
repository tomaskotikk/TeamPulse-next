import DashboardLayout from '@/components/DashboardLayout'
import Topbar from '@/components/Topbar'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  type AppUser,
  getClubForUser,
  getCurrentAppUser,
  getMembersForClub,
  getThemeVars,
} from '@/lib/app-context'
import { createAdminClient } from '@/lib/supabase/server'
import RemoveMemberButton from '@/components/RemoveMemberButton'
import MemberRoleEditor from '@/components/MemberRoleEditor'
import MemberBirthDateEditor from '@/components/MemberBirthDateEditor'
import { getMemberProfile, getProfileAccess } from '@/lib/member-profiles'
import { getParentsForChild } from '@/lib/parent'

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const memberId = parseInt(id, 10)

  const user = await getCurrentAppUser()
  if (!user) notFound()

  const club = await getClubForUser(user)
  if (!club) notFound()

  const members = await getMembersForClub(club.name)
  const themeVars = getThemeVars(club)
  const isManager = user.role === 'manažer'

  // Přesměrování na vlastní profil
  if (memberId === user.id) {
    redirect('/profile')
  }

  const member = members.find((m) => m.id === memberId)
  if (!member) notFound()

  // Ověřit, že je ve stejném klubu
  if (member.organization !== club.name) notFound()

  const supabase = await createAdminClient()
  const { data: catMemberships } = await supabase
    .from('category_members')
    .select('club_categories(id, name, color, club_id)')
    .eq('user_id', memberId)
    .eq('excluded', false)

  type CatRow = { id: number; name: string; color: string; club_id: number }
  const memberCategory = (catMemberships ?? [])
    .map((m) => {
      const cat = m.club_categories as CatRow | CatRow[] | null
      if (!cat || Array.isArray(cat)) return null
      return cat
    })
    .find((c): c is CatRow => c !== null && c.club_id === club.id) ?? null

  const profileAccess = await getProfileAccess(user, memberId)
  const [memberProfile, memberParents] = profileAccess.canView
    ? await Promise.all([getMemberProfile(memberId), getParentsForChild(memberId)])
    : [null, []]

  const mInitials =
    (member.first_name?.[0] ?? '').toUpperCase() +
    (member.last_name?.[0] ?? '').toUpperCase()

  return (
    <DashboardLayout user={user} isManager={isManager} themeVars={themeVars}>
      <Topbar title="Profil člena" backHref="/members" backLabel="Zpět na členy" />

      <div className="app-content">
        <Link href="/members" className="mobile-back-link" aria-label="Zpět na členy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Zpět na členy
        </Link>

        <div className="page-intro">
          <div className="page-intro-meta">Detail člena</div>
          <h2 className="content-title">
            {member.first_name} {member.last_name}
          </h2>
          <p className="content-subtitle">Detaily profilu člena</p>
        </div>

        <div className="profile-mobile-hub">
          <div className="profile-mobile-hub-top">
            <div className="profile-mobile-hub-banner">
              <div className="profile-mobile-hub-banner-noise" aria-hidden="true" />
            </div>

            <div className="profile-mobile-hub-avatar-wrap">
              {member.profile_picture ? (
                <img src={`/uploads/profiles/${member.profile_picture}`} alt={`Profil člena ${member.first_name} ${member.last_name}`} className="profile-mobile-hub-avatar" />
              ) : (
                <div className="profile-mobile-hub-avatar-fallback">{mInitials || 'U'}</div>
              )}
            </div>

            <div className="profile-mobile-hub-info">
              <div className="profile-mobile-hub-name">{member.first_name} {member.last_name}</div>
              <div className="profile-mobile-hub-meta">{member.role} • {member.organization ?? 'Bez klubu'}</div>
            </div>
          </div>
        </div>

        <section className="section profile-discord-card">
          <div className="profile-discord-banner">
            <div className="profile-discord-banner-noise" aria-hidden="true" />
            <div className="profile-discord-club-logo-wrap">
              {club.logo ? (
                <img src={`/uploads/clubs/${club.logo}`} alt={`Logo klubu ${club.name}`} className="profile-discord-club-logo" />
              ) : (
                <img src="/tp-logo.png" alt="TeamPulse" className="profile-discord-club-logo profile-discord-club-logo-fallback" />
              )}
            </div>
          </div>

          <div className="profile-discord-body">
            <div className="profile-discord-layout">
              <div className="profile-discord-left">
                <div className="profile-discord-avatar-wrap">
                  {member.profile_picture ? (
                    <img src={`/uploads/profiles/${member.profile_picture}`} alt={`Profil člena ${member.first_name} ${member.last_name}`} className="profile-discord-avatar" />
                  ) : (
                    <div className="profile-discord-avatar-fallback">{mInitials || 'U'}</div>
                  )}
                </div>

                <div className="profile-discord-identity">
                  <div className="profile-discord-role">{member.role || 'Uživatel'}</div>
                  <h3 className="profile-discord-name">{member.first_name} {member.last_name}</h3>
                  <p className="profile-discord-club">{member.organization ?? 'Bez klubu'}</p>
                </div>
              </div>

              <div className="profile-discord-right">
                <div className="profile-discord-params-title">Parametry účtu</div>
                <div className="profile-discord-meta-grid">
                  <div className="profile-discord-meta-item">
                    <span>Datum narození</span>
                    <strong>
                      {(member as AppUser & { dateBirth?: string | null }).dateBirth
                        ? new Date((member as AppUser & { dateBirth?: string | null }).dateBirth!).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
                        : '–'}
                    </strong>
                  </div>
                  <div className="profile-discord-meta-item">
                    <span>Kategorie</span>
                    <strong>{memberCategory?.name ?? '–'}</strong>
                  </div>
                  <div className="profile-discord-meta-item">
                    <span>Klub</span>
                    <strong>{member.organization ?? 'Bez klubu'}</strong>
                  </div>
                  <div className="profile-discord-meta-item">
                    <span>E-mail</span>
                    <strong>{member.email}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {profileAccess.canView && (memberProfile || memberParents.length > 0) && (
          <div className="section">
            <div className="section-header">
              <h3 className="section-title">Zdraví a kontakty</h3>
              <p className="section-description">Vidí jen vedení klubu, trenéři a rodiče.</p>
            </div>
            <div className="section-content">
              {memberProfile && (
                <>
                  <div className="data-row">
                    <span className="data-label">Adresa</span>
                    <span className="data-value">
                      {memberProfile.street ? `${memberProfile.street}, ${memberProfile.zip ?? ''} ${memberProfile.city ?? ''}` : '–'}
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="data-label">Zdravotní pojišťovna</span>
                    <span className="data-value">{memberProfile.health_insurance ?? '–'}</span>
                  </div>
                  <div className="data-row">
                    <span className="data-label">Alergie a omezení</span>
                    <span className="data-value" style={{ whiteSpace: 'pre-wrap' }}>{memberProfile.health_notes || 'Neuvedeno'}</span>
                  </div>
                  {memberProfile.emergency_name && (
                    <div className="data-row">
                      <span className="data-label">Nouzový kontakt</span>
                      <span className="data-value">
                        {memberProfile.emergency_name}
                        {memberProfile.emergency_phone ? <> · <a href={`tel:${memberProfile.emergency_phone}`}>{memberProfile.emergency_phone}</a></> : null}
                      </span>
                    </div>
                  )}
                  <div className="data-row">
                    <span className="data-label">Souhlas s fotografiemi</span>
                    <span className="data-value">{memberProfile.consent_photos ? 'Ano' : 'Ne'}</span>
                  </div>
                </>
              )}
              {memberParents.map((p) => (
                <div className="data-row" key={p.id}>
                  <span className="data-label">Rodič</span>
                  <span className="data-value">
                    {p.first_name} {p.last_name} · <a href={`mailto:${p.email}`}>{p.email}</a>
                    {p.phone ? <> · <a href={`tel:${p.phone}`}>{p.phone}</a></> : null}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="section">
          <div className="section-header">
            <h3 className="section-title">Osobní údaje</h3>
          </div>
          <div className="section-content">
            <div className="data-row">
              <span className="data-label">Jméno</span>
              <span className="data-value">{member.first_name} {member.last_name}</span>
            </div>
            <div className="data-row">
              <span className="data-label">E-mail</span>
              <span className="data-value">
                <a href={`mailto:${member.email}`}>
                  {member.email}
                </a>
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Telefon</span>
              <span className="data-value">
                {member.phone ? (
                  <a href={`tel:${member.phone}`}>
                    {member.phone}
                  </a>
                ) : '–'}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Role</span>
              <span className="data-value">{member.role}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Klub</span>
              <span className="data-value">{member.organization ?? '–'}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Člen od</span>
              <span className="data-value">
                {member.created_at
                  ? new Date(member.created_at).toLocaleDateString('cs-CZ', {
                      day: 'numeric',
                      month: 'numeric',
                      year: 'numeric',
                    })
                  : '–'}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Datum narození</span>
              {isManager ? (
                <MemberBirthDateEditor
                  memberId={member.id}
                  initialDateBirth={(member as AppUser & { dateBirth?: string | null }).dateBirth ?? null}
                />
              ) : (
                <span className="data-value">
                  {(member as AppUser & { dateBirth?: string | null }).dateBirth
                    ? new Date((member as AppUser & { dateBirth?: string | null }).dateBirth!).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
                    : '–'}
                </span>
              )}
            </div>
            <div className="data-row">
              <span className="data-label">Kategorie</span>
              <span className="data-value">{memberCategory?.name ?? '–'}</span>
            </div>
          </div>
        </div>

        {/* Akce manažera */}
        {isManager && (
          <div className="section">
            <div className="section-header">
              <h3 className="section-title">Správa člena</h3>
              <p className="section-description">Akce dostupné pro manažera</p>
            </div>
            <div className="section-content" style={{ display: 'grid', gap: 16 }}>
              <div>
                <div className="form-help" style={{ marginBottom: 8 }}>Role člena</div>
                <MemberRoleEditor
                  memberId={member.id}
                  initialRole={member.role}
                  disabled={member.role === 'manažer'}
                />
              </div>
              <RemoveMemberButton
                memberId={member.id}
                memberName={`${member.first_name} ${member.last_name}`}
                disabled={member.role === 'manažer'}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
