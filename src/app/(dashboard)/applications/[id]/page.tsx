import DashboardLayout from '@/components/DashboardLayout'
import Topbar from '@/components/Topbar'
import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser, getThemeVars } from '@/lib/app-context'
import { createAdminClient } from '@/lib/supabase/server'
import { getApplicationForClub, getManagedClub } from '@/lib/onboarding/applications'
import { resolveParent } from '@/lib/onboarding/activation'
import { APPLICATION_STATUS_LABELS, formatDate } from '@/lib/onboarding/labels'
import { getAge } from '@/lib/onboarding/validation'
import ApplicationActions from './ApplicationActions'
import styles from '../applications.module.css'

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentAppUser()
  if (!user) redirect('/login')

  const club = await getManagedClub(user)
  if (!club) redirect('/dashboard')

  const appId = Number.parseInt(id, 10)
  if (!Number.isInteger(appId)) notFound()

  const supabase = await createAdminClient()
  const app = await getApplicationForClub(supabase, club.id, appId)
  if (!app) notFound()

  const age = getAge(app.date_birth, new Date(app.created_at))
  const minor = age < 18
  const isOpen = app.status === 'pending_manager' || app.status === 'pending_parent'
  const parentCheck = minor && app.parent_email && isOpen
    ? await resolveParent(supabase, app.parent_email, club.name)
    : null

  return (
    <DashboardLayout user={user} isManager themeVars={getThemeVars(club)}>
      <Topbar title="Přihláška hráče" backHref="/applications" backLabel="Zpět na přihlášky" />

      <div className="app-content">
        <div className="page-intro">
          <div className="page-intro-meta">
            Přihláška · odesláno {formatDate(app.created_at)}
          </div>
          <h2 className="content-title">
            {app.first_name} {app.last_name}
          </h2>
          <p className="content-subtitle">
            <span className={`${styles.status} ${styles[app.status]}`}>{APPLICATION_STATUS_LABELS[app.status]}</span>
            {app.rejection_reason ? ` · ${app.rejection_reason}` : ''}
          </p>
        </div>

        <div className={styles.grid}>
          <div className="section">
            <div className="section-header">
              <h3 className="section-title">Osobní údaje</h3>
            </div>
            <div className="section-content">
              <Row label="Jméno" value={`${app.first_name} ${app.last_name}`} />
              <Row label="Datum narození" value={`${formatDate(app.date_birth)} (${age} let)`} />
              <Row label="E-mail" value={<a href={`mailto:${app.email}`}>{app.email}</a>} />
              <Row label="Telefon" value={app.phone ? <a href={`tel:${app.phone}`}>{app.phone}</a> : '–'} />
              <Row label="Adresa" value={`${app.street}, ${app.zip} ${app.city}`} />
            </div>
          </div>

          <div className="section">
            <div className="section-header">
              <h3 className="section-title">Zdraví</h3>
            </div>
            <div className="section-content">
              <Row label="Zdravotní pojišťovna" value={app.health_insurance} />
              <Row
                label="Alergie a omezení"
                value={<span className={styles.healthNotes}>{app.health_notes || 'Neuvedeno'}</span>}
              />
              <Row label="Souhlas GDPR" value={app.consent_gdpr ? 'Ano' : 'Ne'} />
              <Row label="Souhlas s fotografiemi" value={app.consent_photos ? 'Ano' : 'Ne'} />
            </div>
          </div>

          {minor ? (
            <div className={`section ${isOpen ? styles.highlight : ''}`}>
              <div className="section-header">
                <h3 className="section-title">Zákonný zástupce</h3>
                <p className="section-description">Hráč je nezletilý. Ověřte, že e-mail patří rodiči.</p>
              </div>
              <div className="section-content">
                <Row label="Jméno" value={`${app.parent_first_name ?? ''} ${app.parent_last_name ?? ''}`} />
                <Row label="E-mail" value={<strong>{app.parent_email}</strong>} />
                <Row label="Telefon" value={app.parent_phone ? <a href={`tel:${app.parent_phone}`}>{app.parent_phone}</a> : '–'} />
              </div>
            </div>
          ) : (
            <div className="section">
              <div className="section-header">
                <h3 className="section-title">Kontakt pro případ nouze</h3>
              </div>
              <div className="section-content">
                <Row label="Jméno" value={app.emergency_name ?? '–'} />
                <Row label="Telefon" value={app.emergency_phone ? <a href={`tel:${app.emergency_phone}`}>{app.emergency_phone}</a> : '–'} />
              </div>
            </div>
          )}

          {isOpen && (
            <div className="section">
              <div className="section-header">
                <h3 className="section-title">Rozhodnutí</h3>
              </div>
              <div className="section-content">
                <ApplicationActions
                  applicationId={app.id}
                  status={app.status}
                  minor={minor}
                  parentEmail={app.parent_email}
                  parentCheck={parentCheck}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="data-row">
      <span className="data-label">{label}</span>
      <span className="data-value">{value}</span>
    </div>
  )
}
