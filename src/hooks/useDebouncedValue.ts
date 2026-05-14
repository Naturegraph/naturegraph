/**
 * useDebouncedValue — Debounce une valeur (search input, autocomplete, etc.)
 *
 * Refs : audit Phase 3 (BATCH 41) — pattern duplique
 * (AdminUsers.tsx l'implemente inline avec useState + useEffect + setTimeout).
 *
 * Comportement :
 *   - Retourne `value` apres un delai d'inactivite de `delay` ms
 *   - Si `value` change avant la fin du delai, le timer est reset
 *   - Cleanup automatique au unmount
 *
 * Usage :
 *   ```ts
 *   const [search, setSearch] = useState('')
 *   const debouncedSearch = useDebouncedValue(search, 300)
 *
 *   useEffect(() => {
 *     // fetch avec debouncedSearch (n'est trigger que 300ms apres la derniere frappe)
 *   }, [debouncedSearch])
 *   ```
 */

import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
