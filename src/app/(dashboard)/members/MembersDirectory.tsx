'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { AppUser } from '@/lib/app-context'

interface MembersDirectoryProps {
  members: AppUser[]
  currentUserId: number
  isManager: boolean
}

const ROLE_LABELS: Record<string, string> = {
  'manažer': 'Manažeři',
  'trenér': 'Trenéři',
  'hráč': 'Hráči',
  'rodič': 'Rodiče',
}

const ROLE_SORT_ORDER: Record<string, number> = {
  'manažer': 1,
  'trenér': 2,
  'hráč': 3,
  'rodič': 4,
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export default function MembersDirectory({ members, currentUserId, isManager }: MembersDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const roleStats = useMemo(() => {
    const stats: Record<string, number> = {}
    for (const member of members) {
      stats[member.role] = (stats[member.role] ?? 0) + 1
    }
    return stats
  }, [members])

  const roleOptions = useMemo(() => {
    const roles = Object.keys(roleStats).sort((a, b) => {
      const byOrder = (ROLE_SORT_ORDER[a] ?? 99) - (ROLE_SORT_ORDER[b] ?? 99)
      if (byOrder !== 0) return byOrder
      return a.localeCompare(b, 'cs')
    })

    return [
      { value: 'all', label: 'Všechny role', count: members.length },
      ...roles.map((role) => ({
        value: role,
        label: ROLE_LABELS[role] ?? role,
        count: roleStats[role],
      })),
    ]
  }, [members.length, roleStats])

  const filteredMembers = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery.trim())

    return members.filter((member) => {
      const roleMatch = roleFilter === 'all' || member.role === roleFilter
      if (!roleMatch) return false

      if (!normalizedQuery) return true

      const fullName = normalizeText(`${member.first_name ?? ''} ${member.last_name ?? ''}`)
      const email = normalizeText(member.email ?? '')
      const phone = normalizeText(member.phone ?? '')

      return fullName.includes(normalizedQuery) || email.includes(normalizedQuery) || phone.includes(normalizedQuery)
    })
  }, [members, roleFilter, searchQuery])

  const hasActiveFilters = searchQuery.trim().length > 0 || roleFilter !== 'all'

  function clearFilters() {
    setSearchQuery('')
    setRoleFilter('all')
  }

  if (members.length === 0) {
    return (
      <div className="section-content">
        <div className="empty-state">
          <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <div className="empty-title">Žádní členové</div>
          <div className="empty-description">Pozvěte první členy do vašeho klubu a začněte spolupracovat.</div>
          {isManager && (
            <Link href="/invite" className="btn btn-primary" style={{ display: 'inline-flex', width: 'auto', marginTop: '16px' }}>
              <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Pozvat členy
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="members-directory">
      <div className="members-toolbar">
        <div className="members-search-wrap">
          <svg className="members-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="members-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hledat jméno, e-mail nebo telefon"
            aria-label="Vyhledat členy"
          />
        </div>

        <select
          className="members-role-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Filtrovat podle role"
        >
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="members-results-row">
        <div className="members-results-count">Zobrazeno {filteredMembers.length} z {members.length} členů</div>
        {hasActiveFilters && (
          <button className="members-clear-btn" type="button" onClick={clearFilters}>
            Vymazat filtry
          </button>
        )}
      </div>

      <div className="members-filter-pills">
        {roleOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`members-filter-pill ${roleFilter === option.value ? 'active' : ''}`}
            onClick={() => setRoleFilter(option.value)}
          >
            {option.label}
            <span className="members-filter-count">{option.count}</span>
          </button>
        ))}
      </div>

      {filteredMembers.length === 0 ? (
        <div className="members-empty-filter">
          <div className="members-empty-filter-title">Žádní členové neodpovídají filtru</div>
          <div className="members-empty-filter-description">
            Zkuste upravit vyhledávání nebo vybrat jinou roli.
          </div>
          <button className="btn btn-secondary" type="button" onClick={clearFilters} style={{ width: 'auto' }}>
            Obnovit výsledky
          </button>
        </div>
      ) : (
        <div className="member-list">
          {filteredMembers.map((member) => {
            const mInitials =
              (member.first_name?.[0] ?? '').toUpperCase() +
              (member.last_name?.[0] ?? '').toUpperCase()
            const href = member.id === currentUserId ? '/profile' : `/members/${member.id}`

            return (
              <Link key={member.id} href={href} className="member-item">
                {member.profile_picture ? (
                  <img
                    src={`/uploads/profiles/${member.profile_picture}`}
                    alt=""
                    className="member-avatar-img"
                  />
                ) : (
                  <div className="member-avatar">{mInitials}</div>
                )}
                <div className="member-info">
                  <div className="member-name">
                    {member.first_name} {member.last_name}
                  </div>
                  <div className="member-role">{member.role}</div>
                  <div className="member-contact">
                    {member.email}
                    {member.phone && ` · ${member.phone}`}
                  </div>
                </div>
                <span className={`member-badge ${member.role === 'manažer' ? 'manager' : ''}`}>
                  {member.role}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
