import { useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { api } from './api'

/** Loads `path` when the screen gains focus; exposes pull-to-refresh state. */
export function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const pathRef = useRef(path)
  pathRef.current = path

  const load = useCallback(async (asRefresh = false) => {
    const current = pathRef.current
    if (!current) return
    if (asRefresh) setRefreshing(true)
    try {
      const result = await api<T>(current)
      if (pathRef.current === current) {
        setData(result)
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se načíst data.')
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
