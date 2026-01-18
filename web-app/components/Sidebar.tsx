'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

interface RoutineHistoryItem {
  id: number
  week_number: number
  week_start_date?: string | null
  archived?: boolean
  archived_at?: string | null
  created_at: string
  routine_json: any
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  routines: RoutineHistoryItem[]
  currentRoutineId: number | null
  onSelectRoutine: (routine: RoutineHistoryItem) => void
  onArchiveRoutine: (routineId: number, archived: boolean) => void | Promise<void>
  onDeleteRoutine: (routineId: number) => void | Promise<void>
  loading: boolean
}

export function Sidebar({ 
  isOpen, 
  onClose, 
  routines, 
  currentRoutineId, 
  onSelectRoutine,
  onArchiveRoutine,
  onDeleteRoutine,
  loading 
}: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [showArchived, setShowArchived] = useState(false)

  const { active, archived } = useMemo(() => {
    const a: RoutineHistoryItem[] = []
    const ar: RoutineHistoryItem[] = []
    for (const r of routines || []) {
      if (r?.archived) ar.push(r)
      else a.push(r)
    }
    return { active: a, archived: ar }
  }, [routines])

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`} 
      />

      {/* Sidebar Drawer */}
      <div
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 w-72 bg-slate-900 border-r border-white/10 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">History</h2>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
              </div>
            ) : active.length === 0 && archived.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No saved routines found.</p>
            ) : (
              <>
                <div className="text-[11px] font-semibold text-slate-300/70 px-1">Saved weeks</div>
                {active.map((routine) => {
                  const isSelected = currentRoutineId === routine.id
                  const raw = routine.week_start_date || routine.created_at
                  const date = new Date(raw).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

                  return (
                    <button
                      key={routine.id}
                      onClick={() => {
                        onSelectRoutine(routine)
                        onClose()
                      }}
                      className={`w-full p-3 rounded-xl text-left transition-all border ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-900/20'
                          : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`font-semibold ${isSelected ? 'text-cyan-400' : 'text-slate-200'}`}>
                          Week {routine.week_number}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              onArchiveRoutine(routine.id, true)
                            }}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition"
                            aria-label="Archive routine"
                            title="Archive"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8 8-4-4" opacity="0" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 8v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H4V6z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              onDeleteRoutine(routine.id)
                            }}
                            className="p-1.5 rounded-lg text-rose-200/80 hover:text-rose-100 hover:bg-rose-500/10 transition"
                            aria-label="Delete routine"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 11v6M14 11v6" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-8 0h10m-9-3h8a1 1 0 0 1 1 1v2H8V5a1 1 0 0 1 1-1z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{routine.routine_json?.days?.length || 0} Days</span>
                        <span>{date}</span>
                      </div>
                    </button>
                  )
                })}

                {archived.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowArchived((v) => !v)}
                      className="w-full flex items-center justify-between px-1 py-2 text-xs font-semibold text-slate-200/80 hover:text-white transition"
                    >
                      <span>Archived ({archived.length})</span>
                      <span className="text-slate-400">{showArchived ? 'Hide' : 'Show'}</span>
                    </button>

                    {showArchived && (
                      <div className="space-y-2">
                        {archived.map((routine) => {
                          const isSelected = currentRoutineId === routine.id
                          const raw = routine.week_start_date || routine.created_at
                          const date = new Date(raw).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

                          return (
                            <button
                              key={routine.id}
                              onClick={() => {
                                onSelectRoutine(routine)
                                onClose()
                              }}
                              className={`w-full p-3 rounded-xl text-left transition-all border ${
                                isSelected
                                  ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-900/20'
                                  : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className={`font-semibold ${isSelected ? 'text-cyan-400' : 'text-slate-200'}`}>
                                  Week {routine.week_number}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      onArchiveRoutine(routine.id, false)
                                    }}
                                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition"
                                    aria-label="Unarchive routine"
                                    title="Unarchive"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12l1.41 1.41L11 7.83V21h2V7.83l5.59 5.58L20 12l-8-8-8 8z" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      onDeleteRoutine(routine.id)
                                    }}
                                    className="p-1.5 rounded-lg text-rose-200/80 hover:text-rose-100 hover:bg-rose-500/10 transition"
                                    aria-label="Delete routine"
                                    title="Delete"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 11v6M14 11v6" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-8 0h10m-9-3h8a1 1 0 0 1 1 1v2H8V5a1 1 0 0 1 1-1z" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-xs text-slate-400">
                                <span>{routine.routine_json?.days?.length || 0} Days</span>
                                <span>{date}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/5">
            <p className="text-xs text-slate-500 text-center">
              GymBro AI v1.0
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
