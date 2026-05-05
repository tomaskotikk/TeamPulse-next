'use client'

import { useCallback, useEffect, useState } from 'react'
import { Layers, Pencil, Plus, RefreshCw, Sparkles, Trash2, UserPlus, X } from 'lucide-react'
import type { CategoryTemplate, ClubCategory } from '@/lib/types'
import styles from './categories.module.css'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#6366f1', '#a855f7', '#ec4899',
  '#14b8a6', '#84cc16',
]

type MemberRow = {
  id: number
  category_id: number
  user_id: number
  manual_override: boolean
  excluded: boolean
  users: {
    id: number
    first_name: string
    last_name: string
    profile_picture: string | null
    role: string
    dateBirth: string | null
  } | null
}

type ClubMember = {
  id: number
  first_name: string
  last_name: string
  profile_picture: string | null
  role: string
  dateBirth: string | null
}

type Modal =
  | { type: 'create' }
  | { type: 'edit'; category: ClubCategory }
  | { type: 'templates' }
  | { type: 'addMember'; categoryId: number }
  | null

function initials(first: string, last: string) {
  return (first[0] ?? '').toUpperCase() + (last[0] ?? '').toUpperCase()
}

function birthYearLabel(from: number | null, to: number | null) {
  if (from == null && to == null) return null
  if (from != null && to != null) return `roč. ${from}–${to}`
  if (to != null) return `do ${to}`
  return `od ${from}`
}

export default function CategoriesClient() {
  const [categories, setCategories] = useState<ClubCategory[]>([])
  const [templates, setTemplates] = useState<CategoryTemplate[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [allClubMembers, setAllClubMembers] = useState<ClubMember[]>([])
  const [loadingCats, setLoadingCats] = useState(true)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [modal, setModal] = useState<Modal>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resyncing, setResyncing] = useState(false)
  const [resyncMsg, setResyncMsg] = useState<string | null>(null)

  // Form state for create/edit
  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState(PRESET_COLORS[5])
  const [formYearFrom, setFormYearFrom] = useState('')
  const [formYearTo, setFormYearTo] = useState('')

  // Template modal
  const [activeTemplate, setActiveTemplate] = useState<CategoryTemplate | null>(null)

  // Add member search
  const [memberSearch, setMemberSearch] = useState('')

  const loadCategories = useCallback(async () => {
    setLoadingCats(true)
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      if (res.ok) {
        setCategories(data.categories ?? [])
        setTemplates(data.templates ?? [])
      }
    } finally {
      setLoadingCats(false)
    }
  }, [])

  const loadMembers = useCallback(async (categoryId: number) => {
    setLoadingMembers(true)
    try {
      const res = await fetch(`/api/categories/members?category_id=${categoryId}`)
      const data = await res.json()
      if (res.ok) {
        setMembers(data.members ?? [])
        setAllClubMembers(data.allClubMembers ?? [])
      }
    } finally {
      setLoadingMembers(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    if (selected != null) {
      loadMembers(selected)
    }
  }, [selected, loadMembers])

  function openCreate() {
    setFormName('')
    setFormColor(PRESET_COLORS[5])
    setFormYearFrom('')
    setFormYearTo('')
    setError(null)
    setModal({ type: 'create' })
  }

  function openEdit(cat: ClubCategory) {
    setFormName(cat.name)
    setFormColor(cat.color)
    setFormYearFrom(cat.birth_year_from != null ? String(cat.birth_year_from) : '')
    setFormYearTo(cat.birth_year_to != null ? String(cat.birth_year_to) : '')
    setError(null)
    setModal({ type: 'edit', category: cat })
  }

  async function saveCategory() {
    const name = formName.trim()
    if (!name) { setError('Název je povinný.'); return }
    setSaving(true)
    setError(null)

    const payload = {
      name,
      color: formColor,
      birth_year_from: formYearFrom ? Number(formYearFrom) : null,
      birth_year_to: formYearTo ? Number(formYearTo) : null,
    }

    try {
      if (modal?.type === 'edit') {
        const res = await fetch('/api/categories', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: modal.category.id, ...payload }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Chyba.'); return }
        setCategories((prev) => prev.map((c) => c.id === modal.category.id ? { ...data.category, member_count: c.member_count } : c))
      } else {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Chyba.'); return }
        setCategories((prev) => [...prev, data.category])
        setSelected(data.category.id)
      }
      setModal(null)
    } finally {
      setSaving(false)
    }
  }

  async function deleteCategory() {
    if (modal?.type !== 'edit') return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/categories?id=${modal.category.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Chyba.'); return }
      setCategories((prev) => prev.filter((c) => c.id !== modal.category.id))
      if (selected === modal.category.id) setSelected(null)
      setModal(null)
    } finally {
      setSaving(false)
    }
  }

  async function resyncAll() {
    setResyncing(true)
    setResyncMsg(null)
    try {
      const res = await fetch('/api/categories/resync', { method: 'POST' })
      if (!res.ok) { const d = await res.json(); setResyncMsg(d.error ?? 'Chyba.'); return }
      await loadCategories()
      if (selected != null) await loadMembers(selected)
      setResyncMsg('Přiřazení bylo úspěšně aktualizováno.')
      setTimeout(() => setResyncMsg(null), 4000)
    } finally {
      setResyncing(false)
    }
  }

  async function applyTemplate(templateName: string) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/categories/apply-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: templateName }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Chyba.'); return }
      await loadCategories()
      setModal(null)
    } finally {
      setSaving(false)
    }
  }

  async function removeMember(userId: number) {
    if (selected == null) return
    await fetch(`/api/categories/members?category_id=${selected}&user_id=${userId}`, { method: 'DELETE' })
    setMembers((prev) => prev.filter((m) => m.user_id !== userId))
    setCategories((prev) => prev.map((c) => c.id === selected ? { ...c, member_count: (c.member_count ?? 1) - 1 } : c))
  }

  async function addMember(userId: number) {
    if (selected == null) return
    const res = await fetch('/api/categories/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id: selected, user_id: userId }),
    })
    if (!res.ok) return
    await loadMembers(selected)
    setCategories((prev) => prev.map((c) => c.id === selected ? { ...c, member_count: (c.member_count ?? 0) + 1 } : c))
    setModal(null)
  }

  const selectedCat = categories.find((c) => c.id === selected) ?? null
  const memberUserIds = new Set(members.map((m) => m.user_id))
  const filteredPicker = allClubMembers.filter((m) => {
    const q = memberSearch.toLowerCase()
    return `${m.first_name} ${m.last_name}`.toLowerCase().includes(q)
  })

  return (
    <>
      <div className={styles.root}>
        {/* ─── Left sidebar ─── */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h3 className={styles.sidebarTitle}>Moje kategorie</h3>
            <div className={styles.headerBtns}>
              <button
                type="button"
                className={styles.iconBtn}
                title="Přiřadit znovu podle data narození"
                onClick={resyncAll}
                disabled={resyncing}
              >
                <RefreshCw size={15} className={resyncing ? styles.spinning : undefined} />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                title="Použít šablonu"
                onClick={() => { setActiveTemplate(templates[0] ?? null); setModal({ type: 'templates' }) }}
              >
                <Sparkles size={15} />
              </button>
              <button type="button" className={styles.createBtn} onClick={openCreate}>
                <Plus size={14} />
                Nová
              </button>
            </div>
          </div>
          {resyncMsg && (
            <div className={styles.resyncMsg}>{resyncMsg}</div>
          )}

          {loadingCats ? (
            <div className={styles.emptyList}>Načítám…</div>
          ) : categories.length === 0 ? (
            <div className={styles.emptyList}>
              Žádné kategorie.<br />Vytvořte první nebo použijte šablonu.
            </div>
          ) : (
            <div className={styles.categoryList}>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`${styles.categoryItem} ${selected === cat.id ? styles.active : ''}`}
                  onClick={() => setSelected(cat.id)}
                >
                  <span className={styles.catDot} style={{ background: cat.color }} />
                  <span className={styles.catName}>{cat.name}</span>
                  <span className={styles.catCount}>{cat.member_count ?? 0}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Right detail ─── */}
        <div className={styles.detail}>
          {selectedCat == null ? (
            <div className={styles.emptyDetail}>
              <div className={styles.emptyDetailIcon}>
                <Layers size={40} />
              </div>
              <p className={styles.emptyDetailText}>Vyberte kategorii</p>
              <p className={styles.emptyDetailSub}>nebo vytvořte novou pomocí tlačítka vlevo</p>
            </div>
          ) : (
            <>
              <div className={styles.detailHeader}>
                <span className={styles.detailDot} style={{ background: selectedCat.color }} />
                <h3 className={styles.detailTitle}>{selectedCat.name}</h3>
                {birthYearLabel(selectedCat.birth_year_from, selectedCat.birth_year_to) && (
                  <span className={styles.detailMeta}>
                    {birthYearLabel(selectedCat.birth_year_from, selectedCat.birth_year_to)}
                  </span>
                )}
                <div className={styles.detailActions}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    title="Upravit kategorii"
                    onClick={() => openEdit(selectedCat)}
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>

              {loadingMembers ? (
                <div className={styles.emptyMembers}>Načítám hráče…</div>
              ) : members.length === 0 ? (
                <div className={styles.emptyMembers}>
                  Žádní hráči v kategorii. Přidejte ručně nebo nastavte rozsah ročníků.
                </div>
              ) : (
                <div className={styles.memberGrid}>
                  {members.map((m) => {
                    const u = m.users
                    if (!u) return null
                    return (
                      <div key={m.id} className={styles.memberCard}>
                        {u.profile_picture ? (
                          <img
                            src={`/uploads/profiles/${u.profile_picture}`}
                            alt=""
                            className={styles.memberAvatar}
                          />
                        ) : (
                          <div className={styles.memberAvatarPlaceholder}>
                            {initials(u.first_name, u.last_name)}
                          </div>
                        )}
                        <div className={styles.memberInfo}>
                          <div className={styles.memberName}>{u.first_name} {u.last_name}</div>
                          <div className={styles.memberRole}>{u.role}</div>
                        </div>
                        <button
                          type="button"
                          className={styles.memberRemoveBtn}
                          title="Odebrat z kategorie"
                          onClick={() => removeMember(m.user_id)}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className={styles.addMemberRow}>
                <button
                  type="button"
                  className={styles.addMemberBtn}
                  onClick={() => { setMemberSearch(''); setModal({ type: 'addMember', categoryId: selectedCat.id }) }}
                >
                  <UserPlus size={14} />
                  Přidat hráče ručně
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── Create / Edit modal ─── */}
      {(modal?.type === 'create' || modal?.type === 'edit') && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h4 className={styles.modalTitle}>
                {modal.type === 'create' ? 'Nová kategorie' : 'Upravit kategorii'}
              </h4>
              <button type="button" className={styles.modalClose} onClick={() => setModal(null)}>
                <X size={16} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {error && <div className={styles.errorMsg}>{error}</div>}

              <div className={styles.formGroup}>
                <label className={styles.label}>Název *</label>
                <input
                  className={styles.input}
                  placeholder="např. U16, Muži, Dorost…"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  maxLength={60}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Rozsah ročníků (volitelné)</label>
                <div className={styles.yearRow}>
                  <input
                    className={styles.input}
                    placeholder="Od (např. 2009)"
                    value={formYearFrom}
                    onChange={(e) => setFormYearFrom(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                  />
                  <span className={styles.yearSep}>–</span>
                  <input
                    className={styles.input}
                    placeholder="Do (např. 2010)"
                    value={formYearTo}
                    onChange={(e) => setFormYearTo(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Barva</label>
                <div className={styles.colorRow}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`${styles.colorSwatch} ${formColor === c ? styles.selected : ''}`}
                      style={{ background: c }}
                      onClick={() => setFormColor(c)}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              {modal.type === 'edit' && (
                <button type="button" className={styles.deleteBtn} onClick={deleteCategory} disabled={saving}>
                  <Trash2 size={14} style={{ marginRight: 5 }} />
                  Smazat
                </button>
              )}
              <button type="button" className={styles.cancelBtn} onClick={() => setModal(null)}>Zrušit</button>
              <button type="button" className={styles.saveBtn} onClick={saveCategory} disabled={saving}>
                {saving ? 'Ukládám…' : 'Uložit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Templates modal ─── */}
      {modal?.type === 'templates' && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={`${styles.modal} ${styles.modalLg}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h4 className={styles.modalTitle}>Šablony kategorií</h4>
              <button type="button" className={styles.modalClose} onClick={() => setModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div className={styles.templateTabs}>
              {templates.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  className={`${styles.templateTab} ${activeTemplate?.name === t.name ? styles.activeTab : ''}`}
                  onClick={() => setActiveTemplate(t)}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {activeTemplate && (
              <div className={styles.modalBody} style={{ paddingTop: 0 }}>
                {error && <div className={styles.errorMsg}>{error}</div>}
                <div className={styles.templatePreviewList}>
                  {activeTemplate.categories.map((cat, i) => (
                    <div key={i} className={styles.templatePreviewItem}>
                      <span className={styles.templatePreviewDot} style={{ background: cat.color }} />
                      <span className={styles.templatePreviewName}>{cat.name}</span>
                      <span className={styles.templatePreviewYears}>
                        {birthYearLabel(cat.birth_year_from, cat.birth_year_to) ?? 'bez omezení'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setModal(null)}>Zrušit</button>
              <button
                type="button"
                className={styles.saveBtn}
                disabled={saving || !activeTemplate}
                onClick={() => activeTemplate && applyTemplate(activeTemplate.name)}
              >
                {saving ? 'Aplikuji…' : `Použít šablonu ${activeTemplate?.name ?? ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add member modal ─── */}
      {modal?.type === 'addMember' && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h4 className={styles.modalTitle}>Přidat hráče do kategorie</h4>
              <button type="button" className={styles.modalClose} onClick={() => setModal(null)}>
                <X size={16} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <input
                className={styles.searchInput}
                placeholder="Hledat jméno…"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                autoFocus
              />
              <div className={styles.memberPickerList}>
                {filteredPicker.length === 0 && (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-dim)', fontSize: 13 }}>
                    Žádný výsledek
                  </div>
                )}
                {filteredPicker.map((m) => {
                  const already = memberUserIds.has(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`${styles.memberPickerItem} ${already ? styles.alreadyIn : ''}`}
                      onClick={() => !already && addMember(m.id)}
                      title={already ? 'Již v kategorii' : undefined}
                    >
                      {m.profile_picture ? (
                        <img
                          src={`/uploads/profiles/${m.profile_picture}`}
                          alt=""
                          className={styles.memberPickerAvatar}
                        />
                      ) : (
                        <div className={styles.memberPickerAvatarPh}>
                          {initials(m.first_name, m.last_name)}
                        </div>
                      )}
                      <div>
                        <div className={styles.mpName}>{m.first_name} {m.last_name}</div>
                        <div className={styles.mpRole}>{m.role}{already ? ' · již přidán' : ''}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
