'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { WeeklyRoutine, Profile } from '@/types'
import { BrandLogo } from '@/components/BrandLogo'
import { GlassSelect } from '@/components/GlassSelect'

type SavedRoutine = {
  id: string
  name: string
  createdAt: number
  provider: 'Anthropic' | 'OpenAI'
  routine: WeeklyRoutine
}

const ROUTINE_LIBRARY_KEY = 'gymbro:routine-library:v1'

export default function DashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'profile' | 'routine'>('profile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Collapsible sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobileSidebar, setIsMobileSidebar] = useState(false)
  
  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null)
  const [age, setAge] = useState<number | ''>(25)
  const [weight, setWeight] = useState<number | ''>(70)
  const [height, setHeight] = useState<number | ''>(170)
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ftin'>('cm')
  const [heightFeet, setHeightFeet] = useState<number | ''>(5)
  const [heightInches, setHeightInches] = useState<number | ''>(7)
  const [gender, setGender] = useState<Profile['gender']>('Prefer not to say')
  const [goal, setGoal] = useState<Profile['goal']>('General fitness')
  const [level, setLevel] = useState<'Beginner' | 'Regular' | 'Expert'>('Beginner')
  const [tenure, setTenure] = useState('Just started')
  const [goalWeight, setGoalWeight] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  
  // Routine state
  const [routine, setRoutine] = useState<WeeklyRoutine | null>(null)
  const [modelProvider, setModelProvider] = useState<'Anthropic' | 'OpenAI'>('Anthropic')
  const [apiKey, setApiKey] = useState('')
  const [generating, setGenerating] = useState(false)
  const [progressPct, setProgressPct] = useState(0)
  const [progressStage, setProgressStage] = useState('')

  // Routine library (local-only)
  const [savedRoutines, setSavedRoutines] = useState<SavedRoutine[]>([])
  const [saveNameDraft, setSaveNameDraft] = useState('')
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ROUTINE_LIBRARY_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        // Best-effort validation; ignore malformed entries
        const cleaned: SavedRoutine[] = parsed
          .filter((x) => x && typeof x === 'object')
          .slice(0, 25) as SavedRoutine[]
        setSavedRoutines(cleaned)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(ROUTINE_LIBRARY_KEY, JSON.stringify(savedRoutines.slice(0, 25)))
    } catch {
      // ignore
    }
  }, [savedRoutines])

  useEffect(() => {
    // sidebar state persistence + responsive default
    try {
      const saved = localStorage.getItem('gymbro:sidebar-open:v1')
      if (saved === '0' || saved === '1') {
        setSidebarOpen(saved === '1')
      } else if (typeof window !== 'undefined') {
        setSidebarOpen(window.innerWidth >= 1280)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('gymbro:sidebar-open:v1', sidebarOpen ? '1' : '0')
    } catch {
      // ignore
    }
  }, [sidebarOpen])

  useEffect(() => {
    const onResize = () => {
      setIsMobileSidebar(window.innerWidth < 1280)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    // Lock scroll when mobile drawer is open
    if (typeof document === 'undefined') return
    if (isMobileSidebar && sidebarOpen) {
      const prevBody = document.body.style.overflow
      const prevHtml = document.documentElement.style.overflow
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prevBody
        document.documentElement.style.overflow = prevHtml
      }
    }
  }, [isMobileSidebar, sidebarOpen])

  const routineStats = useMemo(() => {
    if (!routine) return null
    const days = routine.days?.length ?? 0
    const exercises = (routine.days ?? []).reduce((acc, d) => acc + (d.exercises?.length ?? 0), 0)
    const avgPerDay = days > 0 ? Math.round((exercises / days) * 10) / 10 : 0
    return { days, exercises, avgPerDay }
  }, [routine])

  const todayIndex = useMemo(() => {
    // Map JS Sunday(0) -> Monday(0)
    return (new Date().getDay() + 6) % 7
  }, [])

  const todaysPlan = useMemo(() => {
    if (!routine?.days?.length) return null
    const idx = Math.min(todayIndex, routine.days.length - 1)
    return { idx, day: routine.days[idx] }
  }, [routine, todayIndex])

  const makeId = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = typeof crypto !== 'undefined' ? crypto : null
    if (c?.randomUUID) return c.randomUUID() as string
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  const handleSaveCurrentRoutine = () => {
    if (!routine) return
    const name =
      saveNameDraft.trim() ||
      `Routine • ${new Date().toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}`

    const item: SavedRoutine = {
      id: makeId(),
      name,
      createdAt: Date.now(),
      provider: modelProvider,
      routine,
    }

    setSavedRoutines((prev) => [item, ...prev].slice(0, 25))
    setActiveSavedId(item.id)
    setSaveNameDraft('')
    setSuccess('Routine saved to your library.')
  }

  const handleLoadSavedRoutine = (id: string) => {
    const found = savedRoutines.find((r) => r.id === id)
    if (!found) return
    setRoutine(found.routine)
    setActiveSavedId(found.id)
    setActiveTab('routine')
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
    setSuccess(`Loaded: ${found.name}`)
  }

  const handleDeleteSavedRoutine = (id: string) => {
    setSavedRoutines((prev) => prev.filter((r) => r.id !== id))
    if (activeSavedId === id) setActiveSavedId(null)
  }

  const handleClearRoutine = () => {
    setRoutine(null)
    setActiveSavedId(null)
    setSuccess('Cleared current routine.')
  }

  const handleCopyRoutineJson = async () => {
    if (!routine) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(routine, null, 2))
      setSuccess('Copied routine JSON to clipboard.')
    } catch {
      setError('Failed to copy. Your browser may block clipboard access.')
    }
  }

  const handleJumpToToday = () => {
    if (!todaysPlan) return
    const el = document.getElementById(`day-${todaysPlan.idx}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const levelOptions = useMemo(
    () => [
      { value: 'Beginner', label: 'Beginner' },
      { value: 'Regular', label: 'Regular' },
      { value: 'Expert', label: 'Expert' },
    ] as const,
    []
  )

  const genderOptions = useMemo(
    () =>
      [
        { value: 'Male', label: 'Male' },
        { value: 'Female', label: 'Female' },
        { value: 'Non-binary', label: 'Non-binary' },
        { value: 'Prefer not to say', label: 'Prefer not to say' },
      ] as const,
    []
  )

  const goalOptions = useMemo(
    () =>
      [
        { value: 'General fitness', label: 'General fitness' },
        { value: 'Fat loss', label: 'Fat loss' },
        { value: 'Muscle gain', label: 'Muscle gain' },
        { value: 'Strength', label: 'Strength' },
        { value: 'Recomposition', label: 'Recomposition' },
        { value: 'Endurance', label: 'Endurance' },
      ] as const,
    []
  )

  const providerOptions = useMemo(
    () =>
      [
        { value: 'Anthropic', label: 'Anthropic (Claude)' },
        { value: 'OpenAI', label: 'OpenAI (GPT-4)' },
      ] as const,
    []
  )

  const heightUnitOptions = useMemo(
    () =>
      [
        { value: 'cm', label: 'cm' },
        { value: 'ftin', label: 'ft + in' },
      ] as const,
    []
  )

  const cmToFtIn = (cm: number) => {
    const totalIn = cm / 2.54
    const ft = Math.floor(totalIn / 12)
    const inches = Math.round((totalIn - ft * 12) * 10) / 10
    return { ft, inches }
  }

  const ftInToCm = (ft: number, inches: number) => ft * 30.48 + inches * 2.54

  useEffect(() => {
    // Load preferred height unit (local-only)
    try {
      const raw = localStorage.getItem('gymbro:height-unit:v1')
      if (raw === 'cm' || raw === 'ftin') setHeightUnit(raw)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('gymbro:height-unit:v1', heightUnit)
    } catch {
      // ignore
    }
  }, [heightUnit])

  useEffect(() => {
    // Keep ft/in in sync when switching to ft/in view
    if (heightUnit !== 'ftin') return
    const cm = typeof height === 'number' ? height : 170
    const { ft, inches } = cmToFtIn(cm)
    setHeightFeet(ft)
    setHeightInches(inches)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heightUnit])

  const resolvedHeightCm = useMemo(() => {
    if (heightUnit === 'cm') return typeof height === 'number' ? height : null
    if (typeof heightFeet !== 'number' || typeof heightInches !== 'number') return null
    const inches = Math.max(0, Math.min(11.9, heightInches))
    return Math.round(ftInToCm(heightFeet, inches) * 10) / 10
  }, [height, heightFeet, heightInches, heightUnit])

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.status === 401) {
        router.push('/login')
        return
      }
      const data = await response.json()
      if (data.profile) {
        setProfile(data.profile)
        setAge(typeof data.profile.age === 'number' ? data.profile.age : 25)
        setWeight(typeof data.profile.weight === 'number' ? data.profile.weight : 70)
        setHeight(typeof data.profile.height === 'number' ? data.profile.height : 170)
        setGender(data.profile.gender ?? 'Prefer not to say')
        setGoal(data.profile.goal ?? 'General fitness')
        setLevel(data.profile.level)
        setTenure(data.profile.tenure)
        setGoalWeight(typeof data.profile.goal_weight === 'number' ? data.profile.goal_weight : '')
        setNotes(data.profile.notes ?? '')
      }
    } catch (err: unknown) {
      console.error('Error fetching profile:', err)
    }
  }, [router])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (age === '' || weight === '' || !tenure.trim() || resolvedHeightCm == null) {
        throw new Error('Please fill Age, Weight, Height, and Training Duration.')
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age,
          weight,
          height: resolvedHeightCm,
          gender,
          goal,
          level,
          tenure,
          goal_weight: goalWeight === '' ? undefined : goalWeight,
          notes,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to save profile')
      }

      setSuccess('Profile saved. Your next routine will use these details.')
      await fetchProfile()
      // UX: move user to routine generation immediately
      setActiveTab('routine')
      // Smooth scroll to top so the routine panel is visible (esp. on small screens)
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateRoutine = async () => {
    if (!profile) {
      setError('Please complete your profile first.')
      return
    }
    if (resolvedHeightCm == null) {
      setError('Please provide a valid height before generating.')
      return
    }

    setGenerating(true)
    setProgressPct(5)
    setProgressStage('Starting…')
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/routine/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: profile.age ?? age,
          weight: profile.weight ?? weight,
          height: typeof profile.height === 'number' ? profile.height : resolvedHeightCm,
          gender: (profile.gender ?? gender) || 'Prefer not to say',
          goal: (profile.goal ?? goal) || 'General fitness',
          level: (profile.level ?? level) || 'Beginner',
          tenure: (profile.tenure ?? tenure) || 'Just started',
          goal_weight: profile.goal_weight,
          notes: profile.notes,
          model_provider: modelProvider,
          // Optional: server can use env var if set
          api_key: apiKey?.trim() || undefined,
          stream: true,
        }),
      })

      const contentType = response.headers.get('content-type') || ''

      // SSE streaming mode
      if (contentType.includes('text/event-stream')) {
        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response stream available')

        const decoder = new TextDecoder()
        let buffer = ''
        let currentEvent = 'message'

        // Basic SSE parser (event + data lines)
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          let idx
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const raw = buffer.slice(0, idx)
            buffer = buffer.slice(idx + 2)

            const lines = raw.split('\n').map((l) => l.trimEnd())
            let dataLine = ''
            currentEvent = 'message'

            for (const line of lines) {
              if (line.startsWith('event:')) currentEvent = line.slice(6).trim()
              if (line.startsWith('data:')) dataLine += line.slice(5).trim()
            }

            if (!dataLine) continue
            const payload = JSON.parse(dataLine)

            if (currentEvent === 'progress') {
              setProgressPct(Number(payload.pct) || 0)
              setProgressStage(String(payload.stage || ''))
            } else if (currentEvent === 'routine') {
              setRoutine(payload.routine)
              setSuccess('Routine generated successfully.')
            } else if (currentEvent === 'error') {
              throw new Error(payload.message || 'Failed to generate routine')
            }
          }
        }

        // If the server ended without sending routine, treat as error
        if (!response.ok) {
          throw new Error('Failed to generate routine')
        }
      } else {
        // Fallback JSON mode
        const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate routine')
      }

      setRoutine(data.routine)
      setSuccess('Routine generated successfully.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setGenerating(false)
      setProgressStage('')
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto">
        {/* Mobile overlay */}
        {isMobileSidebar && sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-950/85 backdrop-blur-sm"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Collapsible sidebar */}
        <aside
          className={`fixed z-50 top-0 left-0 h-full w-[92vw] sm:w-[360px] max-w-none p-4 transition-transform ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="h-full">
            <div className="panel-solid rounded-2xl p-5 h-full flex flex-col overflow-hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <BrandLogo size={44} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold tracking-tight bg-gradient-to-r from-cyan-200 via-sky-200 to-violet-200 bg-clip-text text-transparent truncate">
                      GymBro AI
                    </div>
                    <div className="text-xs text-slate-300/70 truncate">Personalized routines.</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="px-2 py-2 rounded-xl glass-soft text-slate-100 hover:text-white transition"
                  aria-label="Close sidebar"
                >
                  ✕
                </button>
              </div>

              {/* Nav */}
              <div className="mt-5 glass-soft rounded-xl p-1 flex">
                <button
                  onClick={() => {
                    setActiveTab('profile')
                    if (isMobileSidebar) setSidebarOpen(false)
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'profile'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                      : 'text-slate-300/70 hover:text-white'
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => {
                    setActiveTab('routine')
                    if (isMobileSidebar) setSidebarOpen(false)
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'routine'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                      : 'text-slate-300/70 hover:text-white'
                  }`}
                >
                  Routine
                </button>
              </div>

              {/* Scrollable content */}
              <div className="mt-6 flex-1 overflow-auto pr-1">
                {/* Push settings to bottom */}
                <div className="flex-1" />

                {/* Settings (bottom-left) */}
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-100">Settings</div>
                  <div className="text-[11px] text-slate-200/60">AI</div>
                </div>

                <div className="mt-3 space-y-3">
                  <GlassSelect
                    label="AI Provider"
                    value={modelProvider}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    options={providerOptions as any}
                    onChange={(v) => setModelProvider(v as 'Anthropic' | 'OpenAI')}
                  />
                  <div>
                    <label className="block text-sm font-medium text-slate-200/90 mb-2">
                      {modelProvider} API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => {
                        const v = e.target.value
                        setApiKey(v)
                        if (v.startsWith('sk-ant-')) setModelProvider('Anthropic')
                        else if (v.startsWith('sk-')) setModelProvider('OpenAI')
                      }}
                      placeholder={`Enter your ${modelProvider} API key`}
                      className="w-full px-4 py-3 glass-soft rounded-xl text-white placeholder:text-slate-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                    />
                    <p className="text-xs text-slate-200/60 mt-2">
                      Used only for requests. Not stored on the server.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main
          className={`transition-[padding,filter,opacity] duration-300 ${
            sidebarOpen ? 'xl:pl-[340px]' : 'xl:pl-0'
          } ${isMobileSidebar && sidebarOpen ? 'pointer-events-none select-none blur-[1px] opacity-40' : ''}`}
        >
          {/* Header */}
          <div className="glass rounded-2xl px-5 py-4 mb-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="px-3 py-2 rounded-xl glass-soft text-slate-100 hover:text-white transition"
                  aria-label="Open sidebar"
                >
                  ☰
                </button>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight bg-gradient-to-r from-cyan-200 via-sky-200 to-violet-200 bg-clip-text text-transparent">
                  GymBro AI
                </h1>
                <p className="text-sm text-slate-300/70">Personalized routines, tuned to your stats.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl glass-soft text-red-200 hover:bg-red-500/10 border border-red-500/30 transition"
              >
                Logout
              </button>
            </div>
          </div>

        {/* Status banners */}
        {(error || success) && (
          <div className="mb-6 space-y-3">
            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200">
                {success}
              </div>
            )}
          </div>
        )}

            {/* Tabs moved to sidebar */}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
              <div className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex items-start justify-between gap-6 mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-slate-100">Update Your Profile</h2>
                <p className="text-sm text-slate-300/70 mt-1">
                  These details are used to tailor your routine intensity, volume, and exercise selection.
                </p>
              </div>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-200/90 mb-2">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => {
                      const v = e.target.value
                      setAge(v === '' ? '' : Number(v))
                    }}
                    min="16"
                    max="100"
                    className="w-full px-4 py-3 glass-soft rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200/90 mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => {
                      const v = e.target.value
                      setWeight(v === '' ? '' : Number(v))
                    }}
                    min="30"
                    max="300"
                    step="0.1"
                    className="w-full px-4 py-3 glass-soft rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <GlassSelect
                      label="Height unit"
                      value={heightUnit}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      options={heightUnitOptions as any}
                      onChange={(v) => setHeightUnit(v as 'cm' | 'ftin')}
                    />

                    {heightUnit === 'cm' ? (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-200/90 mb-2">Height (cm)</label>
                  <input
                    type="number"
                    value={height}
                          onChange={(e) => {
                            const v = e.target.value
                            setHeight(v === '' ? '' : Number(v))
                          }}
                    min="100"
                    max="250"
                    step="0.1"
                          className="w-full px-4 py-3 glass-soft rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                        />
                      </div>
                    ) : (
                      <div className="md:col-span-2 grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-200/90 mb-2">Feet</label>
                          <input
                            type="number"
                            value={heightFeet}
                            onChange={(e) => {
                              const v = e.target.value
                              setHeightFeet(v === '' ? '' : Number(v))
                            }}
                            min="3"
                            max="8"
                            step="1"
                            className="w-full px-4 py-3 glass-soft rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-200/90 mb-2">Inches</label>
                          <input
                            type="number"
                            value={heightInches}
                            onChange={(e) => {
                              const v = e.target.value
                              setHeightInches(v === '' ? '' : Number(v))
                            }}
                            min="0"
                            max="11.9"
                            step="0.1"
                            className="w-full px-4 py-3 glass-soft rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-slate-300/50">
                    Stored as cm: <span className="text-slate-200/80">{resolvedHeightCm ?? '—'}</span>
                  </p>
                </div>

                <GlassSelect
                  label="Experience Level"
                    value={level}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  options={levelOptions as any}
                  onChange={(v) => setLevel(v as 'Beginner' | 'Regular' | 'Expert')}
                />

                <div>
                  <GlassSelect
                    label="Gender"
                    value={gender}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    options={genderOptions as any}
                    onChange={(v) => setGender(v as Profile['gender'])}
                  />
                  <p className="text-xs text-slate-300/50 mt-2">
                    Used only to tailor exercise selection and recovery assumptions (no storage beyond your profile).
                  </p>
                </div>

                <GlassSelect
                  label="Goal"
                    value={goal}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  options={goalOptions as any}
                  onChange={(v) => setGoal(v as Profile['goal'])}
                />

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-200/90 mb-2">Training Duration</label>
                  <input
                    type="text"
                    value={tenure}
                    onChange={(e) => setTenure(e.target.value)}
                    placeholder="e.g., '6 months' or 'Just started'"
                    className="w-full px-4 py-3 glass-soft rounded-xl text-white placeholder:text-slate-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-200/90 mb-2">Goal Weight (kg)</label>
                  <input
                    type="number"
                    value={goalWeight}
                    onChange={(e) => {
                      const v = e.target.value
                      setGoalWeight(v === '' ? '' : Number(v))
                    }}
                    min="30"
                    max="300"
                    step="0.1"
                    placeholder="Optional (e.g., 72)"
                    className="w-full px-4 py-3 glass-soft rounded-xl text-white placeholder:text-slate-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                  />
                  <p className="text-xs text-slate-300/50 mt-2">
                    Optional — helps the routine bias toward the right intensity/cardio/recovery strategy.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-200/90 mb-2">Additional comments</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Injuries, goals (fat loss/strength/hypertrophy), equipment limits, days per week, exercises you love/hate, etc."
                    rows={4}
                    className="w-full px-4 py-3 glass-soft rounded-xl text-white placeholder:text-slate-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 resize-y"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-cyan-500/10"
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>
        )}

        {/* Routine Tab */}
        {activeTab === 'routine' && (
          <div className="space-y-6">
                <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
              {/* Generation panel */}
                  <div className="2xl:col-span-1 glass rounded-2xl p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-100">Generate Workout Routine</h2>
                    <p className="text-sm text-slate-300/70 mt-1">
                      Uses your profile (including gender and comments) to tailor volume and recovery.
                    </p>
                  </div>
                  {profile && (
                    <button
                      onClick={() => setActiveTab('profile')}
                      className="shrink-0 px-3 py-2 rounded-xl glass-soft text-slate-200 hover:text-white transition"
                    >
                      Edit profile
                    </button>
                  )}
                </div>

                {/* Profile summary */}
                {profile ? (
                  <div className="mb-6 glass-soft rounded-xl p-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-200 border border-cyan-500/30 text-sm">
                        {profile.level}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-200 border border-emerald-500/30 text-sm">
                        {profile.goal}
                      </span>
                      <span className="px-3 py-1 rounded-full glass-soft text-slate-200 text-sm">
                        {profile.age}y
                      </span>
                      <span className="px-3 py-1 rounded-full glass-soft text-slate-200 text-sm">
                        {profile.weight}kg
                      </span>
                      {typeof profile.goal_weight === 'number' && (
                        <span className="px-3 py-1 rounded-full glass-soft text-slate-200 text-sm">
                          Goal {profile.goal_weight}kg
                        </span>
                      )}
                      <span className="px-3 py-1 rounded-full glass-soft text-slate-200 text-sm">
                        {profile.height}cm
                      </span>
                      <span className="px-3 py-1 rounded-full glass-soft text-slate-200 text-sm">
                        {profile.gender}
                      </span>
                      <span className="px-3 py-1 rounded-full glass-soft text-slate-200 text-sm">
                        {profile.tenure}
                      </span>
                    </div>
                    {profile.notes && (
                      <p className="text-sm text-slate-200/80 mt-3 line-clamp-3">
                        <span className="text-slate-300/60">Notes:</span> {profile.notes}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-200">
                    Please complete your profile first — routine generation is disabled until then.
                  </div>
                )}

                <div className="mb-6 glass-soft rounded-xl p-4">
                  <div className="text-sm font-semibold text-slate-100">AI settings</div>
                  <p className="text-sm text-slate-200/70 mt-1">
                    Provider + API key are now in the sidebar under <span className="text-slate-100">Settings</span>.
                  </p>
                </div>

                <button
                  onClick={handleGenerateRoutine}
                  disabled={generating || !profile}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-cyan-500/10"
                >
                  {generating ? 'Generating…' : 'Generate New Routine'}
                </button>

                {/* Progress */}
                {generating && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-300/70 mb-2">
                      <span>{progressStage || 'Working…'}</span>
                      <span>{Math.min(100, Math.max(0, progressPct))}%</span>
                    </div>
                    <div className="h-2 w-full glass-soft rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-300/50">
                      If you see “Connection error”, your network may be blocking access to the AI provider.
                    </p>
                  </div>
                )}
              </div>

            {/* Routine Display */}
                  <div className="2xl:col-span-2 glass rounded-2xl p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-100">Your Weekly Routine</h3>
                    {routineStats && (
                      <p className="text-sm text-slate-200/70 mt-1">
                        {routineStats.days} days • {routineStats.exercises} exercises • {routineStats.avgPerDay} avg/day
                      </p>
                    )}
                  </div>
                  {!routine && (
                    <span className="text-sm text-slate-300/70">Generate to see your plan here</span>
                  )}
                  {routine && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyRoutineJson}
                        className="px-3 py-2 rounded-xl glass-soft text-slate-100 hover:text-white transition text-sm"
                      >
                        Copy JSON
                      </button>
                      <button
                        type="button"
                        onClick={handleClearRoutine}
                        className="px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/20 text-red-100 transition text-sm"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {!routine ? (
                  <div className="glass-soft rounded-xl p-6 text-slate-200/80">
                    <p className="text-sm text-slate-300/70">
                      Tip: Add injuries/goals in “Additional comments” to get safer, more relevant routines.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Today spotlight */}
                    {todaysPlan && (
                      <div className="glass-soft rounded-2xl p-5 overflow-hidden">
                        <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400 opacity-80 rounded-full" />
                        <div className="mt-4 flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm text-slate-200/70">Today’s workout</div>
                            <div className="text-lg font-semibold text-slate-100 mt-1">
                              {todaysPlan.day.day}
                            </div>
                            <div className="mt-2 text-sm text-slate-200/70">
                              {todaysPlan.day.exercises.length} exercises
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleJumpToToday}
                            className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold shadow-lg shadow-cyan-500/10"
                          >
                            Jump to day
                          </button>
                        </div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                          {todaysPlan.day.exercises.slice(0, 3).map((ex, i) => (
                            <div key={i} className="glass-soft rounded-xl p-3">
                              <div className="text-sm font-semibold text-slate-100 line-clamp-1">{ex.name}</div>
                              <div className="text-xs text-slate-200/70 mt-1 line-clamp-1">{ex.sets_reps}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Save bar */}
                    <div className="glass-soft rounded-2xl p-4">
                      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                        <div className="flex-1 flex gap-2">
                          <input
                            value={saveNameDraft}
                            onChange={(e) => setSaveNameDraft(e.target.value)}
                            placeholder="Name this routine to save it…"
                            className="flex-1 px-3 py-2 glass-soft rounded-xl text-sm text-white placeholder:text-slate-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                          />
                          <button
                            type="button"
                            onClick={handleSaveCurrentRoutine}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold"
                          >
                            Save to Library
                          </button>
                        </div>
                        <div className="text-xs text-slate-200/60">
                          Saved locally • {savedRoutines.length}/25 stored
                        </div>
                      </div>
                    </div>

                    {routine.days.map((day, dayIndex) => (
                      <div id={`day-${dayIndex}`} key={dayIndex} className="glass-soft rounded-2xl p-5">
                        <h4 className="text-lg font-semibold text-slate-100 mb-4">{day.day}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {day.exercises.map((exercise, exIndex) => (
                            <div
                              key={exIndex}
                              className="glass-soft rounded-xl p-4 hover:ring-1 hover:ring-cyan-400/40 transition"
                            >
                              <div className="flex justify-between items-start gap-3 mb-2">
                                <h5 className="text-base font-semibold text-cyan-300">{exercise.name}</h5>
                                <a
                                  href={exercise.youtube_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-3 py-1 rounded-full bg-red-600/80 hover:bg-red-600 text-white transition"
                                >
                                  Watch
                                </a>
                              </div>
                              <p className="text-slate-200/90 text-sm mb-2">{exercise.sets_reps}</p>
                              <details className="text-sm text-slate-300/70">
                                <summary className="cursor-pointer hover:text-cyan-200 transition">
                                  Form guide
                                </summary>
                                <p className="mt-2 pl-4 border-l-2 border-white/10 text-slate-200/80">{exercise.form_tip}</p>
                              </details>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
          </main>
      </div>
    </div>
  )
}
