'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from './parent.module.css'

type Child = { id: number; first_name: string; last_name: string; profile_picture: string | null }

export default function ChildSwitcher({ items, selectedId }: { items: Child[]; selectedId: number }) {
  const router = useRouter()
  const [pending, setPending] = useState<number | null>(null)

  async function select(childId: number) {
    if (childId === selectedId) return
    setPending(childId)
    try {
      const res = await fetch('/api/parent/select-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId }),
      })
      if (res.ok) router.refresh()
    } finally {
      setPending(null)
    }
  }

  return (
    <div className={styles.switcher} role="group" aria-label="Vyberte dítě">
      {items.map((child) => (
        <button
          key={child.id}
          type="button"
          className={styles.childTab}
          aria-pressed={child.id === selectedId}
          onClick={() => select(child.id)}
          disabled={pending !== null}
        >
          {child.profile_picture ? (
            <img src={`/uploads/profiles/${child.profile_picture}`} alt="" className={styles.avatar} />
          ) : (
            <span className={styles.avatar} aria-hidden="true">
              {(child.first_name[0] ?? '').toUpperCase()}
              {(child.last_name[0] ?? '').toUpperCase()}
            </span>
          )}
          {child.first_name} {child.last_name}
        </button>
      ))}
    </div>
  )
}
