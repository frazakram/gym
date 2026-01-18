'use client'

import { useEffect, useRef } from 'react'

interface RoutineHistoryItem {
  id: number
  week_number: number
  week_start_date?: string | null
  created_at: string
  routine_json: any
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  routines: RoutineHistoryItem[]
  currentRoutineId: number | null
  onSelectRoutine: (routine: RoutineHistoryItem) => void
  loading: boolean
}

export function Sidebar({ 
  isOpen, 
  onClose, 
  routines, 
  currentRoutineId, 
  onSelectRoutine,
  loading 
}: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null)

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
            ) : routines.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No saved routines found.</p>
            ) : (
              routines.map((routine) => {
                const isSelected = currentRoutineId === routine.id
                const raw = routine.week_start_date || routine.created_at
                const date = new Date(raw).toLocaleDateString(undefined, {
                  month: 'short', 
                  day: 'numeric'
                })
                
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
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-semibold ${isSelected ? 'text-cyan-400' : 'text-slate-200'}`}>
                        Week {routine.week_number}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{routine.routine_json?.days?.length || 0} Days</span>
                      <span>{date}</span>
                    </div>
                  </button>
                )
              })
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
