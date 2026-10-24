import { createAdminClient } from '@/lib/supabase/server'
import type { AppClub } from '@/lib/app-context'
import { getUpcomingEventsForMember } from '@/lib/attendance'
import { getMemberProfile } from '@/lib/member-profiles'
import type { ParentChild } from '@/lib/parent'
import { formatDate } from '@/lib/onboarding/labels'
import { getAge } from '@/lib/onboarding/validation'
import ChildSwitcher from './ChildSwitcher'
import ChildProfileForm from './ChildProfileForm'
import styles from './parent.module.css'

const EVENT_TYPE_LABELS: Record<string, string> = {
  training: 'Trénink',
  match: 'Zápas',
  meeting: 'Schůzka',
  event: 'Akce',
}

async function getMemberCategoryName(memberId: number, clubId: number) {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('category_members')
    .select('club_categories(name, club_id)')
    .eq('user_id', memberId)
    .eq('excluded', false)

  type Row = { name: string; club_id: number }
  for (const row of data ?? []) {
    const cat = row.club_categories as Row | Row[] | null
    const value = Array.isArray(cat) ? cat[0] : cat
    if (value && value.club_id === clubId) return value.name
  }
  return null
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
}

type Props = {
  parentFirstName: string
  club: AppClub
  items: ParentChild[]
  selected: ParentChild | null
}

export default async function ParentOverview({ parentFirstName, club, items, selected }: Props) {
  const clubId = club.id
  const clubName = club.name
  if (!selected) {
    return (
      <div className="section">
        <div className="section-content">
          <div className="empty-state">
            <div className="empty-title">Zatím nemáte propojené žádné dítě</div>
            <div className="empty-description">
              Dítě se k vašemu účtu připojí, jakmile klub schválí jeho přihlášku.
            </div>
          </div>
        </div>
      </div>
    )
  }

  const [events, profile, categoryName] = await Promise.all([
    getUpcomingEventsForMember(club, selected.id),
    getMemberProfile(selected.id),
    getMemberCategoryName(selected.id, clubId),
  ])

  const age = selected.dateBirth ? getAge(selected.dateBirth) : null

  return (
    <>
      <div className="page-intro">
        <div className="page-intro-meta">{clubName}</div>
        <h2 className="content-title">Dobrý den, {parentFirstName}</h2>
        <p className="content-subtitle">Přehled tréninků, zápasů a údajů vašeho dítěte.</p>
      </div>

      {items.length > 1 && <ChildSwitcher items={items} selectedId={selected.id} />}

      <div className={styles.grid}>
        <div className={styles.stack}>
          <section className="section">
            <div className="section-header">
              <h3 className="section-title">Nadcházející program · {selected.first_name}</h3>
            </div>
            <div className="section-content">
              {events.length === 0 ? (
                <p className={styles.empty}>Žádné naplánované tréninky ani zápasy.</p>
              ) : (
                <ul className={styles.events}>
                  {events.map((ev) => {
                    const start = new Date(ev.starts_at)
                    return (
                      <li key={ev.id} className={styles.event}>
                        <div className={styles.date} aria-hidden="true">
                          <strong>{start.getDate()}</strong>
                          <span>{start.toLocaleDateString('cs-CZ', { month: 'short' })}</span>
                        </div>
                        <div>
                          <div className={styles.eventTitle}>
                            <span className={styles.type}>{EVENT_TYPE_LABELS[ev.type] ?? 'Akce'}</span>
                            {ev.title}
                          </div>
                          <div className={styles.eventMeta}>
                            {start.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })}
                            {ev.all_day ? ' · celý den' : ` · ${formatTime(ev.starts_at)}${ev.ends_at ? `–${formatTime(ev.ends_at)}` : ''}`}
                            {ev.location ? ` · ${ev.location}` : ''}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>

          <section className="section">
            <div className="section-header">
              <div>
                <h3 className="section-title">Kontakty a zdraví</h3>
                <p className="section-description">Údaje vidí jen trenéři a vedení klubu.</p>
              </div>
            </div>
            <div className="section-content">
              <ChildProfileForm key={selected.id} memberId={selected.id} profile={profile} showEmergency={false} />
            </div>
          </section>
        </div>

        <div className={styles.stack}>
          <section className="section">
            <div className="section-header">
              <h3 className="section-title">Hráč</h3>
            </div>
            <div className="section-content">
              <div className="data-row">
                <span className="data-label">Jméno</span>
                <span className="data-value">{selected.first_name} {selected.last_name}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Datum narození</span>
                <span className="data-value">
                  {formatDate(selected.dateBirth)}{age !== null ? ` (${age} let)` : ''}
                </span>
              </div>
              <div className="data-row">
                <span className="data-label">Kategorie</span>
                <span className="data-value">{categoryName ?? '–'}</span>
              </div>
              <div className="data-row">
                <span className="data-label">E-mail</span>
                <span className="data-value">{selected.email}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Telefon</span>
                <span className="data-value">{selected.phone ?? '–'}</span>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section-header">
              <h3 className="section-title">Platby</h3>
            </div>
            <div className="section-content">
              <p className={styles.empty}>Zatím žádné platby. Členské příspěvky se zde zobrazí, až je klub vypíše.</p>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
