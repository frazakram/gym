'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Archive, ArchiveRestore, Trash2, Loader2, Key, ChevronDown, Eye, EyeOff, Check } from 'lucide-react'

interface RoutineHistoryItem {
  id: number
  week_number: number
  week_start_date?: string | null
  archived?: boolean
  archived_at?: string | null
  created_at: string
  routine_json: any
}

interface AISettings {
  apiKey: string
  modelProvider: 'OpenAI' | 'Anthropic'
  model: string
  onApiKeyChange: (key: string) => void
  onModelProviderChange: (provider: 'OpenAI' | 'Anthropic') => void
  onModelChange: (model: string) => void
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
  aiSettings?: AISettings
}

const OPENAI_MODELS = [
  { id: '', label: 'Default (gpt-4o)' },
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { id: 'gpt-4.1', label: 'GPT-4.1' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
]

const ANTHROPIC_MODELS = [
  { id: '', label: 'Default (Claude 3.5 Sonnet)' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
]

export function Sidebar({
  isOpen,
  onClose,
  routines,
  currentRoutineId,
  onSelectRoutine,
  onArchiveRoutine,
  onDeleteRoutine,
  loading,
  aiSettings,
}: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [showAISettings, setShowAISettings] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [keySaved, setKeySaved] = useState(false)

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

  // Load saved AI settings from localStorage
  useEffect(() => {
    if (!aiSettings) return
    try {
      const saved = localStorage.getItem('gymbro_ai_settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.apiKey) aiSettings.onApiKeyChange(parsed.apiKey)
        if (parsed.modelProvider) aiSettings.onModelProviderChange(parsed.modelProvider)
        if (parsed.model) aiSettings.onModelChange(parsed.model)
      }
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveAISettings = () => {
    if (!aiSettings) return
    try {
      localStorage.setItem('gymbro_ai_settings', JSON.stringify({
        apiKey: aiSettings.apiKey,
        modelProvider: aiSettings.modelProvider,
        model: aiSettings.model,
      }))
      setKeySaved(true)
      setTimeout(() => setKeySaved(false), 2000)
    } catch {}
  }

  const models = aiSettings?.modelProvider === 'Anthropic' ? ANTHROPIC_MODELS : OPENAI_MODELS

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
            ? 'bg-primary/10 border-primary/40 shadow-lg shadow-primary/10'
            : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-primary/15'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={`font-semibold ${isSelected ? 'text-primary-light' : 'text-slate-200'}`}>
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
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-primary/10 transition"
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
            className="fixed inset-0 bg-navy-0/85 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Drawer */}
      <motion.div
        ref={sidebarRef}
        initial={false}
        animate={{ x: isOpen ? 0 : -288 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 left-0 w-72 bg-navy-0/98 border-r border-primary/15 z-50 backdrop-blur-xl"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-primary/10 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white font-display">History</h2>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-primary/10 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : active.length === 0 && archived.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No saved routines found.</p>
            ) : (
              <>
                <div className="text-xs font-semibold text-muted uppercase tracking-wider px-1">Saved weeks</div>
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
                      <span className="text-primary">{showArchived ? 'Hide' : 'Show'}</span>
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

          {/* AI Settings Section */}
          {aiSettings && (
            <div className="border-t border-primary/10">
              <button
                type="button"
                onClick={() => setShowAISettings((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-white hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  <span>AI Settings</span>
                  {aiSettings.apiKey && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" title="API key configured" />
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showAISettings ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showAISettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {/* Provider Selection */}
                      <div>
                        <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                          Provider
                        </label>
                        <div className="mt-1.5 flex gap-2">
                          {(['OpenAI', 'Anthropic'] as const).map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                aiSettings.onModelProviderChange(p)
                                aiSettings.onModelChange('') // Reset model on provider change
                              }}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                                aiSettings.modelProvider === p
                                  ? 'bg-primary/15 border-primary/40 text-primary-lighter'
                                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* API Key */}
                      <div>
                        <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                          API Key
                        </label>
                        <div className="mt-1.5 relative">
                          <input
                            type={showKey ? 'text' : 'password'}
                            value={aiSettings.apiKey}
                            onChange={(e) => aiSettings.onApiKeyChange(e.target.value)}
                            placeholder={aiSettings.modelProvider === 'OpenAI' ? 'sk-proj-...' : 'sk-ant-...'}
                            className="w-full px-3 py-2 pr-10 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKey((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition"
                          >
                            {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Model Selection */}
                      <div>
                        <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                          Model
                        </label>
                        <select
                          value={aiSettings.model}
                          onChange={(e) => aiSettings.onModelChange(e.target.value)}
                          className="mt-1.5 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition appearance-none"
                        >
                          {models.map((m) => (
                            <option key={m.id} value={m.id} className="bg-navy-0 text-white">
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Save Button */}
                      <button
                        type="button"
                        onClick={handleSaveAISettings}
                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          keySaved
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                            : 'bg-primary/15 border border-primary/30 text-primary-lighter hover:bg-primary/25'
                        }`}
                      >
                        {keySaved ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Saved
                          </>
                        ) : (
                          'Save Settings'
                        )}
                      </button>

                      <p className="text-xs text-white/60 leading-snug">
                        Your key is stored locally in your browser. It&apos;s sent directly to the AI provider and never stored on our servers.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-primary/10">
            <p className="text-xs text-slate-500 text-center">
              GymBro AI v1.0
            </p>
          </div>
        </div>
      </motion.div>
    </>
  )
}
