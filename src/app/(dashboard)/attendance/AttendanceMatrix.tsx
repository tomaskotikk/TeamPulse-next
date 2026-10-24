'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import styles from './matrix.module.css'

type Category = { id: number; name: string; color: string }
type Cell = { response: 'yes' | 'no' | null; attended: 'present' | 'absent' | 'excused' | null } | null
type Matrix = {
  events: Array<{ id: number; type: string; title: string; starts_at: string }>
  rows: Array<{ player: { id: number; first_name: string; last_name: string }; cells: Cell[]; rate: number | null }>
}

type Period = 'month' | 'last30' | 'season' | 'custom'

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function periodRange(period: Period, custom: { from: string; to: string }) {
  const now = new Date()
  if (period === 'month') return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) }
  if (period === 'last30') return { from: iso(new Date(now.getTime() - 30 * 86400000)), to: iso(now) }
  if (period === 'season') {
    // season runs August – June
    const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
    return { from: `${startYear}-08-01`, to: `${startYear + 1}-07-31` }
  }
  return custom
}

const TYPE_SHORT: Record<string, string> = { training: 'T', match: 'Z', meeting: 'S', event: 'A' }

function cellView(cell: Cell) {
  if (!cell) return { cls: styles.na, label: '', title: 'Nepozván' }
  if (cell.attended === 'present') return { cls: styles.present, label: '✓', title: 'Přítomen' }
  if (cell.attended === 'absent') return { cls: styles.absent, label: '✕', title: 'Nepřítomen' }
  if (cell.attended === 'excused') return { cls: styles.excused, label: 'O', title: 'Omluven' }
  if (cell.response === 'yes') return { cls: styles.yes, label: '✓', title: 'Přijde (nezapsáno)' }
  if (cell.response === 'no') return { cls: styles.no, label: '✕', title: 'Nepřijde (nezapsáno)' }
  return { cls: styles.pending, label: '–', title: 'Bez odpovědi' }
}

export default function AttendanceMatrix({ categories }: { categories: Category[] }) {
  const [period, setPeriod] = useState<Period>('month')
  const [custom, setCustom] = useState(() => periodRange('month', { from: '', to: '' }))
  const [categoryId, setCategoryId] = useState('')
  const [type, setType] = useState('')
  const [matrix, setMatrix] = useState<Matrix | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null)

  const range = periodRange(period, custom)
  const query = useMemo(() => {
    const p = new URLSearchParams({ from: range.from, to: range.to })
    if (categoryId) p.set('category', categoryId)
    if (type) p.set('type', type)
    return p.toString()
  }, [range.from, range.to, categoryId, type])
  const loading = loadedQuery !== query

  useEffect(() => {
    let cancelled = false
    fetch(`/api/attendance?${query}`, { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        if (!cancelled) {
          setMatrix(json)
          setError(null)
        }
      })
      .catch((err) => !cancelled && setError(err.message || 'Docházku se nepodařilo načíst.'))
      .finally(() => !cancelled && setLoadedQuery(query))
    return () => {
      cancelled = true
    }
  }, [query])

  return (
    <div className="section">
      <div className={styles.toolbar}>
        <div className={styles.periods} role="tablist" aria-label="Období">
          {([
            ['month', 'Tento měsíc'],
            ['last30', 'Posledních 30 dní'],
            ['season', 'Sezóna'],
            ['custom', 'Vlastní'],
          ] as const).map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={period === key} className={styles.period} onClick={() => setPeriod(key)}>
              {label}
            </button>
          ))}
        </div>

        <div className={styles.filters}>
          {period === 'custom' && (
            <>
              <input type="date" className="form-input" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} aria-label="Od" />
              <input type="date" className="form-input" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} aria-label="Do" />
            </>
          )}
          {categories.length > 0 && (
            <select className="form-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Kategorie">
              <option value="">Všechny kategorie</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <select className="form-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Typ události">
            <option value="">Všechny typy</option>
            <option value="training">Tréninky</option>
            <option value="match">Zápasy</option>
            <option value="meeting">Schůzky</option>
            <option value="event">Akce</option>
          </select>
          <a className="btn" href={`/api/attendance?${query}&format=csv`} download>
            <Download size={15} /> Export CSV
          </a>
        </div>
      </div>

      {error && <p className={styles.message}>{error}</p>}
      {!error && !matrix && <p className={styles.message}>Načítám…</p>}

      {matrix && (matrix.events.length === 0 || matrix.rows.length === 0) && (
        <p className={styles.message}>V tomto období nejsou žádné události s pozvanými hráči.</p>
      )}

      {matrix && matrix.events.length > 0 && matrix.rows.length > 0 && (
        <div className={`${styles.scroll} ${loading ? styles.loading : ''}`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.playerCol}>Hráč</th>
                <th className={styles.rateCol}>Docházka</th>
                {matrix.events.map((e) => {
                  const d = new Date(e.starts_at)
                  return (
                    <th key={e.id} className={styles.eventCol} title={`${e.title} · ${d.toLocaleString('cs-CZ')}`}>
                      <span className={styles.eventType}>{TYPE_SHORT[e.type] ?? 'A'}</span>
                      <span>{d.getDate()}.{d.getMonth() + 1}.</span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((r) => (
                <tr key={r.player.id}>
                  <th scope="row" className={styles.playerCol}>{r.player.last_name} {r.player.first_name}</th>
                  <td className={styles.rateCol}>
                    {r.rate === null ? (
                      <span className={styles.dim}>–</span>
                    ) : (
                      <span className={styles.rate}>
                        <span className={styles.rateBar}><span style={{ width: `${r.rate}%` }} /></span>
                        {r.rate} %
                      </span>
                    )}
                  </td>
                  {r.cells.map((cell, i) => {
                    const v = cellView(cell)
                    return (
                      <td key={matrix.events[i].id} className={styles.cell}>
                        <span className={`${styles.mark} ${v.cls}`} title={v.title}>{v.label}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.legend}>
        <span><i className={`${styles.mark} ${styles.present}`}>✓</i> přítomen</span>
        <span><i className={`${styles.mark} ${styles.excused}`}>O</i> omluven</span>
        <span><i className={`${styles.mark} ${styles.absent}`}>✕</i> nepřítomen</span>
        <span><i className={`${styles.mark} ${styles.yes}`}>✓</i> přijde (nezapsáno)</span>
        <span><i className={`${styles.mark} ${styles.pending}`}>–</i> bez odpovědi</span>
        <span className={styles.dim}>T trénink · Z zápas · S schůzka · A akce</span>
      </div>
    </div>
  )
}
