'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { WeeklyRoutine, Profile } from '@/types'
import { BrandLogo } from '@/components/BrandLogo'
import { GlassSelect } from '@/components/GlassSelect'
import YouTubeHoverPreview from '@/components/YouTubeHoverPreview'
import { ExerciseCheckbox } from '@/components/ExerciseCheckbox'
import { getYouTubeId, sanitizeYouTubeUrls } from '@/lib/youtube'

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
  const [goalDuration, setGoalDuration] = useState('')
  const [notes, setNotes] = useState('')

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    type: 'warning' | 'error'
    title: string
    message: string
    emoji?: string
    onConfirm?: () => void
    onCancel?: () => void
  } | null>(null)

  // Smart Trigger State
  const lastGenProfileRef = useRef<string | null>(null)

  // Routine state
  const [routine, setRoutine] = useState<WeeklyRoutine | null>(null)
  const [generating, setGenerating] = useState(false)
  const [progressPct, setProgressPct] = useState(0)
  const [progressStage, setProgressStage] = useState('')
  const [improvingNotes, setImprovingNotes] = useState(false)

  // Progress tracking state
  const [currentRoutineId, setCurrentRoutineId] = useState<number | null>(null)
  const [currentWeekNumber, setCurrentWeekNumber] = useState(1)
  const [exerciseCompletions, setExerciseCompletions] = useState<Map<string, boolean>>(new Map())
  const [userId, setUserId] = useState<number | null>(null)

  // Routine library (local-only)
  const [savedRoutines, setSavedRoutines] = useState<SavedRoutine[]>([])
  const [saveNameDraft, setSaveNameDraft] = useState('')
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null)

  // Mobile UX state
  const [showGenerator, setShowGenerator] = useState(true)
  const [expandedDay, setExpandedDay] = useState<number | null>(null)
  const [showAISettings, setShowAISettings] = useState(true)

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

  const handleImproveNotes = async () => {
    setError('')
    setSuccess('')
    setImprovingNotes(true)
    try {
      const res = await fetch('/api/notes/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes,
          model_provider: 'OpenAI',
        }),
      })
      const data = (await res.json().catch(() => ({}))) as any
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      if (typeof data?.notes !== 'string' || !data.notes.trim()) {
        throw new Error('AI did not return improved notes.')
      }
      setNotes(data.notes.trim())
      setSuccess('Notes improved by AI.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || 'Failed to improve notes.')
    } finally {
      setImprovingNotes(false)
    }
  }

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
    if (error) {
      setModalConfig({
        type: 'error',
        title: 'Oops!',
        message: error,
        emoji: '⚠️',
        onCancel: () => setModalConfig(null)
      })
    }
  }, [error])

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
      provider: 'OpenAI',
      routine,
    }

    setSavedRoutines((prev) => [item, ...prev].slice(0, 25))
    setActiveSavedId(item.id)
    setSaveNameDraft('')
    setSuccess('Routine saved to your library.')
  }

  const saveRoutineToDatabase = async (routineData: WeeklyRoutine) => {
    try {
      // Get userId if we don't have it yet
      let currentUserId = userId
      if (!currentUserId) {
        const profileRes = await fetch('/api/profile')
        const profileData = await profileRes.json()
        if (profileData.profile?.user_id) {
          currentUserId = profileData.profile.user_id
          setUserId(currentUserId)
        } else {
          // Mock user ID fallback
          currentUserId = 999
          setUserId(999)
        }
      }

      const res = await fetch('/api/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekNumber: currentWeekNumber,
          routine: routineData,
        }),
      })

      const data = await res.json()
      if (data.routineId) {
        setCurrentRoutineId(data.routineId)
        // Do NOT reset completions here; we want to keep optimal state
        // setExerciseCompletions(new Map())  <-- REMOVED
        return data.routineId
      }
      return null
    } catch (err) {
      console.error('Error saving routine:', err)
      // Don't fail the whole flow if DB save fails
      return null
    }
  }

  const handleLoadSavedRoutine = async (id: string) => {
    const found = savedRoutines.find((r) => r.id === id)
    if (!found) return
    setRoutine(found.routine)
    // Reset completions when loading a different routine
    setExerciseCompletions(new Map())
    setActiveSavedId(found.id)
    setActiveTab('routine')

    // Sync with DB to enable tracking
    await saveRoutineToDatabase(found.routine)

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

  // NOTE: YouTube URL parsing/validation is centralized in lib/youtube.ts

  const getExerciseYouTubeUrls = (ex: any): string[] => {
    const urls = Array.isArray(ex.youtube_urls)
      ? ex.youtube_urls.filter((x: any) => typeof x === 'string')
      : []
    const legacy = typeof ex.youtube_url === 'string' && ex.youtube_url.trim() ? [ex.youtube_url.trim()] : []
    return sanitizeYouTubeUrls(urls.length ? urls : legacy, 3)
  }

  const getExerciseTutorialPoints = (ex: any): string[] => {
    const pts = Array.isArray(ex.tutorial_points)
      ? ex.tutorial_points
        .filter((x: any) => typeof x === 'string')
        .map((s: string) => s.trim())
        .filter(Boolean)
      : []
    if (pts.length >= 3) return pts.slice(0, 5)
    if (typeof ex.form_tip === 'string' && ex.form_tip.trim()) {
      const parts = ex.form_tip
        .split(/[\n•\-]+/g)
        .map((s: string) => s.trim())
        .filter(Boolean)
      if (parts.length >= 3) return parts.slice(0, 5)
      const sentences = ex.form_tip
        .split('.')
        .map((s: string) => s.trim())
        .filter(Boolean)
      return sentences.slice(0, 5)
    }
    return []
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
    // Load AI settings visibility preference
    try {
      const aiSettingsVisible = localStorage.getItem('gymbro:show-ai-settings:v1')
      if (aiSettingsVisible === '0') setShowAISettings(false)
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
        // Inject username into profile object for easy access
        const extendedProfile = { ...data.profile, username: data.username }
        setProfile(extendedProfile)
        setAge(data.profile.age != null ? Number(data.profile.age) : 25)
        setWeight(data.profile.weight != null ? Number(data.profile.weight) : 70)
        setHeight(data.profile.height != null ? Number(data.profile.height) : 170)
        setGender(data.profile.gender ?? 'Prefer not to say')
        setGoal(data.profile.goal ?? 'General fitness')
        setLevel(data.profile.level)
        setTenure(data.profile.tenure)
        setGoalWeight(data.profile.goal_weight != null ? Number(data.profile.goal_weight) : '')
        setGoalDuration(data.profile.goal_duration ?? '')
        setNotes(data.profile.notes ?? '')
      }
    } catch (err: unknown) {
      console.error('Error fetching profile:', err)
    }
  }, [router])

  const fetchLatestRoutine = useCallback(async () => {
    try {
      const res = await fetch(`/api/routines`)
      const { routine } = await res.json()
      if (routine) {
        setRoutine(routine.routine_json)
        setCurrentRoutineId(routine.id)
        setCurrentWeekNumber(routine.week_number)

        // Fetch completions
        const compRes = await fetch(`/api/completions?routineId=${routine.id}`)
        const { completions } = await compRes.json()

        // Build completion map
        const map = new Map<string, boolean>()
        completions.forEach((c: any) => {
          map.set(`${c.day_index}-${c.exercise_index}`, c.completed)
        })
        setExerciseCompletions(map)
        setActiveTab('routine')

        // Mobile UX: Auto-collapse generator if we have a routine
        if (window.innerWidth < 1280) {
          setShowGenerator(false)
        }

        // Auto-expand today's day
        const dayIdx = (new Date().getDay() + 6) % 7
        const safeIdx = Math.min(dayIdx, routine.routine_json.days.length - 1)
        setExpandedDay(safeIdx)
      }
    } catch (err: unknown) {
      console.error('Error fetching latest routine:', err)
    }
  }, [])

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
          goal_duration: goalDuration,
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

  const handleGenerateRoutine = async (isNextWeek: boolean = false) => {
    if (!profile) {
      setError('Please complete your profile first.')
      return
    }
    if (resolvedHeightCm == null) {
      setError('Please provide a valid height before generating.')
      return
    }

    // Smart Trigger: Check if profile has changed significantly
    const currentProfileHash = JSON.stringify({
      age, weight, height: resolvedHeightCm, gender, goal, level, tenure, goalWeight, goalDuration, notes
    })

    if (!isNextWeek && lastGenProfileRef.current === currentProfileHash) {
      setModalConfig({
        type: 'warning',
        title: 'No Changes Detected',
        message: "You haven't changed your profile since the last generation. The new routine might be very similar.",
        emoji: '🤔',
        onConfirm: () => {
          setModalConfig(null)
          performGeneration(isNextWeek)
        },
        onCancel: () => setModalConfig(null)
      })
      return
    }

    performGeneration(isNextWeek)
  }

  const performGeneration = async (isNextWeek: boolean = false) => {
    if (!profile) {
      setError('Please complete your profile first.')
      return
    }
    if (resolvedHeightCm == null) {
      setError('Please provide a valid height before generating.')
      return
    }
    // Validation is repeated here for safety if called directly, 
    // but the hashing logic below is updated after success.

    // Smart Trigger Logic Removed from here (handled in wrapper)
    const currentProfileHash = JSON.stringify({
      age, weight, height: resolvedHeightCm, gender, goal, level, tenure, goalWeight, goalDuration, notes
    })

    setGenerating(true)
    setProgressPct(5)
    setProgressStage('Starting…')
    setError('')
    setSuccess('')

    try {
      // Determine target week number
      const targetWeekNumber = isNextWeek ? currentWeekNumber + 1 : currentWeekNumber

      const response = await fetch('/api/routine/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: Number(age),
          weight: Number(weight),
          height: Number(resolvedHeightCm),
          gender,
          goal,
          level,
          tenure: (profile.tenure ?? tenure) || 'Just started',
          goal_weight: profile.goal_weight,
          notes: profile.notes,
          goal_duration: profile.goal_duration,
          model_provider: 'OpenAI',
          is_next_week: isNextWeek,
          week_number: targetWeekNumber, // Added for consistency check
        }),
      })

      // Update smart trigger ref on success
      if (response.ok) {
        lastGenProfileRef.current = currentProfileHash
      }

      const contentType = response.headers.get('content-type') || ''

      // SSE streaming mode (Not currently using DB consistency check here - TODO: Add if needed)
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

              if (isNextWeek) {
                setCurrentWeekNumber(prev => prev + 1)
              }

              // Reset completions for new routine
              setExerciseCompletions(new Map())

              // Save routine to database (SSE = Always new)
              await saveRoutineToDatabase(payload.routine)
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
        // Fallback JSON mode (Includes Consistency Check)
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to generate routine')
        }

        setRoutine(data.routine)

        // Handle week number updates
        if (data.week_number) {
          setCurrentWeekNumber(data.week_number)
        } else if (isNextWeek) {
          setCurrentWeekNumber(prev => prev + 1)
        }

        if (data.source === 'db') {
          setSuccess('Loaded existing routine for this week.')
          // Do NOT reset completions if it's the same routine we might have seen before?
          // Actually, if we just generated/loaded it, we should probably fetch completions for it
          if (data.routine_id) {
            setCurrentRoutineId(data.routine_id)
            // Fetch completions for this existing routine
            const compRes = await fetch(`/api/completions?routineId=${data.routine_id}`)
            const { completions } = await compRes.json()
            const map = new Map<string, boolean>()
            completions.forEach((c: any) => {
              map.set(`${c.day_index}-${c.exercise_index}`, c.completed)
            })
            setExerciseCompletions(map)
          }
        } else {
          setSuccess('Routine generated successfully.')
          // Reset completions for new routine
          setExerciseCompletions(new Map())
          // Save routine to database (Only if source == 'ai')
          await saveRoutineToDatabase(data.routine)
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setGenerating(false)
      setProgressStage('')
    }
  }



  const handleResetRoutines = () => {
    setModalConfig({
      type: 'warning',
      title: 'Reset All Routine Data?',
      message: 'This will permanently delete all your saved routines and progress. This action cannot be undone.',
      emoji: '⚠️',
      onConfirm: async () => {
        setModalConfig(null)
        setLoading(true)
        setError('')
        setSuccess('')
        try {
          const res = await fetch('/api/routines/reset', { method: 'DELETE' })
          const data = await res.json()

          if (!res.ok) {
            throw new Error(data?.error || 'Failed to reset routines')
          }

          // Clear local state
          setRoutine(null)
          setCurrentRoutineId(null)
          setCurrentWeekNumber(1)
          setExerciseCompletions(new Map())
          setActiveSavedId(null)

          setSuccess('All routine data has been reset. You can now generate a fresh routine.')
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to reset routines')
        } finally {
          setLoading(false)
        }
      },
      onCancel: () => setModalConfig(null)
    })
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
          className={`fixed z-50 top-0 left-0 h-full w-[92vw] sm:w-[360px] max-w-none p-4 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <div className="h-full">
            <div className="panel-solid rounded-2xl p-5 h-full flex flex-col overflow-hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <BrandLogo size={44} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold tracking-tight bg-gradient-to-r from-cyan-200 via-sky-200 to-violet-200 bg-clip-text text-transparent truncate">
                      Gym Bro
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
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'profile'
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
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'routine'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                    : 'text-slate-300/70 hover:text-white'
                    }`}
                >
                  Routine
                </button>
              </div>

              {/* Scrollable content */}
              <div className="mt-6 flex-1 overflow-auto pr-1">
                {savedRoutines.length > 0 ? (
                  <div className="mb-6">
                    <div className="flex items-center justify-between px-1 mb-2">
                      <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Library</div>
                      <div className="text-[10px] text-slate-400">{savedRoutines.length} saved</div>
                    </div>
                    <div className="space-y-1">
                      {savedRoutines.map((routine) => (
                        <div
                          key={routine.id}
                          className={`group relative flex items-center gap-2 p-2 rounded-xl transition-all ${activeSavedId === routine.id
                            ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-500/30'
                            : 'hover:bg-white/5 border border-transparent'
                            }`}
                        >
                          <button
                            onClick={() => handleLoadSavedRoutine(routine.id)}
                            className="flex-1 text-left min-w-0"
                          >
                            <div className={`text-sm font-medium truncate ${activeSavedId === routine.id ? 'text-cyan-200' : 'text-slate-200'
                              }`}>
                              {routine.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {new Date(routine.createdAt).toLocaleDateString()} • {routine.routine.days.length} days
                            </div>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteSavedRoutine(routine.id)
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            title="Delete routine"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 px-1 text-center py-8 border border-dashed border-slate-700/50 rounded-xl">
                    <p className="text-xs text-slate-400">No saved routines yet</p>
                  </div>
                )}

                {/* Push settings to bottom */}
                <div className="flex-1" />

                {/* Settings (bottom-left) */}
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-100">Settings</div>
                  <div className="text-[11px] text-slate-200/60">AI</div>
                </div>

                <div className="mt-3">
                  <p className="text-xs text-slate-300/50">
                    Using OpenAI (Server Key)
                  </p>
                  {/* User info */}
                  <div className="mt-2 text-[10px] text-slate-500 font-mono truncate">
                    {profile?.user_id && (
                      <span>
                        {/* We can store username in state if we want, or just rely on ID backup if not available */}
                        User: {(profile as any).username || `ID: ${profile.user_id}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main
          className={`transition-[padding,filter,opacity] duration-300 ${sidebarOpen ? 'xl:pl-[340px]' : 'xl:pl-0'
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
                  Gym Bro
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
                      onWheel={(e) => e.currentTarget.blur()}
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
                      onWheel={(e) => e.currentTarget.blur()}
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
                            onWheel={(e) => e.currentTarget.blur()}
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
                              onWheel={(e) => e.currentTarget.blur()}
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
                              onWheel={(e) => e.currentTarget.blur()}
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
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full px-4 py-3 glass-soft rounded-xl text-white placeholder:text-slate-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                    />
                    <p className="text-xs text-slate-300/50 mt-2">
                      Optional — helps the routine bias toward the right intensity/cardio/recovery strategy.
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <label className="block text-sm font-medium text-slate-200/90">Additional comments</label>
                      <button
                        type="button"
                        onClick={handleImproveNotes}
                        disabled={improvingNotes}
                        className="shrink-0 px-3 py-2 rounded-xl glass-soft text-slate-100 hover:text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
                        title="Improve notes with AI"
                      >
                        <span className="mr-2" aria-hidden="true">
                          🪄
                        </span>
                        {improvingNotes ? 'Improving…' : 'Improve by AI'}
                      </button>
                    </div>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Injuries, goals (fat loss/strength/hypertrophy), equipment limits, days per week, exercises you love/hate, etc."
                      rows={4}
                      className="w-full px-4 py-3 glass-soft rounded-xl text-white placeholder:text-slate-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 resize-y"
                    />
                  </div>
                </div>

                {/* Reset Routine Data */}
                <div className="mt-8 pt-6 border-t border-slate-700/50">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-slate-100">Reset Routine Data</h3>
                      <p className="text-xs text-slate-300/70 mt-1">
                        Clear all saved routines and progress. This action cannot be undone.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetRoutines}
                      disabled={loading}
                      className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Reset All Data
                    </button>
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
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:items-start">
                {/* Generation panel */}
                {showGenerator && (
                  <div className="lg:col-span-2 glass rounded-2xl p-6 sm:p-8 flex flex-col lg:min-h-[calc(100vh-12rem)]">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-semibold text-slate-100">Generate Routine</h2>
                      </div>
                      <div className="flex items-center gap-2">
                        {profile && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveTab('profile')
                            }}
                            className="shrink-0 px-3 py-2 rounded-xl glass-soft text-slate-200 hover:text-white transition text-sm"
                          >
                            Edit profile
                          </button>
                        )}
                        <button
                          onClick={() => setShowGenerator(false)}
                          className="shrink-0 p-2 rounded-xl glass-soft text-slate-400 hover:text-white transition"
                          aria-label="Hide panel"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 animation-fade-in">
                      <p className="text-sm text-slate-300/70 mb-6">
                        Uses your profile (including gender and comments) to tailor volume and recovery.
                      </p>

                      {/* Profile summary */}
                      {profile ? (
                        <div className="mb-6 glass-soft rounded-xl p-4 max-w-full overflow-hidden">
                          <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-200 border border-cyan-500/30 text-sm">
                              {profile.level}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-200 border border-emerald-500/30 text-sm">
                              {profile.goal}
                            </span>
                            <span className="px-3 py-1 rounded-full glass-soft text-slate-200 text-sm">
                              {profile.age} years
                            </span>
                            <span className="px-3 py-1 rounded-full glass-soft text-slate-200 text-sm">
                              {profile.weight} kg
                            </span>
                            {typeof profile.goal_weight === 'number' && (
                              <span className="px-3 py-1 rounded-full glass-soft text-slate-200 text-sm">
                                Goal: {profile.goal_weight} kg
                              </span>
                            )}
                            {profile.goal_duration && (
                              <span className="px-3 py-1 rounded-full glass-soft text-slate-200 text-sm">
                                {profile.goal_duration}
                              </span>
                            )}
                            <span className="px-3 py-1 rounded-full glass-soft text-slate-200 text-sm">
                              {profile.height} cm
                            </span>
                            <span className="px-3 py-1 rounded-full glass-soft text-slate-200 text-sm">
                              {profile.gender}
                            </span>
                            <span className="px-3 py-1 rounded-full glass-soft text-slate-200 text-sm">
                              {profile.tenure}
                            </span>
                          </div>
                          {profile.notes && (
                            <p className="text-sm text-slate-200/80 mt-3 break-words whitespace-pre-wrap max-w-full">
                              <span className="text-slate-300/60">Notes:</span> {profile.notes}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-200">
                          Please complete your profile first — routine generation is disabled until then.
                        </div>
                      )}

                      {showAISettings && (
                        <div className="mb-6 glass-soft rounded-xl p-4 relative">
                          <button
                            onClick={() => {
                              setShowAISettings(false)
                              try {
                                localStorage.setItem('gymbro:show-ai-settings:v1', '0')
                              } catch {
                                // ignore
                              }
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
                            aria-label="Dismiss"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <div className="text-sm font-semibold text-slate-100">AI Settings</div>
                          <p className="text-sm text-slate-200/70 mt-1 pr-6">
                            Provider and API key are now in the sidebar under <span className="text-slate-100">Settings</span>.
                          </p>
                        </div>
                      )}

                      <button
                        onClick={() => handleGenerateRoutine(false)}
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
                  </div>
                )}

                {/* Show Panel Button (when hidden) */}
                {!showGenerator && (
                  <div className="fixed bottom-6 left-6 z-40">
                    <button
                      onClick={() => setShowGenerator(true)}
                      className="px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-cyan-500/30 transition-all transform hover:scale-105 flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      Show Panel
                    </button>
                  </div>
                )}

                {/* Routine Display */}
                <div className={`${showGenerator ? 'lg:col-span-3' : 'lg:col-span-5'} glass rounded-2xl p-6 sm:p-8 transition-all`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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
                              onClick={() => {
                                handleJumpToToday()
                                // Ensure it opens
                                if (todaysPlan) setExpandedDay(todaysPlan.idx)
                              }}
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

                      {/* Progress Indicator */}
                      <div className="glass-soft rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-100">Week {currentWeekNumber} Progress</div>
                            <div className="text-xs text-slate-200/60 mt-1">
                              {(() => {
                                let total = 0
                                let completed = 0
                                routine.days.forEach((day, dIdx) => {
                                  day.exercises.forEach((_, eIdx) => {
                                    total++
                                    if (exerciseCompletions.get(`${dIdx}-${eIdx}`)) completed++
                                  })
                                })
                                const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
                                return `${completed}/${total} exercises completed (${percentage}%)`
                              })()}
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              await handleGenerateRoutine(true) // Pass true to indicate "next week"
                            }}
                            disabled={!currentRoutineId || generating}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Generate Week {currentWeekNumber + 1}
                          </button>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2.5">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2.5 rounded-full transition-all"
                            style={{
                              width: `${(() => {
                                let total = 0
                                let completed = 0
                                routine.days.forEach((day, dIdx) => {
                                  day.exercises.forEach((_, eIdx) => {
                                    total++
                                    if (exerciseCompletions.get(`${dIdx}-${eIdx}`)) completed++
                                  })
                                })
                                return total > 0 ? Math.round((completed / total) * 100) : 0
                              })()}%`
                            }}
                          />
                        </div>
                      </div>

                      {/* Days Accordion */}
                      {routine.days.map((day, dayIndex) => {
                        const isExpanded = expandedDay === dayIndex
                        const completedInDay = day.exercises.filter((_, eIdx) => exerciseCompletions.get(`${dayIndex}-${eIdx}`)).length
                        const totalInDay = day.exercises.length
                        const dayComplete = totalInDay > 0 && completedInDay === totalInDay

                        return (
                          <div
                            id={`day-${dayIndex}`}
                            key={dayIndex}
                            className={`glass-soft rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-1 ring-cyan-500/30 bg-white/5' : ''}`}
                          >
                            <button
                              type="button"
                              onClick={() => setExpandedDay(isExpanded ? null : dayIndex)}
                              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition"
                            >
                              <div>
                                <h4 className={`text-lg font-semibold transition ${isExpanded ? 'text-cyan-200' : 'text-slate-100'}`}>
                                  {day.day}
                                </h4>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {completedInDay}/{totalInDay} completed
                                  {dayComplete && <span className="ml-2 text-emerald-400">✓ Done</span>}
                                </p>
                              </div>
                              <span className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                ▼
                              </span>
                            </button>

                            {isExpanded && (
                              <div className="px-5 pb-5 border-t border-white/5 pt-4 animation-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {day.exercises.map((exercise, exIndex) => (
                                    <div
                                      key={exIndex}
                                      className="glass-soft rounded-xl p-4 hover:ring-1 hover:ring-cyan-400/40 transition"
                                    >
                                      {(() => {
                                        const urls = getExerciseYouTubeUrls(exercise).slice(0, 3)
                                        const ytId = urls[0] ? getYouTubeId(urls[0]) : null
                                        const points = getExerciseTutorialPoints(exercise)

                                        return (
                                          <>
                                            {ytId && <YouTubeHoverPreview videoId={ytId} title={exercise.name} />}
                                            <div className="flex items-start gap-3">
                                              <ExerciseCheckbox
                                                routineId={currentRoutineId}
                                                dayIndex={dayIndex}
                                                exerciseIndex={exIndex}
                                                exerciseName={exercise.name}
                                                initialCompleted={exerciseCompletions.get(`${dayIndex}-${exIndex}`) || false}
                                                onEnsureRoutineSaved={() => saveRoutineToDatabase(routine)}
                                                onToggle={(completed) => {
                                                  setExerciseCompletions(prev => {
                                                    const next = new Map(prev)
                                                    next.set(`${dayIndex}-${exIndex}`, completed)
                                                    return next
                                                  })
                                                }}
                                              />
                                              <div className="flex-1">
                                                <div className="flex justify-between items-start gap-3 mb-2">
                                                  <h5 className={`text-base font-semibold transition ${exerciseCompletions.get(`${dayIndex}-${exIndex}`) ? 'text-emerald-300 line-through opacity-70' : 'text-cyan-300'}`}>
                                                    {exercise.name}
                                                  </h5>
                                                  <div className="flex gap-2">
                                                    {urls[0] && (
                                                      <a
                                                        href={urls[0]}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs px-3 py-1 rounded-full bg-red-600/80 hover:bg-red-600 text-white transition flex items-center gap-1"
                                                      >
                                                        <span>Watch</span>
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                                          <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 .61-.03 1.3-.1 2.1-.06.8-.15 1.43-.28 1.9-.13.47-.38.85-.73 1.14-.35.29-.85.46-1.5.53-.65.07-1.46.12-2.43.15-1 .03-1.92.05-2.75.05L12 18c-.83 0-1.75-.02-2.75-.05-.97-.03-1.78-.08-2.43-.15-.65-.07-1.15-.24-1.5-.53-.35-.29-.6-.67-.73-1.14-.13-.47-.22-1.1-.28-1.9-.06-.8-.09-1.49-.09-2.09L4 12c0-.61.03-1.3.09-2.1.06-.8.15-1.43.28-1.9.13-.47.38-.85.73-1.14.35-.29.85-.46 1.5-.53.65-.07 1.46-.12 2.43-.15 1-.03 1.92-.05 2.75-.05L12 6c.83 0 1.75.02 2.75.05.97.03 1.78.08 2.43.15.65.07 1.15.24 1.5.53.35.29.6.67.73 1.14z" />
                                                        </svg>
                                                      </a>
                                                    )}
                                                    {exercise.wikihow_url && (
                                                      <a
                                                        href={exercise.wikihow_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs px-3 py-1 rounded-full bg-blue-600/80 hover:bg-blue-600 text-white transition flex items-center gap-1"
                                                      >
                                                        <span>WikiHow</span>
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                        </svg>
                                                      </a>
                                                    )}
                                                  </div>
                                                </div>
                                                <p className="text-sm text-slate-200/80 mb-3">{exercise.sets_reps}</p>

                                                {points.length > 0 && (
                                                  <div className="mb-3">
                                                    <div className="text-xs font-semibold text-slate-100 mb-2">Tutorial (points)</div>
                                                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-200/80">
                                                      {points.slice(0, 5).map((p, i) => (
                                                        <li key={i}>{p}</li>
                                                      ))}
                                                    </ul>
                                                  </div>
                                                )}

                                                {urls.length > 0 && (
                                                  <div>
                                                    <div className="text-xs font-semibold text-slate-100 mb-2">Video tutorials</div>
                                                    <div className="flex flex-wrap gap-2">
                                                      {urls.slice(0, 3).map((u, i) => (
                                                        <a
                                                          key={i}
                                                          href={u}
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                          className="text-xs px-3 py-2 rounded-xl glass-menu text-slate-100 hover:text-white transition"
                                                        >
                                                          Tutorial {i + 1}
                                                        </a>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </>
                                        )
                                      })()}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* FEEDBACK MODAL */}
      {modalConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-white/10">
            <div className={`h-2 w-full ${modalConfig.type === 'error' ? 'bg-red-500' : 'bg-amber-400'}`} />
            <div className="p-8 text-center">
              <div className="text-5xl mb-6 animate-bounce-slow">
                {modalConfig.emoji || (modalConfig.type === 'error' ? '💥' : '⚠️')}
              </div>
              <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                {modalConfig.title}
              </h3>
              <p className="text-slate-300 leading-relaxed mb-8 text-sm">
                {modalConfig.message}
              </p>

              <div className="flex gap-3 justify-center">
                {modalConfig.onCancel && (
                  <button
                    onClick={() => {
                      if (modalConfig.onCancel) modalConfig.onCancel()
                      else setModalConfig(null)
                    }}
                    className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => {
                    if (modalConfig.onConfirm) modalConfig.onConfirm()
                    else setModalConfig(null)
                  }}
                  className={`px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg transform transition-all active:scale-95 ${modalConfig.type === 'error'
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-500/20 hover:shadow-red-500/30'
                    : 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 shadow-amber-500/20 hover:shadow-amber-500/30'
                    }`}
                >
                  {modalConfig.type === 'error' ? 'Dismiss' : 'Continue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
