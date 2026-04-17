'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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

type KpiCardId =
  | 'kpiTotalMembers'
  | 'kpiPlayerBase'
  | 'kpiReadiness'
  | 'kpiAttendance'

type AnalyticsCardId =
  | 'trend'
  | 'attendance'
  | 'composition'
  | 'recommendations'
  | 'radar'
  | 'topMembers'

type DashboardLayoutState = {
  kpiOrder: KpiCardId[]
  kpiHidden: KpiCardId[]
  analyticsOrder: AnalyticsCardId[]
  analyticsHidden: AnalyticsCardId[]
}

type LibraryModalKind = 'kpi' | 'analytics' | null

const DEFAULT_KPI_ORDER: KpiCardId[] = [
  'kpiTotalMembers',
  'kpiPlayerBase',
  'kpiReadiness',
  'kpiAttendance',
]

const DEFAULT_ANALYTICS_ORDER: AnalyticsCardId[] = [
  'trend',
  'attendance',
  'composition',
  'recommendations',
  'radar',
  'topMembers',
]

const DEFAULT_LAYOUT_STATE: DashboardLayoutState = {
  kpiOrder: DEFAULT_KPI_ORDER,
  kpiHidden: [],
  analyticsOrder: DEFAULT_ANALYTICS_ORDER,
  analyticsHidden: [],
}

const KPI_LABELS: Record<KpiCardId, string> = {
  kpiTotalMembers: 'Celkový kádr',
  kpiPlayerBase: 'Hráčská báze',
  kpiReadiness: 'Readiness index',
  kpiAttendance: 'Docházka',
}

const KPI_PREVIEW: Record<KpiCardId, string> = {
  kpiTotalMembers: 'Karta celkového počtu členů a kvartálního růstu.',
  kpiPlayerBase: 'Karta procentuálního podílu hráčské báze.',
  kpiReadiness: 'Karta připravenosti týmu nebo počtu trenérů.',
  kpiAttendance: 'Karta docházky nebo aktivních hráčů.',
}

const ANALYTICS_LABELS: Record<AnalyticsCardId, string> = {
  trend: 'Výkonnostní trend týmu',
  attendance: 'Docházka podle měsíců',
  composition: 'Složení týmu',
  recommendations: 'Aktivita a doporučení',
  radar: 'Klubový radar',
  topMembers: 'Top 3 aktivní spoluhráči',
}

const ANALYTICS_PREVIEW: Record<AnalyticsCardId, string> = {
  trend: 'Linkový graf dlouhodobé výkonnosti.',
  attendance: 'Sloupcový graf měsíční docházky.',
  composition: 'Pie chart s podílem rolí v týmu.',
  recommendations: 'Akční doporučení pro trenéra a manažera.',
  radar: 'Radarový přehled kondice týmu.',
  topMembers: 'Žebříček nejaktivnějších členů.',
}

function getPreviewVisualClass(kind: Exclude<LibraryModalKind, null>, id: string) {
  const prefix = kind === 'kpi' ? 'kpi' : 'analytics'
  return `${prefix}-${id}`
}

function isValidSegment<T extends string>(order: unknown, hidden: unknown, all: readonly T[]) {
  if (!Array.isArray(order) || !Array.isArray(hidden)) return false

  const castOrder = order.map((id) => String(id))
  const castHidden = hidden.map((id) => String(id))
  const merged = [...castOrder, ...castHidden]

  if (merged.length !== all.length) return false

  const allSet = new Set(all)
  const unique = new Set(merged)
  if (unique.size !== all.length) return false

  return merged.every((id) => allSet.has(id as T))
}

function parseDashboardLayout(layout?: string | null): DashboardLayoutState {
  if (!layout) return DEFAULT_LAYOUT_STATE

  try {
    const parsed = JSON.parse(layout) as Partial<DashboardLayoutState>

    if (
      isValidSegment(parsed.kpiOrder, parsed.kpiHidden, DEFAULT_KPI_ORDER) &&
      isValidSegment(parsed.analyticsOrder, parsed.analyticsHidden, DEFAULT_ANALYTICS_ORDER)
    ) {
      return {
        kpiOrder: parsed.kpiOrder as KpiCardId[],
        kpiHidden: parsed.kpiHidden as KpiCardId[],
        analyticsOrder: parsed.analyticsOrder as AnalyticsCardId[],
        analyticsHidden: parsed.analyticsHidden as AnalyticsCardId[],
      }
    }
  } catch {
    const legacy = layout
      .split(',')
      .map((value) => value.trim())
      .filter((value): value is AnalyticsCardId => DEFAULT_ANALYTICS_ORDER.includes(value as AnalyticsCardId))

    const unique = legacy.filter((value, index) => legacy.indexOf(value) === index)
    if (unique.length === DEFAULT_ANALYTICS_ORDER.length) {
      return {
        ...DEFAULT_LAYOUT_STATE,
        analyticsOrder: unique,
      }
    }
  }

  return DEFAULT_LAYOUT_STATE
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

type SortableCardProps = {
  id: string
  editable: boolean
  className: string
  children: ReactNode
}

function SortableCard({ id, editable, className, children }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editable })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 18 : 1,
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={[className, editable ? styles.draggableCard : '', isDragging ? styles.draggingCard : ''].filter(Boolean).join(' ')}
      {...attributes}
      {...listeners}
    >
      {children}
    </article>
  )
}

export default function DesktopOverview({ userName, club, members, isManager, currentUserId, canSeeAnalytics }: DesktopOverviewProps) {
  const [mounted, setMounted] = useState(false)
  const [reportNotice, setReportNotice] = useState<string | null>(null)
  const [clubState, setClubState] = useState(club)
  const [layoutState, setLayoutState] = useState<DashboardLayoutState>(() => parseDashboardLayout(club.dashboard_layout))
  const [layoutNotice, setLayoutNotice] = useState<string | null>(null)
  const [isSavingLayout, setIsSavingLayout] = useState(false)
  const [activeModal, setActiveModal] = useState<LibraryModalKind>(null)
  const [selectedKpiPreview, setSelectedKpiPreview] = useState<KpiCardId | null>(null)
  const [selectedAnalyticsPreview, setSelectedAnalyticsPreview] = useState<AnalyticsCardId | null>(null)
  const [previewFullscreen, setPreviewFullscreen] = useState(false)

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

  const isLayoutEditable = canSeeAnalytics && isManager
  const dndEnabled = mounted && isLayoutEditable

  useEffect(() => {
    setMounted(true)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } })
  )

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

  const saveTimeout = 3000

  async function persistDashboardLayout(nextLayout: DashboardLayoutState) {
    if (!isLayoutEditable) return

    setIsSavingLayout(true)
    setLayoutNotice(null)

    try {
      const res = await fetch('/api/settings/dashboard-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: nextLayout }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setLayoutNotice(data.error ?? 'Rozvržení se nepodařilo uložit.')
        return
      }

      setClubState((prev) => ({
        ...prev,
        dashboard_layout: JSON.stringify(nextLayout),
      }))
    } catch {
      setLayoutNotice('Nastala chyba serveru při ukládání rozvržení.')
    } finally {
      setIsSavingLayout(false)
      window.setTimeout(() => setLayoutNotice(null), saveTimeout)
    }
  }

  function updateLayout(nextLayout: DashboardLayoutState) {
    setLayoutState(nextLayout)
    void persistDashboardLayout(nextLayout)
  }

  function handleKpiDragEnd(event: DragEndEvent) {
    if (!dndEnabled) return

    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = layoutState.kpiOrder.indexOf(active.id as KpiCardId)
    const newIndex = layoutState.kpiOrder.indexOf(over.id as KpiCardId)
    if (oldIndex < 0 || newIndex < 0) return

    updateLayout({
      ...layoutState,
      kpiOrder: arrayMove(layoutState.kpiOrder, oldIndex, newIndex),
    })
  }

  function handleAnalyticsDragEnd(event: DragEndEvent) {
    if (!dndEnabled) return

    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = layoutState.analyticsOrder.indexOf(active.id as AnalyticsCardId)
    const newIndex = layoutState.analyticsOrder.indexOf(over.id as AnalyticsCardId)
    if (oldIndex < 0 || newIndex < 0) return

    updateLayout({
      ...layoutState,
      analyticsOrder: arrayMove(layoutState.analyticsOrder, oldIndex, newIndex),
    })
  }

  function removeKpiCard(cardId: KpiCardId) {
    if (!isLayoutEditable) return
    updateLayout({
      ...layoutState,
      kpiOrder: layoutState.kpiOrder.filter((id) => id !== cardId),
      kpiHidden: [...layoutState.kpiHidden, cardId],
    })
  }

  function addKpiCard(cardId: KpiCardId) {
    if (!isLayoutEditable) return
    updateLayout({
      ...layoutState,
      kpiOrder: [...layoutState.kpiOrder, cardId],
      kpiHidden: layoutState.kpiHidden.filter((id) => id !== cardId),
    })
  }

  function removeAnalyticsCard(cardId: AnalyticsCardId) {
    if (!isLayoutEditable) return
    updateLayout({
      ...layoutState,
      analyticsOrder: layoutState.analyticsOrder.filter((id) => id !== cardId),
      analyticsHidden: [...layoutState.analyticsHidden, cardId],
    })
  }

  function addAnalyticsCard(cardId: AnalyticsCardId) {
    if (!isLayoutEditable) return
    updateLayout({
      ...layoutState,
      analyticsOrder: [...layoutState.analyticsOrder, cardId],
      analyticsHidden: layoutState.analyticsHidden.filter((id) => id !== cardId),
    })
  }

  function openModal(kind: Exclude<LibraryModalKind, null>) {
    setActiveModal(kind)
    setPreviewFullscreen(false)
    if (kind === 'kpi') {
      setSelectedKpiPreview(layoutState.kpiHidden[0] ?? null)
    } else {
      setSelectedAnalyticsPreview(layoutState.analyticsHidden[0] ?? null)
    }
  }

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

  function renderCardRemoveButton(onClick: () => void) {
    if (!isLayoutEditable) return null

    return (
      <button
        type="button"
        className={styles.cardRemoveBtn}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        aria-label="Skrýt kartu"
      >
        x
      </button>
    )
  }

  function renderKpiCard(cardId: KpiCardId) {
    if (cardId === 'kpiTotalMembers') {
      return (
        <>
          {renderCardRemoveButton(() => removeKpiCard(cardId))}
          <div className={styles.kpiLabel}>Celkový kádr</div>
          <div className={styles.kpiValue}>{totalMembers}</div>
          <div className={styles.kpiNote}>+{quarterGrowth} tento kvartál</div>
        </>
      )
    }

    if (cardId === 'kpiPlayerBase') {
      return (
        <>
          {renderCardRemoveButton(() => removeKpiCard(cardId))}
          <div className={styles.kpiLabel}>Hráčská báze</div>
          <div className={styles.kpiValue}>{Math.round((players / Math.max(totalMembers, 1)) * 100)}%</div>
          <div className={styles.kpiNote}>{players} z {totalMembers} členů</div>
        </>
      )
    }

    if (cardId === 'kpiReadiness') {
      return (
        <>
          {renderCardRemoveButton(() => removeKpiCard(cardId))}
          <div className={styles.kpiLabel}>Readiness index</div>
          <div className={styles.kpiValue}>{canSeeAnalytics ? `${readiness}%` : `${coaches}`}</div>
          <div className={styles.kpiNote}>{canSeeAnalytics ? 'Připravenost + regenerace' : 'Trenéři v klubu'}</div>
        </>
      )
    }

    return (
      <>
        {renderCardRemoveButton(() => removeKpiCard(cardId))}
        <div className={styles.kpiLabel}>{canSeeAnalytics ? 'Docházka' : 'Spoluhráči'}</div>
        <div className={styles.kpiValue}>{canSeeAnalytics ? `${attendance}%` : `${players}`}</div>
        <div className={styles.kpiNote}>{canSeeAnalytics ? 'Průměr napříč tréninky' : 'Aktivní hráči v kádru'}</div>
      </>
    )
  }

  function renderAnalyticsCard(cardId: AnalyticsCardId) {
    if (cardId === 'trend') {
      return (
        <>
          {renderCardRemoveButton(() => removeAnalyticsCard(cardId))}
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
        </>
      )
    }

    if (cardId === 'attendance') {
      return (
        <>
          {renderCardRemoveButton(() => removeAnalyticsCard(cardId))}
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
        </>
      )
    }

    if (cardId === 'composition') {
      return (
        <>
          {renderCardRemoveButton(() => removeAnalyticsCard(cardId))}
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
        </>
      )
    }

    if (cardId === 'recommendations') {
      return (
        <>
          {renderCardRemoveButton(() => removeAnalyticsCard(cardId))}
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
        </>
      )
    }

    if (cardId === 'radar') {
      return (
        <>
          {renderCardRemoveButton(() => removeAnalyticsCard(cardId))}
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
        </>
      )
    }

    return (
      <>
        {renderCardRemoveButton(() => removeAnalyticsCard(cardId))}
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
      </>
    )
  }

  function renderFullscreenChart(cardId: KpiCardId | AnalyticsCardId | null) {
    if (!cardId) return null

    // KPI cards - show larger values
    if (activeModal === 'kpi') {
      if (cardId === 'kpiTotalMembers') {
        return (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--color-primary)' }}>{totalMembers}</div>
            <div style={{ fontSize: 18, color: 'var(--color-text-muted)', marginTop: 12 }}>Celkem členů v klubu</div>
            <div style={{ fontSize: 14, color: 'var(--color-text-dim)', marginTop: 8 }}>+{quarterGrowth} tento kvartál</div>
          </div>
        )
      }
      if (cardId === 'kpiPlayerBase') {
        const percentage = Math.round((players / Math.max(totalMembers, 1)) * 100)
        return (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--color-primary)' }}>{percentage}%</div>
            <div style={{ fontSize: 18, color: 'var(--color-text-muted)', marginTop: 12 }}>Hráčská báze</div>
            <div style={{ fontSize: 14, color: 'var(--color-text-dim)', marginTop: 8 }}>{players} z {totalMembers} členů</div>
          </div>
        )
      }
      if (cardId === 'kpiReadiness') {
        return (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--color-primary)' }}>{canSeeAnalytics ? `${readiness}%` : coaches}</div>
            <div style={{ fontSize: 18, color: 'var(--color-text-muted)', marginTop: 12 }}>Readiness index</div>
            <div style={{ fontSize: 14, color: 'var(--color-text-dim)', marginTop: 8 }}>{canSeeAnalytics ? 'Připravenost + regenerace' : 'Trenéři v klubu'}</div>
          </div>
        )
      }
      if (cardId === 'kpiAttendance') {
        return (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--color-primary)' }}>{canSeeAnalytics ? `${attendance}%` : players}</div>
            <div style={{ fontSize: 18, color: 'var(--color-text-muted)', marginTop: 12 }}>Docházka</div>
            <div style={{ fontSize: 14, color: 'var(--color-text-dim)', marginTop: 8 }}>{canSeeAnalytics ? 'Průměr napříč tréninky' : 'Aktivní hráči v kádru'}</div>
          </div>
        )
      }
    }

    // Analytics cards - show full charts
    if (activeModal === 'analytics') {
      if (cardId === 'trend') {
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trendData} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="0" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--color-text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--color-text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)' }} />
              <Line dataKey="attendance" stroke="var(--color-text-muted)" strokeWidth={2} dot={false} />
              <Line dataKey="trend" stroke="var(--color-primary)" strokeWidth={2.4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )
      }
      if (cardId === 'attendance') {
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={attendanceData} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--color-text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--color-text-dim)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)' }} />
              <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )
      }
      if (cardId === 'composition') {
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie data={composition} dataKey="value" nameKey="name" innerRadius={80} outerRadius={140} stroke="transparent" paddingAngle={2} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)' }} />
            </PieChart>
          </ResponsiveContainer>
        )
      }
      if (cardId === 'radar') {
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData} outerRadius="65%">
              <PolarGrid stroke="var(--color-border)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--color-text-dim)', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }} />
              <Radar dataKey="value" stroke="var(--color-primary)" fill="var(--color-primary-muted)" fillOpacity={1} strokeWidth={2} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)' }} />
            </RadarChart>
          </ResponsiveContainer>
        )
      }
      if (cardId === 'recommendations') {
        return (
          <div style={{ paddingTop: 20 }}>
            {recommendations.map((item) => (
              <div key={item.title} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: item.color, flexShrink: 0 }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{item.title}</div>
                </div>
                <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginLeft: 20 }}>{item.text}</div>
              </div>
            ))}
          </div>
        )
      }
      if (cardId === 'topMembers') {
        return (
          <div style={{ paddingTop: 20 }}>
            {topActiveMembers.map((member, i) => (
              <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ minWidth: 28, height: 28, borderRadius: 999, border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)' }}>
                    #{i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{member.first_name} {member.last_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>{member.role}</div>
                  </div>
                </div>
                <div style={{ minWidth: 28, height: 28, borderRadius: 999, border: '1px solid var(--color-primary)', background: 'var(--color-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--color-primary)' }}>
                  {member.score}
                </div>
              </div>
            ))}
          </div>
        )
      }
    }

    return null
  }

  function renderLibraryModal() {
    if (!activeModal) return null

    const hiddenItems = activeModal === 'kpi' ? layoutState.kpiHidden : layoutState.analyticsHidden
    const selected = activeModal === 'kpi' ? selectedKpiPreview : selectedAnalyticsPreview
    const title = activeModal === 'kpi' ? 'Přidat KPI kartu' : 'Přidat statistickou kartu'
    const previewClass = selected ? getPreviewVisualClass(activeModal, selected) : null

    return (
      <div className={styles.modalBackdrop} onClick={() => setActiveModal(null)}>
        <div className={styles.modalWindow} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHead}>
            <h4 className={styles.modalTitle}>{title}</h4>
            <button type="button" className={styles.modalClose} onClick={() => setActiveModal(null)}>x</button>
          </div>
          <div className={styles.modalBody}>
            <div className={styles.modalList}>
              {hiddenItems.length === 0 ? (
                <div className={styles.modalEmpty}>Žádné další karty nejsou k dispozici.</div>
              ) : (
                hiddenItems.map((id) => {
                  const isSelected = selected === id
                  const label = activeModal === 'kpi' ? KPI_LABELS[id as KpiCardId] : ANALYTICS_LABELS[id as AnalyticsCardId]
                  const previewClass = getPreviewVisualClass(activeModal, id)

                  return (
                    <button
                      key={id}
                      type="button"
                      className={[styles.modalItem, isSelected ? styles.modalItemActive : ''].filter(Boolean).join(' ')}
                      onClick={() => {
                        if (activeModal === 'kpi') setSelectedKpiPreview(id as KpiCardId)
                        else setSelectedAnalyticsPreview(id as AnalyticsCardId)
                      }}
                    >
                      <span className={[styles.modalItemVisual, styles[previewClass]].join(' ')} />
                      {label}
                    </button>
                  )
                })
              )}
            </div>

            <div className={styles.previewPane}>
              <div className={styles.previewLabel}>Simulace karty v dashboardu</div>
              {selected ? (
                <div className={styles.previewCard}>
                  <div className={styles.previewCardHeader}>
                    <div className={styles.previewCardTitleWrap}>
                      <div className={styles.previewCardTitle}>
                        {activeModal === 'kpi' ? KPI_LABELS[selected as KpiCardId] : ANALYTICS_LABELS[selected as AnalyticsCardId]}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={styles.previewExpandBtn}
                      onClick={() => setPreviewFullscreen(true)}
                      aria-label="Otevřít náhled přes celou obrazovku"
                    >
                      ⤢
                    </button>
                  </div>
                  <div className={styles.previewCardText}>
                    {activeModal === 'kpi' ? KPI_PREVIEW[selected as KpiCardId] : ANALYTICS_PREVIEW[selected as AnalyticsCardId]}
                  </div>
                  <div className={styles.previewSketch} onClick={() => setPreviewFullscreen(true)}>
                    <span className={[styles.previewSketchVisual, previewClass ? styles[previewClass] : ''].join(' ')} />
                  </div>
                </div>
              ) : (
                <div className={styles.modalEmpty}>Vyber kartu vlevo.</div>
              )}
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnGhost} onClick={() => setActiveModal(null)}>
              Zavřít
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={!selected}
              onClick={() => {
                if (!selected) return
                if (activeModal === 'kpi') addKpiCard(selected as KpiCardId)
                else addAnalyticsCard(selected as AnalyticsCardId)
                setActiveModal(null)
              }}
            >
              Přidat do dashboardu
            </button>
          </div>

          {previewFullscreen && selected && (
            <div className={styles.previewFullscreen} onClick={() => setPreviewFullscreen(false)}>
              <div className={styles.previewFullscreenCard} onClick={(e) => e.stopPropagation()}>
                <div className={styles.previewFullscreenHead}>
                  <div className={styles.previewFullscreenHeadLeft}>
                    <div className={styles.previewLabel}>Náhled přes celou obrazovku</div>
                    <div className={styles.previewCardTitle}>
                      {activeModal === 'kpi' ? KPI_LABELS[selected as KpiCardId] : ANALYTICS_LABELS[selected as AnalyticsCardId]}
                    </div>
                  </div>
                  <div className={styles.previewFullscreenHeadRight}>
                    {activeModal === 'analytics' && (
                      <>
                        {selected === 'trend' && (
                          <Link className={styles.cardAction} href="/grafy/vykonnost">
                            Rozbalit
                          </Link>
                        )}
                        {selected === 'attendance' && (
                          <Link className={styles.cardAction} href="/grafy/dochazka">
                            Rozbalit
                          </Link>
                        )}
                        {selected === 'composition' && (
                          <Link className={styles.cardAction} href="/grafy/slozeni">
                            Rozbalit
                          </Link>
                        )}
                      </>
                    )}
                    <button
                      type="button"
                      className={styles.modalClose}
                      onClick={() => setPreviewFullscreen(false)}
                    >
                      x
                    </button>
                  </div>
                </div>
                <div className={styles.previewFullscreenBody}>
                  {renderFullscreenChart(selected)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

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
        {layoutNotice && <div className={styles.clubNotice}>{layoutNotice}</div>}
      </section>

      <section className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Rychlé KPI</h3>
        {isLayoutEditable && (
          <button type="button" className={styles.miniPlus} onClick={() => openModal('kpi')} aria-label="Přidat KPI kartu">
            +
          </button>
        )}
      </section>

      {dndEnabled ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleKpiDragEnd}>
          <SortableContext items={layoutState.kpiOrder} strategy={rectSortingStrategy}>
            <section className={styles.kpiGrid}>
              {layoutState.kpiOrder.map((cardId) => (
                <SortableCard key={cardId} id={cardId} editable className={styles.kpiCard}>
                  {renderKpiCard(cardId)}
                </SortableCard>
              ))}
            </section>
          </SortableContext>
        </DndContext>
      ) : (
        <section className={styles.kpiGrid}>
          {layoutState.kpiOrder.map((cardId) => (
            <article key={cardId} className={styles.kpiCard}>
              {renderKpiCard(cardId)}
            </article>
          ))}
        </section>
      )}

      {canSeeAnalytics ? (
        <>
          <section className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Statistické karty</h3>
            {isLayoutEditable && (
              <button type="button" className={styles.miniPlus} onClick={() => openModal('analytics')} aria-label="Přidat statistickou kartu">
                +
              </button>
            )}
          </section>

          {dndEnabled ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleAnalyticsDragEnd}>
              <SortableContext items={layoutState.analyticsOrder} strategy={rectSortingStrategy}>
                <section className={styles.analyticsGrid}>
                  {layoutState.analyticsOrder.map((cardId) => (
                    <SortableCard key={cardId} id={cardId} editable className={styles.card}>
                      {renderAnalyticsCard(cardId)}
                    </SortableCard>
                  ))}
                </section>
              </SortableContext>
            </DndContext>
          ) : (
            <section className={styles.analyticsGrid}>
              {layoutState.analyticsOrder.map((cardId) => (
                <article key={cardId} className={styles.card}>
                  {renderAnalyticsCard(cardId)}
                </article>
              ))}
            </section>
          )}
          {isSavingLayout && <div className={styles.sectionSaving}>Ukládám rozvržení…</div>}
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
                <span className={styles.infoValue}>{club.sport || '-'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Město</span>
                <span className={styles.infoValue}>{club.city || '-'}</span>
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
              <span className={styles.infoValue}>{clubState.sport || '-'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Město</span>
              <span className={styles.infoValue}>{clubState.city || '-'}</span>
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

      {renderLibraryModal()}
    </div>
  )
}
