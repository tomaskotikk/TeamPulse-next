import { useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { api } from './api'

/** In-memory cache shared by all screens: show last data instantly, refresh in the background. */
const cache = new Map<string, unknown>()

export function primeCache(path: string, value: unknown) {
  if (!cache.has(path)) cache.set(path, value)
}

export function clearCache() {
  cache.clear()
}

/** Loads `path` when the screen gains focus (stale-while-revalidate). */
export function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T | null>(() => (path ? ((cache.get(path) as T | undefined) ?? null) : null))
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const pathRef = useRef(path)

  // path changed (e.g. parent switched child): show that path's cached data right away
  if (pathRef.current !== path) {
    pathRef.current = path
    const cached = path ? ((cache.get(path) as T | undefined) ?? null) : null
    if (cached !== data) setData(cached)
  }

  const load = useCallback(async (asRefresh = false) => {
    const current = pathRef.current
    if (!current) return
    if (asRefresh) setRefreshing(true)
    try {
      const result = await api<T>(current)
      cache.set(current, result)
      if (pathRef.current === current) {
        setData(result)
        setError(null)
      }
    } catch (err) {
      if (pathRef.current === current) setError(err instanceof Error ? err.message : 'Nepodařilo se načíst data.')
    } finally {
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load, path]),
  )

  return { data, error, refreshing, refresh: () => load(true), reload: () => load() }
}
