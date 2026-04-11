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
    fill: i === 0 ? 'var(--red)' : 'rgba(var(--red-rgb, 255, 51, 0), 0.45)',
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
      `Týdenní report klubu: ${club.name}`,
      `Sport: ${club.sport || 'Neuvedeno'} | Město: ${club.city || 'Neuvedeno'}`,
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
      await navigator.clipboard.writeText(reportText)
      setReportNotice('Týdenní report byl zkopírován do schránky.')
    } catch {
      const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tydenni-report-${club.name.replace(/\s+/g, '-').toLowerCase()}.txt`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setReportNotice('Týdenní report byl stažen jako textový soubor.')
    }

    window.setTimeout(() => setReportNotice(null), 3500)
  }

  const recommendations = [
    {
      color: 'rgba(var(--red-rgb, 255, 51, 0), 0.7)',
      title: `O ${quarterGrowth} nových členů za aktuální kvartál`,
      text: 'Stabilní růst kádru vytváří prostor pro širší rotaci.',
    },
    {
      color: 'var(--red)',
      title: `Index připravenosti ${readiness}%`,
      text: 'Doporučení: přidejte regenerační blok po nejvytíženějších trénincích.',
    },
    {
      color: 'rgba(var(--red-rgb, 255, 51, 0), 0.4)',
      title: `Průměrná docházka ${attendance}%`,
      text: 'Konzistentní docházka zvyšuje výkonnost i týmovou souhru.',
    },
  ]

  const clubInitials = club.name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)

  return (
    <div className={styles.wrap}>
      <section className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <h2 className={styles.heroTitle}>Vítejte zpět, {userName}. {club.name} je připravený na další růst.</h2>
            <p className={styles.heroSubtitle}>Přehled výkonu, složení týmu a klíčových metrik na jednom místě. Dashboard je optimalizovaný pro rychlé rozhodování vedení moderního klubu.</p>
          </div>
          <div className={styles.heroPills}>
            <span className={styles.heroPill}>{club.sport || 'Sport'}</span>
            <span className={styles.heroPill}>{club.city || 'Město'}</span>
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
            <Link className={styles.cardAction} href="/dashboard/grafy/vykonnost">
              Rozbalit
            </Link>
          </div>
          <div className={styles.chartPad}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.09)" strokeDasharray="4 4" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }} />
                <Line dataKey="attendance" stroke="rgba(var(--red-rgb, 255, 51, 0), 0.45)" strokeWidth={2.2} dot={false} />
                <Line dataKey="trend" stroke="var(--red)" strokeWidth={3} dot={false} />
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
            <Link className={styles.cardAction} href="/dashboard/grafy/dochazka">
              Rozbalit
            </Link>
          </div>
          <div className={styles.chartPad}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }} />
                <Bar dataKey="value" fill="var(--red-dark)" radius={[8, 8, 3, 3]} />
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
            <Link className={styles.cardAction} href="/dashboard/grafy/slozeni">
              Rozbalit
            </Link>
          </div>
          <div className={styles.chartPad}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={composition} dataKey="value" nameKey="name" innerRadius={64} outerRadius={102} stroke="transparent" paddingAngle={2} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }} />
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
                <PolarGrid stroke="rgba(255,255,255,0.12)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-dim)', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-dimmer)', fontSize: 11 }} />
                <Radar dataKey="value" stroke="var(--red)" fill="rgba(var(--red-rgb, 255, 51, 0), 0.35)" fillOpacity={1} strokeWidth={2.5} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }} />
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
              <span className={styles.infoLabel}>Registrace</span>
              <span className={styles.infoValue}>{new Date(club.created_at).toLocaleDateString('cs-CZ')}</span>
            </div>

            {!isManager && (
              <div className={styles.logoWrap}>
                {club.logo ? (
                  <img src={`/uploads/clubs/${club.logo}`} alt={`Logo ${club.name}`} className={styles.logoImg} />
                ) : (
                  <div className={styles.logoFallback}>{clubInitials || 'TP'}</div>
                )}
              </div>
            )}
            {isManager && (
              <div className={styles.clubUploader}>
                <ClubLogoUploader initialLogo={club.logo} isManager={isManager} />
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  )
}
