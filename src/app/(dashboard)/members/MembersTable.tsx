'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Search, UserPlus } from 'lucide-react'
import type { AppUser } from '@/lib/app-context'
import styles from './members.module.css'

export type MemberCategory = { id: number; name: string; color: string }

type Props = {
  members: AppUser[]
  categoryByMember: Record<number, MemberCategory>
  categories: MemberCategory[]
  currentUserId: number
  isManager: boolean
}

const ROLE_TABS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Všichni' },
  { value: 'hráč', label: 'Hráči' },
  { value: 'trenér', label: 'Trenéři' },
  { value: 'rodič', label: 'Rodiče' },
  { value: 'manažer', label: 'Vedení' },
]

const ROLE_ORDER: Record<string, number> = { 'manažer': 1, 'trenér': 2, 'hráč': 3, 'rodič': 4 }

function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function ageOf(dateBirth?: string | null) {
  if (!dateBirth) return null
  const birth = new Date(dateBirth)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1
  return age
}

/** Desktop roster: role tabs, category filter, search and a sortable-by-structure table. */
export default function MembersTable({ members, categoryByMember, categories, currentUserId, isManager }: Props) {
  const router = useRouter()
  const [role, setRole] = useState('all')
  const [categoryId, setCategoryId] = useState('all')
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: members.length }
    for (const m of members) result[m.role] = (result[m.role] ?? 0) + 1
    return result
  }, [members])

  const categoryOrder = useMemo(() => new Map(categories.map((c, i) => [c.id, i])), [categories])

  const rows = useMemo(() => {
    const q = normalize(query.trim())
    return members
      .filter((m) => role === 'all' || m.role === role)
      .filter((m) => {
        if (categoryId === 'all') return true
        if (categoryId === 'none') return !categoryByMember[m.id]
        return categoryByMember[m.id]?.id === Number(categoryId)
      })
      .filter((m) => {
        if (!q) return true
        return normalize(`${m.first_name} ${m.last_name} ${m.email ?? ''} ${m.phone ?? ''}`).includes(q)
      })
      .sort((a, b) => {
        const byRole = (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9)
        if (byRole) return byRole
        const ca = categoryByMember[a.id] ? categoryOrder.get(categoryByMember[a.id].id) ?? 99 : 99
        const cb = categoryByMember[b.id] ? categoryOrder.get(categoryByMember[b.id].id) ?? 99 : 99
        if (ca !== cb) return ca - cb
        return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'cs')
      })
  }, [members, role, categoryId, query, categoryByMember, categoryOrder])

  const filtered = role !== 'all' || categoryId !== 'all' || query.trim() !== ''

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Členové</h2>
          <p className={styles.subtitle}>
            {counts['hráč'] ?? 0} hráčů · {counts['trenér'] ?? 0} trenérů · {counts['rodič'] ?? 0} rodičů
          </p>
        </div>
        {isManager && (
          <Link href="/invite" className="btn btn-primary">
            <UserPlus size={15} /> Pozvat člena
          </Link>
        )}
      </header>

      <div className="section">
        <div className={styles.toolbar}>
          <div className={styles.tabs} role="tablist" aria-label="Filtrovat podle role">
            {ROLE_TABS.filter((t) => t.value === 'all' || counts[t.value]).map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={role === tab.value}
                className={styles.tab}
                onClick={() => setRole(tab.value)}
              >
                {tab.label}
                <span className={styles.tabCount}>{counts[tab.value] ?? 0}</span>
              </button>
            ))}
          </div>

          <div className={styles.filters}>
            {categories.length > 0 && (
              <select
                className="form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                aria-label="Filtrovat podle kategorie"
              >
                <option value="all">Všechny kategorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="none">Bez kategorie</option>
              </select>
            )}
            <label className={styles.search}>
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Hledat jméno, e-mail, telefon"
                aria-label="Hledat členy"
              />
            </label>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className={styles.empty}>
            <p>{filtered ? 'Filtru neodpovídá žádný člen.' : 'Klub zatím nemá žádné členy.'}</p>
            {filtered ? (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setRole('all')
                  setCategoryId('all')
                  setQuery('')
                }}
              >
                Zrušit filtry
              </button>
            ) : (
              isManager && <Link href="/invite" className="btn btn-primary">Pozvat prvního člena</Link>
            )}
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Jméno</th>
                <th>Role</th>
                <th>Kategorie</th>
                <th className={styles.num}>Věk</th>
                <th>Telefon</th>
                <th className={styles.num}>Členem od</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const href = m.id === currentUserId ? '/profile' : `/members/${m.id}`
                const category = categoryByMember[m.id]
                const age = ageOf(m.dateBirth)
                return (
                  <tr key={m.id} onClick={() => router.push(href)} className={styles.row}>
                    <td>
                      <Link href={href} className={styles.person} onClick={(e) => e.stopPropagation()}>
                        {m.profile_picture ? (
                          <img src={`/uploads/profiles/${m.profile_picture}`} alt="" className={styles.avatar} />
                        ) : (
                          <span className={styles.avatar} aria-hidden="true">
                            {(m.first_name?.[0] ?? '').toUpperCase()}
                            {(m.last_name?.[0] ?? '').toUpperCase()}
                          </span>
                        )}
                        <span className={styles.personText}>
                          <strong>
                            {m.first_name} {m.last_name}
                            {m.id === currentUserId && <span className={styles.you}>vy</span>}
                          </strong>
                          <small>{m.email}</small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span className={`${styles.role} ${m.role === 'manažer' ? styles.roleLead : ''}`}>{m.role}</span>
                    </td>
                    <td>
                      {category ? (
                        <span className={styles.category}>
                          <i style={{ background: category.color }} aria-hidden="true" />
                          {category.name}
                        </span>
                      ) : (
                        <span className={styles.dim}>–</span>
                      )}
                    </td>
                    <td className={styles.num}>{age ?? <span className={styles.dim}>–</span>}</td>
                    <td>
                      {m.phone ? (
                        <a href={`tel:${m.phone}`} className={styles.phone} onClick={(e) => e.stopPropagation()}>
                          {m.phone}
                        </a>
                      ) : (
                        <span className={styles.dim}>–</span>
                      )}
                    </td>
                    <td className={`${styles.num} ${styles.dim}`}>
                      {m.created_at ? new Date(m.created_at).toLocaleDateString('cs-CZ') : '–'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {rows.length > 0 && (
          <div className={styles.footer}>
            Zobrazeno {rows.length} z {members.length}
          </div>
        )}
      </div>
    </div>
  )
}
