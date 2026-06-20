'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, Loader2, Plus } from 'lucide-react'
import type { FoodSearchResult } from '@/types'

interface FoodSearchPanelProps {
  onSearch: (q: string) => Promise<FoodSearchResult[]>
  onSelect: (result: FoodSearchResult) => void
  autoFocus?: boolean
  placeholder?: string
}

/**
 * Debounced search-as-you-type against the food database. Reused by the search
 * modal and the "add ingredient" flow inside the draft editor.
 */
export function FoodSearchPanel({ onSearch, onSelect, autoFocus, placeholder }: FoodSearchPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState(false)
  const reqId = useRef(0)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const myId = ++reqId.current
    const t = setTimeout(async () => {
      const res = await onSearch(q)
      // Ignore out-of-order responses.
      if (myId !== reqId.current) return
      setResults(res)
      setLoading(false)
      setTouched(true)
    }, 350)
    return () => clearTimeout(t)
  }, [query, onSearch])

  return (
    <div className="flex flex-col min-h-0">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder || 'Search foods (e.g. greek yogurt)'}
          className="w-full pl-9 pr-9 py-3 rounded-xl bg-white/5 border border-primary/15 text-sm text-white placeholder:text-muted focus:outline-none focus:border-primary/40 ui-focus-ring"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />}
      </div>

      <div className="mt-3 overflow-y-auto -mx-1 px-1" style={{ maxHeight: '52vh' }}>
        {query.trim().length < 2 ? (
          <p className="text-xs text-muted text-center py-8">Type at least 2 characters to search.</p>
        ) : !loading && touched && results.length === 0 ? (
          <p className="text-xs text-muted text-center py-8">No matches. Try a different term or add it manually.</p>
        ) : (
          <ul className="space-y-2">
            {results.map((r) => (
              <li key={`${r.code ?? r.name}-${r.brand ?? ''}`}>
                <button
                  onClick={() => onSelect(r)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/4 border border-white/8 hover:border-primary/30 hover:bg-primary/8 transition-colors text-left"
                >
                  {r.thumb_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.thumb_url} alt="" className="w-10 h-10 rounded-lg object-cover bg-white/5 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary-light text-sm font-semibold">
                      {r.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{r.name}</p>
                    <p className="text-[11px] text-muted truncate">
                      {r.brand ? `${r.brand} · ` : ''}
                      {Math.round(r.per100g.calories)} kcal / 100g
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-primary shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
