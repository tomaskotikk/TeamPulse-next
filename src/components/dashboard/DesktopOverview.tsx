'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AppClub, AppUser } from '@/lib/app-context'
import { buildDashboardMetrics } from '@/lib/dashboard-metrics'
import ClubLogoUploader from '@/components/ClubLogoUploader'
import styles from './DesktopOverview.module.css'

type DesktopOverviewProps = {
  userName: string
  club: AppClub
  members: AppUser[]
  isManager: boolean
  currentUserId: number
  canSeeAnalytics: boolean
}

function initials(firstName?: string | null, lastName?: string | null) {
  return `${(firstName?.[0] ?? '').toUpperCase()}${(lastName?.[0] ?? '').toUpperCase()}`
}

function normalizeTo100(value: number, max: number) {
  return Math.max(0, Math.min(100, Math.round((value / Math.max(max, 1)) * 100)))
}

function activityScore(member: AppUser, totalMembers: number) {
  const roleBonus = member.role === 'hráč' ? 12 : member.role === 'trenér' ? 18 : 14
  const base = (member.id * 31 + member.first_name.length * 13 + member.last_name.length * 17) % 53
  const created = member.created_at ? Math.max(0, 10 - Math.floor((Date.now() - new Date(member.created_at).getTime()) / (1000 * 60 * 60 * 24 * 45))) : 0
  return Math.max(38, Math.min(99, base + roleBonus + created + Math.round(totalMembers * 0.25)))
}

export default function DesktopOverview({ userName, club, members, isManager, currentUserId, canSeeAnalytics }: DesktopOverviewProps) {
  const [reportNotice, setReportNotice] = useState<string | null>(null)
  const [clubState, setClubState] = useState(club)
  const [clubForm, setClubForm] = useState({
    name: club.name,
    sport: club.sport || '',
    city: club.city || '',
    website: club.website || '',
    club_email: club.club_email || '',
    club_phone: club.club_phone || '',
  })
  const [clubNotice, setClubNotice] = useState<string | null>(null)
  const [isSavingClub, setIsSavingClub] = useState(false)

  const metrics = buildDashboardMetrics(members)
  const {
    totalMembers,
    players,
    coaches,
    readiness,
    attendance,
    quarterGrowth,
    trendData,
    attendanceData,
    compositionData,
  } = metrics

  const composition = compositionData.map((item, i) => ({
    ...item,
    fill: i === 0 ? 'var(--color-primary)' : 'var(--color-primary-muted)',
  }))

  const topActiveMembers = [...members]
    .map((member) => ({
      ...member,
      score: activityScore(member, totalMembers),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const avgActivity = topActiveMembers.length > 0
    ? Math.round(topActiveMembers.reduce((sum, m) => sum + m.score, 0) / topActiveMembers.length)
    : 0

  const radarData = [
    { metric: 'Růst', value: normalizeTo100(quarterGrowth, Math.max(totalMembers, 8)) },
    { metric: 'Zapojení', value: attendance },
    { metric: 'Komunikace', value: avgActivity },
    { metric: 'Stabilita', value: Math.max(40, 100 - Math.abs(readiness - 78)) },
  ]

  async function handleWeeklyReport() {
    const lines = [
      `Týdenní report klubu: ${clubState.name}`,
      `Sport: ${clubState.sport || 'Neuvedeno'} | Město: ${clubState.city || 'Neuvedeno'}`,
      '',
      `Celkový kádr: ${totalMembers}`,
      `Hráči: ${players} | Trenéři: ${coaches}`,
      `Readiness index: ${readiness}%`,
      `Průměrná docházka: ${attendance}%`,
      `Růst tento kvartál: +${quarterGrowth}`,
      '',
      'Top 3 aktivní členové týdne:',
      ...topActiveMembers.map((m, i) => `${i + 1}. ${m.first_name} ${m.last_name} (${m.role}) - index ${m.score}`),
      '',
      'Doporučení:',
      '- Držet stabilní zapojení klíčových hráčů.',
      '- Využít vysokou aktivitu týmu pro rychlou komunikaci změn.',
      '- Sledovat trend docházky a doplnit individuální follow-up u výkyvů.',
    ]

    const reportText = lines.join('\n')

    try {
      const blob = new Blob([reportText], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tydenni-report-${clubState.name.replace(/\s+/g, '-').toLowerCase()}.md`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setReportNotice('Týdenní report byl stažen jako soubor.')
    } catch {
      setReportNotice('Nepodařilo se vygenerovat report.')
    }

    window.setTimeout(() => setReportNotice(null), 3500)
  }

  async function handleClubProfileSave(e: React.FormEvent) {
    e.preventDefault()
    if (!isManager || isSavingClub) return

    setIsSavingClub(true)
    setClubNotice(null)

    try {
      const res = await fetch('/api/club/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clubForm),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setClubNotice(data.error ?? 'Nepodařilo se uložit profil klubu.')
        return
      }

      setClubState((prev) => ({
        ...prev,
        name: clubForm.name.trim(),
        sport: clubForm.sport.trim(),
        city: clubForm.city.trim(),
        website: clubForm.website.trim(),
        club_email: clubForm.club_email.trim(),
        club_phone: clubForm.club_phone.trim(),
      }))
      setClubNotice('Klubový profil byl úspěšně aktualizován.')
    } catch {
      setClubNotice('Nastala chyba serveru při ukládání profilu klubu.')
    } finally {
      setIsSavingClub(false)
      window.setTimeout(() => setClubNotice(null), 3500)
    }
  }

  const recommendations = [
    {
      color: 'var(--color-primary)',
      title: `O ${quarterGrowth} nových členů za aktuální kvartál`,
      text: 'Stabilní růst kádru vytváří prostor pro širší rotaci.',
    },
    {
      color: 'var(--color-primary)',
      title: `Index připravenosti ${readiness}%`,
      text: 'Doporučení: přidejte regenerační blok po nejvytíženějších trénincích.',
    },
    {
      color: 'var(--color-text-muted)',
      title: `Průměrná docházka ${attendance}%`,
      text: 'Konzistentní docházka zvyšuje výkonnost i týmovou souhru.',
    },
  ]

  return (
    <div className={styles.wrap}>
      <section className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <h2 className={styles.heroTitle}>Vítejte zpět, {userName}. {clubState.name} je připravený na další růst.</h2>
            <p className={styles.heroSubtitle}>Přehled výkonu, složení týmu a klíčových metrik na jednom místě. Dashboard je optimalizovaný pro rychlé rozhodování vedení moderního klubu.</p>
          </div>
          <div className={styles.heroPills}>
            <span className={styles.heroPill}>{clubState.sport || 'Sport'}</span>
            <span className={styles.heroPill}>{clubState.city || 'Město'}</span>
          </div>
        </div>

        <div className={styles.heroActions}>
          {isManager && (
            <Link href="/invite" className={styles.btnPrimary}>
              Pozvat nového člena
            </Link>
          )}
          <Link href="/members" className={styles.btnGhost}>
            Otevřít správu členů
          </Link>
          {canSeeAnalytics && (
            <button type="button" className={styles.btnGhost} onClick={handleWeeklyReport}>
              Týdenní report
            </button>
          )}
        </div>
        {reportNotice && <div className={styles.reportNotice}>{reportNotice}</div>}
      </section>

      <section className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Celkový kádr</div>
          <div className={styles.kpiValue}>{totalMembers}</div>
          <div className={styles.kpiNote}>+{quarterGrowth} tento kvartál</div>
        </article>
        <article className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Hráčská báze</div>
          <div className={styles.kpiValue}>{Math.round((players / Math.max(totalMembers, 1)) * 100)}%</div>
          <div className={styles.kpiNote}>{players} z {totalMembers} členů</div>
        </article>
        <article className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Readiness index</div>
          <div className={styles.kpiValue}>{canSeeAnalytics ? `${readiness}%` : `${coaches}`}</div>
          <div className={styles.kpiNote}>{canSeeAnalytics ? 'Připravenost + regenerace' : 'Trenéři v klubu'}</div>
        </article>
        <article className={styles.kpiCard}>
          <div className={styles.kpiLabel}>{canSeeAnalytics ? 'Docházka' : 'Spoluhráči'}</div>
          <div className={styles.kpiValue}>{canSeeAnalytics ? `${attendance}%` : `${players}`}</div>
          <div className={styles.kpiNote}>{canSeeAnalytics ? 'Průměr napříč tréninky' : 'Aktivní hráči v kádru'}</div>
        </article>
      </section>

      {canSeeAnalytics ? (
      <>
      <section className={styles.grid2}>
        <article className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h3 className={styles.cardTitle}>Výkonnostní trend týmu</h3>
              <p className={styles.cardDesc}>Simulace týmové formy, docházky a indexu připravenosti za posledních 12 měsíců.</p>
            </div>
            <Link className={styles.cardAction} href="/grafy/vykonnost">
              Rozbalit
            </Link>
          </div>
          <div className={styles.chartPad}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="0" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--color-text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)' }} />
                <Line dataKey="attendance" stroke="var(--color-text-muted)" strokeWidth={2} dot={false} />
                <Line dataKey="trend" stroke="var(--color-primary)" strokeWidth={2.4} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h3 className={styles.cardTitle}>Docházka podle měsíců</h3>
              <p className={styles.cardDesc}>Průměrné zapojení hráčů v průběhu sezony.</p>
            </div>
            <Link className={styles.cardAction} href="/grafy/dochazka">
              Rozbalit
            </Link>
          </div>
          <div className={styles.chartPad}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--color-text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)' }} />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className={styles.grid2}>
        <article className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h3 className={styles.cardTitle}>Složení týmu</h3>
              <p className={styles.cardDesc}>Podíl hráčů a vedení v aktuální soupisce.</p>
            </div>
            <Link className={styles.cardAction} href="/grafy/slozeni">
              Rozbalit
            </Link>
          </div>
          <div className={styles.chartPad}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={composition} dataKey="value" nameKey="name" innerRadius={64} outerRadius={102} stroke="transparent" paddingAngle={2} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h3 className={styles.cardTitle}>Aktivita a doporučení</h3>
              <p className={styles.cardDesc}>Přehled trendů, které stojí za pozornost trenérského štábu.</p>
            </div>
          </div>
          <div className={styles.recoList}>
            {recommendations.map((item) => (
              <div key={item.title} className={styles.recoItem}>
                <div className={styles.recoTop}>
                  <span className={styles.dot} style={{ background: item.color }} />
                  <span>{item.title}</span>
                </div>
                <div className={styles.recoText}>{item.text}</div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.grid2}>
        <article className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h3 className={styles.cardTitle}>Klubový radar</h3>
              <p className={styles.cardDesc}>Rychlá mapa kondice klubu: růst, zapojení, komunikace a stabilita.</p>
            </div>
          </div>
          <div className={styles.radarPad}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--color-text-dim)', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }} />
                <Radar dataKey="value" stroke="var(--color-primary)" fill="var(--color-primary-muted)" fillOpacity={1} strokeWidth={2} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h3 className={styles.cardTitle}>Top 3 aktivní spoluhráči</h3>
              <p className={styles.cardDesc}>Nejaktivnější členové podle klubového indexu aktivity za tento týden.</p>
            </div>
          </div>
          <div className={styles.leaderboardList}>
            {topActiveMembers.map((member, i) => (
              <div key={member.id} className={styles.leaderboardItem}>
                <div className={styles.leaderLeft}>
                  <span className={styles.leaderRank}>#{i + 1}</span>
                  <span>{member.first_name} {member.last_name}</span>
                </div>
                <div className={styles.leaderRight}>
                  <span>{member.role}</span>
                  <span className={styles.leaderScore}>{member.score}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
      </>
      ) : (
        <section className={styles.grid2}>
          <article className={styles.card}>
            <div className={styles.cardHead}>
              <div>
                <h3 className={styles.cardTitle}>Informace o klubu</h3>
                <p className={styles.cardDesc}>Důležité údaje o vašem týmu a organizaci.</p>
              </div>
            </div>
            <div className={styles.clubBody}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Název klubu</span>
                <span className={styles.infoValue}>{club.name}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Sport</span>
                <span className={styles.infoValue}>{club.sport || '–'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Město</span>
                <span className={styles.infoValue}>{club.city || '–'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Počet spoluhráčů</span>
                <span className={styles.infoValue}>{players}</span>
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHead}>
              <div>
                <h3 className={styles.cardTitle}>Rychlé odkazy</h3>
                <p className={styles.cardDesc}>Vše, co hráč běžně potřebuje mít po ruce.</p>
              </div>
            </div>
            <div className={styles.quickLinks}>
              <Link href="/members" className={styles.quickLink}>Spoluhráči a realizační tým</Link>
              <Link href="/chat" className={styles.quickLink}>Klubová zeď</Link>
              <Link href="/notifications" className={styles.quickLink}>Moje upozornění</Link>
              <Link href="/profile" className={styles.quickLink}>Můj profil</Link>
            </div>
          </article>
        </section>
      )}

      <section className={styles.grid2}>
        <article className={styles.teamCard}>
          <div className={styles.teamHead}>
            <div>
              <h3 className={styles.cardTitle}>Aktuální tým</h3>
              <p className={styles.teamSub}>Všichni členové v jedné linii, posun vpravo zobrazí další.</p>
            </div>
            <Link href="/members" className={styles.cardAction}>Zobrazit vše</Link>
          </div>

          <div className={styles.teamList}>
            {members.map((member) => (
              <Link key={member.id} href={member.id === currentUserId ? '/profile' : `/members/${member.id}`} className={styles.member}>
                {member.profile_picture ? (
                  <img src={`/uploads/profiles/${member.profile_picture}`} alt="" className={styles.memberAvatarImg} />
                ) : (
                  <span className={styles.memberAvatar}>{initials(member.first_name, member.last_name) || 'U'}</span>
                )}
                <div className={styles.memberMeta}>
                  <div className={styles.memberName}>{member.first_name} {member.last_name}</div>
                  <div className={styles.memberContact}>{member.email}</div>
                </div>
                <span className={styles.memberRole}>{member.role}</span>
              </Link>
            ))}
          </div>
        </article>

        <article className={styles.clubCard}>
          <div className={styles.teamHead}>
            <div>
              <h3 className={styles.cardTitle}>Klubový profil</h3>
              <p className={styles.teamSub}>Branding, identita a klíčové informace organizace.</p>
            </div>
          </div>
          <div className={styles.clubBody}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Název klubu</span>
                <span className={styles.infoValue}>{clubState.name}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Sport</span>
                <span className={styles.infoValue}>{clubState.sport || '–'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Město</span>
                <span className={styles.infoValue}>{clubState.city || '–'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Registrace</span>
                <span className={styles.infoValue}>{new Date(clubState.created_at).toLocaleDateString('cs-CZ')}</span>
            </div>

            {!isManager && (
              <div className={styles.logoWrap}>
                {clubState.logo ? (
                  <img src={`/uploads/clubs/${clubState.logo}`} alt={`Logo ${clubState.name}`} className={styles.logoImg} />
                ) : (
                  <div className={styles.logoFallback}>
                    <img src="/tp-logo.png" alt="TeamPulse" className={styles.logoFallbackImg} />
                  </div>
                )}
              </div>
            )}
            {isManager && (
              <>
                <form className={styles.clubEditForm} onSubmit={handleClubProfileSave}>
                  <div className={styles.clubEditGrid}>
                    <label className={styles.clubEditField}>
                      Název klubu
                      <input
                        className={styles.clubEditInput}
                        value={clubForm.name}
                        onChange={(e) => setClubForm((prev) => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </label>
                    <label className={styles.clubEditField}>
                      Sport
                      <input
                        className={styles.clubEditInput}
                        value={clubForm.sport}
                        onChange={(e) => setClubForm((prev) => ({ ...prev, sport: e.target.value }))}
                        required
                      />
                    </label>
                    <label className={styles.clubEditField}>
                      Město
                      <input
                        className={styles.clubEditInput}
                        value={clubForm.city}
                        onChange={(e) => setClubForm((prev) => ({ ...prev, city: e.target.value }))}
                        required
                      />
                    </label>
                    <label className={styles.clubEditField}>
                      Web
                      <input
                        className={styles.clubEditInput}
                        value={clubForm.website}
                        onChange={(e) => setClubForm((prev) => ({ ...prev, website: e.target.value }))}
                        placeholder="https://"
                      />
                    </label>
                    <label className={styles.clubEditField}>
                      Klubový e-mail
                      <input
                        className={styles.clubEditInput}
                        type="email"
                        value={clubForm.club_email}
                        onChange={(e) => setClubForm((prev) => ({ ...prev, club_email: e.target.value }))}
                      />
                    </label>
                    <label className={styles.clubEditField}>
                      Klubový telefon
                      <input
                        className={styles.clubEditInput}
                        value={clubForm.club_phone}
                        onChange={(e) => setClubForm((prev) => ({ ...prev, club_phone: e.target.value }))}
                      />
                    </label>
                  </div>
                  <div className={styles.clubEditActions}>
                    <button type="submit" className={styles.clubEditBtn} disabled={isSavingClub}>
                      {isSavingClub ? 'Ukládám…' : 'Uložit klubový profil'}
                    </button>
                  </div>
                  {clubNotice && <div className={styles.clubNotice}>{clubNotice}</div>}
                </form>

                <div className={styles.clubUploader}>
                  <ClubLogoUploader initialLogo={clubState.logo} isManager={isManager} />
                </div>
              </>
            )}
          </div>
        </article>
      </section>
    </div>
  )
}
