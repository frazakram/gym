'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Archive, ArchiveRestore, Trash2, Loader2 } from 'lucide-react'

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

  const RoutineCard = ({ routine, isArchived = false }: { routine: RoutineHistoryItem; isArchived?: boolean }) => {
    const isSelected = currentRoutineId === routine.id
    const raw = routine.week_start_date || routine.created_at
    const date = new Date(raw).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

    return (
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          onSelectRoutine(routine)
          onClose()
        }}
        className={`w-full p-3 rounded-xl text-left transition-all border ${
          isSelected
            ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/40 shadow-lg shadow-[#8B5CF6]/10'
            : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-[#8B5CF6]/15'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={`font-semibold ${isSelected ? 'text-[#A78BFA]' : 'text-slate-200'}`}>
            Week {routine.week_number}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onArchiveRoutine(routine.id, !isArchived)
              }}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#8B5CF6]/10 transition"
              aria-label={isArchived ? 'Unarchive routine' : 'Archive routine'}
              title={isArchived ? 'Unarchive' : 'Archive'}
            >
              {isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
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
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{routine.routine_json?.days?.length || 0} Days</span>
          <span>{date}</span>
        </div>
      </motion.button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0A0A14]/85 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Drawer */}
      <motion.div
        ref={sidebarRef}
        initial={false}
        animate={{ x: isOpen ? 0 : -288 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 left-0 w-72 bg-[#0A0A14]/98 border-r border-[#8B5CF6]/15 z-50 backdrop-blur-xl"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-[#8B5CF6]/10 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white font-[family-name:var(--font-display)]">History</h2>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#8B5CF6]/10 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
              </div>
            ) : active.length === 0 && archived.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No saved routines found.</p>
            ) : (
              <>
                <div className="text-[11px] font-semibold text-[#8B8DA3] uppercase tracking-wider px-1">Saved weeks</div>
                {active.map((routine) => (
                  <RoutineCard key={routine.id} routine={routine} />
                ))}

                {archived.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowArchived((v) => !v)}
                      className="w-full flex items-center justify-between px-1 py-2 text-xs font-semibold text-slate-200/80 hover:text-white transition"
                    >
                      <span>Archived ({archived.length})</span>
                      <span className="text-[#8B5CF6]">{showArchived ? 'Hide' : 'Show'}</span>
                    </button>

                    <AnimatePresence>
                      {showArchived && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden space-y-2"
                        >
                          {archived.map((routine) => (
                            <RoutineCard key={routine.id} routine={routine} isArchived />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#8B5CF6]/10">
            <p className="text-xs text-slate-500 text-center">
              GymBro AI v1.0
            </p>
          </div>
        </div>
      </motion.div>
    </>
  )
}
