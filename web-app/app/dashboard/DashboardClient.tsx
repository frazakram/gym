'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { WeeklyRoutine, Profile, WeeklyDiet, PremiumStatus, GymPhoto, GymEquipmentAnalysis, BodyPhoto, BodyCompositionAnalysis } from '@/types'
import { BottomNav } from '@/components/BottomNav'
import { HomeView } from '@/components/views/HomeView'
import { RoutineView } from '@/components/views/RoutineView'
import { WorkoutView } from '@/components/views/WorkoutView'
import { ProfileView } from '@/components/views/ProfileView'
import { DietView } from '@/components/views/DietView'
import { AnalyticsView } from '@/components/views/AnalyticsView'
import { CoachView } from '@/components/views/CoachView'
import { MeasurementsView } from '@/components/views/MeasurementsView'
import { Sidebar } from '@/components/Sidebar'
import { ToastContainer, ToastType } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { UpgradeModal } from '@/components/ui/UpgradeModal'
import { compressImage } from '@/lib/image-utils'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { useSessionPersistence, clearSessionIndicator } from '@/lib/useSessionPersistence'
import { csrfFetch } from '@/lib/useCsrf'
import { TabQuote } from '@/components/ui/TabQuote'
import { type QuoteCategory } from '@/lib/quotes'
import { Menu } from 'lucide-react'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'

const VIEW_QUOTE_CATEGORY: Record<string, QuoteCategory> = {
  home: 'general',
  routine: 'workout',
  workout: 'workout',
  diet: 'diet',
  analytics: 'analytics',
  coach: 'coach',
  profile: 'general',
  measurements: 'analytics',
}

export default function DashboardPage() {
  const router = useRouter()
  const [activeView, setActiveView] = useState<'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics' | 'coach' | 'measurements'>('home')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [historyRoutines, setHistoryRoutines] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [viewingHistory, setViewingHistory] = useState(false) // True if viewing a past routine

  const [selectedDayIndex, setSelectedDayIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Billing / Premium
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  // AI Settings (client-side key + model selection) — load from localStorage immediately
  const [userApiKey, setUserApiKey] = useState(() => {
    if (typeof window === 'undefined') return ''
    try { const s = localStorage.getItem('gymbro_ai_settings'); return s ? JSON.parse(s).apiKey || '' : '' } catch { return '' }
  })
  const [userModelProvider, setUserModelProvider] = useState<'OpenAI' | 'Anthropic'>(() => {
    if (typeof window === 'undefined') return 'OpenAI'
    try { const s = localStorage.getItem('gymbro_ai_settings'); return s ? JSON.parse(s).modelProvider || 'OpenAI' : 'OpenAI' } catch { return 'OpenAI' }
  })
  const [userModel, setUserModel] = useState(() => {
    if (typeof window === 'undefined') return ''
    try { const s = localStorage.getItem('gymbro_ai_settings'); return s ? JSON.parse(s).model || '' : '' } catch { return '' }
  })

  // Toast notifications
  const showToast = (message: string, type: ToastType) => {
    switch (type) {
      case 'success':
        toast.success(message)
        break
      case 'error':
        toast.error(message)
        break
      case 'info':
        toast.info(message)
        break
      default:
        toast(message)
    }
  }

  const fetchPremiumStatus = useCallback(async (): Promise<PremiumStatus | null> => {
    try {
      const res = await csrfFetch('/api/billing/status', { cache: 'no-store' })
      if (!res.ok) return null
      const data = (await res.json()) as PremiumStatus
      setPremiumStatus(data)
      return data
    } catch {
      // ignore
      return null
    }
  }, [])


  // Auto-show toast when error/success changes
  useEffect(() => {
    if (error) {
      showToast(error, 'error')
      setError('') // Clear after showing
    }
  }, [error])

  useEffect(() => {
    if (success) {
      showToast(success, 'success')
      setSuccess('') // Clear after showing
    }
  }, [success])

  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState<string>('')
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
  const [sessionDuration, setSessionDuration] = useState<number | ''>(60)
  const [notes, setNotes] = useState('')
  // Diet State
  const [dietType, setDietType] = useState<string[]>(['No Restrictions'])
  const [cuisine, setCuisine] = useState<Profile['cuisine']>('No Preference')
  const [proteinPowder, setProteinPowder] = useState<Profile['protein_powder']>('No')
  const [proteinPowderAmount, setProteinPowderAmount] = useState<number>(0)
  const [specificFoodPreferences, setSpecificFoodPreferences] = useState<string>('')
  const [mealsPerDay, setMealsPerDay] = useState<number>(3)
  const [allergies, setAllergies] = useState<string[]>([])
  const [cookingLevel, setCookingLevel] = useState<string>('Moderate')
  const [budget, setBudget] = useState<string>('Standard')
  // Gym Equipment State (NEW)
  const [gymPhotos, setGymPhotos] = useState<any[]>([])
  const [equipmentAnalysis, setEquipmentAnalysis] = useState<any>(null)
  const [analyzingEquipment, setAnalyzingEquipment] = useState(false)
  const [equipmentError, setEquipmentError] = useState('')

  // Body Composition State (NEW)
  const [bodyPhotos, setBodyPhotos] = useState<any[]>([])
  const [bodyAnalysis, setBodyAnalysis] = useState<any>(null)
  const [analyzingBody, setAnalyzingBody] = useState(false)
  const [bodyError, setBodyError] = useState('')

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
  const [dietPlan, setDietPlan] = useState<WeeklyDiet | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generationStage, setGenerationStage] = useState('') // SSE progress stage text
  const [generatingDiet, setGeneratingDiet] = useState(false) // Independent loading state

  // Progress tracking state
  const [currentRoutineId, setCurrentRoutineId] = useState<number | null>(null)
  const [currentWeekNumber, setCurrentWeekNumber] = useState(1)
  const [exerciseCompletions, setExerciseCompletions] = useState<Map<string, boolean>>(new Map())
  const [dayCompletions, setDayCompletions] = useState<Map<number, boolean>>(new Map())
  const [userId, setUserId] = useState<number | null>(null)
  
  // Stale routine detection: true when the loaded routine is from a past week
  const [routineIsStale, setRoutineIsStale] = useState(false)
  const [weeksElapsed, setWeeksElapsed] = useState(0)

  // Heatmap data for activity tracking
  const [heatmapData, setHeatmapData] = useState<Array<{ date: string; value: number }>>([])
  const [heatmapLoading, setHeatmapLoading] = useState(false)

  // Streak data
  const [streakData, setStreakData] = useState<{ current: number; longest: number; last_workout_date: string | null } | null>(null)

  const resolvedHeightCm = useMemo(() => {
    if (heightUnit === 'cm') return typeof height === 'number' ? height : null
    if (typeof heightFeet !== 'number' || typeof heightInches !== 'number') return null
    const inches = Math.max(0, Math.min(11.9, heightInches))
    const ftInToCm = (ft: number, inches: number) => ft * 30.48 + inches * 2.54
    return Math.round(ftInToCm(heightFeet, inches) * 10) / 10
  }, [height, heightFeet, heightInches, heightUnit])

  const fetchProfile = useCallback(async () => {
    try {
      const response = await csrfFetch('/api/profile')
      if (response.status === 401) {
        router.push('/login')
        return
      }
      const data = await response.json()
      if (!data.profile) {
        // New user — send to onboarding wizard for quick setup
        router.replace('/onboarding')
        return
      }
      if (data.profile) {
        const extendedProfile = { ...data.profile, username: data.username }
        setProfile(extendedProfile)
        setName(data.profile.name ?? '')
        setAge(data.profile.age != null ? Number(data.profile.age) : 25)
        setWeight(data.profile.weight != null ? Number(data.profile.weight) : 70)
        setHeight(data.profile.height != null ? Number(data.profile.height) : 170)
        setGender(data.profile.gender ?? 'Prefer not to say')
        setGoal(data.profile.goal ?? 'General fitness')
        setLevel(data.profile.level)
        setTenure(data.profile.tenure)
        setGoalWeight(data.profile.goal_weight != null ? Number(data.profile.goal_weight) : '')
        setGoalDuration(data.profile.goal_duration ?? '')
        setSessionDuration(data.profile.session_duration ?? 60)
        setNotes(data.profile.notes ?? '')
        setDietType(data.profile.diet_type || ['No Restrictions'])
        setCuisine(data.profile.cuisine ?? 'No Preference')
        setProteinPowder(data.profile.protein_powder ?? 'No')
        setProteinPowderAmount(data.profile.protein_powder_amount ?? 0)
        setSpecificFoodPreferences(data.profile.specific_food_preferences ?? '')
        setMealsPerDay(data.profile.meals_per_day ?? 3)
        setAllergies(data.profile.allergies || [])
        setCookingLevel(data.profile.cooking_level ?? 'Moderate')
        setBudget(data.profile.budget ?? 'Standard')
        setGymPhotos(data.profile.gym_photos || [])
        setEquipmentAnalysis(data.profile.gym_equipment_analysis || null)
        setBodyPhotos(data.profile.body_photos || [])
        setBodyAnalysis(data.profile.body_composition_analysis || null)
      }
    } catch (err: unknown) {
      console.error('Error fetching profile:', err)
    }
  }, [router])

  const fetchLatestRoutine = useCallback(async () => {
    try {
      const res = await csrfFetch(`/api/routines`)
      const { routine } = await res.json()
      if (routine) {
        setRoutine(routine.routine_json)
        setCurrentRoutineId(routine.id)
        setCurrentWeekNumber(routine.week_number)

        // Detect stale routine: check if week_start_date is from a past week
        const routineWeekStart = routine.week_start_date
          ? new Date(routine.week_start_date)
          : new Date(routine.created_at)
        const now = new Date()
        const currentMonday = new Date(now)
        const dayOfWeek = (now.getDay() + 6) % 7
        currentMonday.setHours(0, 0, 0, 0)
        currentMonday.setDate(now.getDate() - dayOfWeek)

        const routineMonday = new Date(routineWeekStart)
        const rDow = (routineWeekStart.getDay() + 6) % 7
        routineMonday.setHours(0, 0, 0, 0)
        routineMonday.setDate(routineWeekStart.getDate() - rDow)

        const diffMs = currentMonday.getTime() - routineMonday.getTime()
        const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000))

        if (diffWeeks >= 1) {
          setRoutineIsStale(true)
          setWeeksElapsed(diffWeeks)
        } else {
          setRoutineIsStale(false)
          setWeeksElapsed(0)
        }

        const compRes = await csrfFetch(`/api/completions?routineId=${routine.id}`)
        const { completions } = await compRes.json()

        const map = new Map<string, boolean>()
        completions.forEach((c: any) => {
          map.set(`${c.day_index}-${c.exercise_index}`, c.completed)
        })
        setExerciseCompletions(map)

        try {
          const dayRes = await csrfFetch(`/api/day-completions?routineId=${routine.id}`)
          const dayData = await dayRes.json().catch(() => ({}))
          const dmap = new Map<number, boolean>()
            ; (dayData?.days || []).forEach((d: any) => {
              dmap.set(Number(d.day_index), Boolean(d.completed))
            })
          setDayCompletions(dmap)
        } catch {
          setDayCompletions(new Map())
        }

        const dayIdx = (new Date().getDay() + 6) % 7
        const safeIdx = Math.min(dayIdx, routine.routine_json.days.length - 1)
        setSelectedDayIndex(safeIdx)
      }
    } catch (err: unknown) {
      console.error('Error fetching latest routine:', err)
    }
  }, [])

  const fetchLatestDiet = useCallback(async () => {
    try {
      const res = await csrfFetch('/api/diet');
      const data = await res.json();
      if (data.diet) {
        setDietPlan(data.diet.diet_json);
      }
    } catch (err) {
      console.error('Error fetching latest diet:', err);
    }
  }, []);

  const fetchHeatmapData = useCallback(async () => {
    setHeatmapLoading(true)
    try {
      const res = await csrfFetch('/api/heatmap?days=56') // 8 weeks
      const data = await res.json()
      if (data.heatmap) {
        setHeatmapData(data.heatmap)
      }
    } catch (err) {
      console.error('Error fetching heatmap data:', err)
    } finally {
      setHeatmapLoading(false)
    }
  }, [])

  const fetchStreak = useCallback(async () => {
    try {
      const res = await csrfFetch('/api/streak')
      if (res.ok) {
        const data = await res.json()
        setStreakData(data)
      }
    } catch (err) {
      console.error('Error fetching streak:', err)
    }
  }, [])

  // Session persistence hook for Android
  const { markSessionActive, refreshSession } = useSessionPersistence()

  // Navigation history stack for back button handling
  const viewHistoryRef = useRef<Array<'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics' | 'coach' | 'measurements'>>(['home'])

  useEffect(() => {
    fetchProfile()
    fetchLatestRoutine()
    fetchLatestDiet()
    fetchPremiumStatus()
    fetchHeatmapData()
    fetchStreak()

    // Mark session as active in localStorage for Android persistence
    markSessionActive()

    // Clear browser back history to login page on dashboard mount
    // This prevents back button from going to login/Google OAuth pages
    if (typeof window !== 'undefined') {
      // Replace current state to remove login/OAuth pages from history
      window.history.replaceState({ view: 'home' }, '', '/dashboard')

      // Push initial dashboard state
      window.history.pushState({ view: 'home' }, '', '/dashboard')
    }
  }, [fetchProfile, fetchLatestRoutine, fetchLatestDiet, fetchPremiumStatus, fetchHeatmapData, fetchStreak, markSessionActive])

  // Handle browser back button / Android back gesture
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Prevent going back to login/OAuth pages
      const currentHistory = viewHistoryRef.current

      if (currentHistory.length > 1) {
        // Go to previous view in our internal history
        currentHistory.pop()
        const previousView = currentHistory[currentHistory.length - 1] || 'home'
        setActiveView(previousView)
      } else {
        // Already at home, stay on home (don't go back to login)
        setActiveView('home')
      }

      // Push state back to prevent actual browser back navigation
      window.history.pushState({ view: activeView }, '', '/dashboard')
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [activeView])

  // Refresh session timestamp on user activity
  useEffect(() => {
    const handleActivity = () => refreshSession()
    window.addEventListener('click', handleActivity)
    window.addEventListener('touchstart', handleActivity)
    return () => {
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
    }
  }, [refreshSession])


  useEffect(() => {
    const onFocus = () => fetchPremiumStatus()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [fetchPremiumStatus])

  const effectivePremium: PremiumStatus = premiumStatus ?? {
    premium: false,
    access: false,
    trial_active: false,
    trial_end: null,
    status: null,
    subscription_id: null,
    current_end: null,
  }

  const handleViewChange = (view: 'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics' | 'coach' | 'measurements') => {
    // Track view history for back button handling
    const trackViewChange = (newView: typeof view) => {
      viewHistoryRef.current.push(newView)
      // Keep history manageable
      if (viewHistoryRef.current.length > 20) {
        viewHistoryRef.current = viewHistoryRef.current.slice(-10)
      }
      setActiveView(newView)
    }

    if (view === 'analytics' || view === 'coach') {
      if (premiumStatus == null) {
        // Avoid showing the paywall incorrectly before we know trial/premium state.
        void fetchPremiumStatus().then((s) => {
          const eff: PremiumStatus = s ?? {
            premium: false,
            access: false,
            trial_active: false,
            trial_end: null,
            status: null,
            subscription_id: null,
            current_end: null,
          }
          if (eff.access) trackViewChange(view)
          else setUpgradeOpen(true)
        })
        return
      }
      if (effectivePremium.access) {
        trackViewChange(view)
      } else {
        setUpgradeOpen(true)
      }
      return
    }
    trackViewChange(view)
  }

  const fetchHistory = async () => {
    setLoadingHistory(true)
    try {
      const res = await csrfFetch('/api/routines?all=true&includeArchived=true')
      const data = await res.json()
      if (data.routines) {
        setHistoryRoutines(data.routines)
      }
    } catch (err) {
      console.error('Failed to fetch history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleArchiveRoutine = async (routineId: number, archived: boolean) => {
    try {
      const res = await csrfFetch(`/api/routines/${routineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived }),
      })
      if (!res.ok) throw new Error('Failed to update routine')
      await fetchHistory()
    } catch (e) {
      console.error('Archive routine failed:', e)
    }
  }

  const handleDeleteRoutine = async (routineId: number) => {
    const ok = window.confirm('Delete this routine permanently? This cannot be undone.')
    if (!ok) return

    try {
      const res = await csrfFetch(`/api/routines/${routineId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete routine')

      if (currentRoutineId === routineId) {
        setViewingHistory(false)
        await fetchLatestRoutine()
        await fetchLatestDiet()
        setActiveView('home')
      }

      await fetchHistory()
    } catch (e) {
      console.error('Delete routine failed:', e)
    }
  }

  const handleSelectHistoryRoutine = async (historyItem: any) => {
    setRoutine(historyItem.routine_json)
    setCurrentRoutineId(historyItem.id)
    setCurrentWeekNumber(historyItem.week_number)

    // Attempt to load associated diet for this week
    try {
      const dietRes = await csrfFetch(`/api/diet?week=${historyItem.week_number}`);
      const dietData = await dietRes.json();
      if (dietData.diet) {
        setDietPlan(dietData.diet.diet_json);
      } else {
        setDietPlan(null); // No diet found for this old routine
      }
    } catch (e) {
      console.error("Error loading history diet", e);
      setDietPlan(null);
    }

    // Check if this is the "latest" routine to toggle viewingHistory mode
    // Ideally we comparing IDs, but for now assumption: any selection from history list implies "viewing" mode if strictly previous
    // Actually simpler: Just set viewingHistory = true, and have a "Back to Latest" button

    // Fetch completions for this routine
    try {
      const compRes = await csrfFetch(`/api/completions?routineId=${historyItem.id}`)
      const { completions } = await compRes.json()
      const map = new Map<string, boolean>()
      completions.forEach((c: any) => {
        map.set(`${c.day_index}-${c.exercise_index}`, c.completed)
      })
      setExerciseCompletions(map)

      try {
        const dayRes = await csrfFetch(`/api/day-completions?routineId=${historyItem.id}`)
        const dayData = await dayRes.json().catch(() => ({}))
        const dmap = new Map<number, boolean>()
          ; (dayData?.days || []).forEach((d: any) => {
            dmap.set(Number(d.day_index), Boolean(d.completed))
          })
        setDayCompletions(dmap)
      } catch {
        setDayCompletions(new Map())
      }

      // Determine if this is the latest
      // For simplicity, let's assume if it came from the sidebar click, we treat it as "viewing history"
      // UNLESS it matches the very latest one.

      setViewingHistory(true)
      setActiveView('routine') // Go to routine view to see the plan
    } catch (err) {
      console.error('Error loading history completions:', err)
    }
  }

  const handleBackToLatest = async () => {
    setViewingHistory(false)
    await fetchLatestRoutine()
    await fetchLatestDiet()
    setActiveView('home')
  }

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

  function mondayOfThisWeekLocal(d: Date): Date {
    // Mon=0..Sun=6
    const dayIdx = (d.getDay() + 6) % 7
    const out = new Date(d)
    out.setHours(0, 0, 0, 0)
    out.setDate(out.getDate() - dayIdx)
    return out
  }

  const saveRoutineToDatabase = async (routineData: WeeklyRoutine, weekNumberOverride?: number, weekStartDateOverride?: Date) => {
    try {
      let currentUserId = userId
      if (!currentUserId) {
        const profileRes = await csrfFetch('/api/profile')
        const profileData = await profileRes.json()
        if (profileData.profile?.user_id) {
          currentUserId = profileData.profile.user_id
          setUserId(currentUserId)
        } else {
          currentUserId = 999
          setUserId(999)
        }
      }

        const dt = weekStartDateOverride ?? mondayOfThisWeekLocal(new Date());
        const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

        const res = await csrfFetch('/api/routines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weekNumber: typeof weekNumberOverride === 'number' ? weekNumberOverride : currentWeekNumber,
            routine: routineData,
            weekStartDate: dateStr,
          }),
        })

      if (!res.ok) {
        let errText = await res.text().catch(() => '');
        throw new Error(`Failed to save routine to DB: ${res.status} ${errText}`);
      }

      const data = await res.json()
      if (data.routineId) {
        setCurrentRoutineId(data.routineId)
        return data.routineId
      }
      throw new Error(`API returned success but no routineId: ${JSON.stringify(data)}`);
    } catch (error) {
      console.error('Failed to save routine:', error)
      throw error;
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

    const currentProfileHash = JSON.stringify({
      age, weight, height: resolvedHeightCm, gender, goal, level, tenure, goalWeight, goalDuration, notes,
      dietType, cuisine, proteinPowder, mealsPerDay, allergies
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
    if (!profile || resolvedHeightCm == null) return

    setGenerating(true)
    setError('')
    setSuccess('')

    try {
      // When routine is stale and user regenerates, advance to current calendar week
      const effectiveWeekNumber = routineIsStale && !isNextWeek
        ? currentWeekNumber + weeksElapsed
        : currentWeekNumber
      const targetWeekNumber = isNextWeek ? effectiveWeekNumber + 1 : effectiveWeekNumber
      const baseMonday = mondayOfThisWeekLocal(new Date())
      const targetWeekStart = new Date(baseMonday)
      targetWeekStart.setDate(baseMonday.getDate() + (isNextWeek ? 7 : 0))

      setGenerationStage('Contacting AI provider…')

      const response = await csrfFetch('/api/routine/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: Number(age),
          weight: Number(weight),
          height: Number(resolvedHeightCm),
          gender,
          goal,
          level,
          tenure: profile.tenure || tenure,
          goal_weight: profile.goal_weight,
          notes: profile.notes,
          goal_duration: profile.goal_duration,
          session_duration: profile.session_duration || sessionDuration,
          model_provider: userModelProvider,
          api_key: userApiKey || undefined,
          model: userModel || undefined,
          is_next_week: isNextWeek,
          week_number: targetWeekNumber,
          stream: true, // SSE streaming to avoid Vercel timeout
        }),
      })

      if (!response.ok) {
        const errBody = await response.text()
        let errMsg = `Server error (${response.status})`
        try { errMsg = JSON.parse(errBody).error || errMsg } catch {}
        throw new Error(errMsg)
      }

      // Parse SSE stream
      let data: any = null
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')
      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Process complete lines
        let newlineIdx: number
        while ((newlineIdx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newlineIdx)
          buffer = buffer.slice(newlineIdx + 1)

          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6))
              if (currentEvent === 'progress') {
                setGenerationStage(parsed.stage || `${parsed.pct}%`)
              } else if (currentEvent === 'routine') {
                data = { routine: parsed.routine, source: 'ai', week_number: targetWeekNumber }
              } else if (currentEvent === 'error') {
                throw new Error(parsed.message || 'AI generation failed')
              }
            } catch (e) {
              if (e instanceof Error && (e.message.includes('AI generation failed') || e.message.includes('generation failed'))) throw e
              // JSON parse error on incomplete data — ignore, next chunk will complete it
            }
            currentEvent = ''
          }
        }
      }

      if (!data?.routine) {
        throw new Error('No routine received from AI. Check your API key and try again.')
      }

      setGenerationStage('')
      lastGenProfileRef.current = JSON.stringify({
        age, weight, height: resolvedHeightCm, gender, goal, level, tenure, goalWeight, goalDuration, notes,
        dietType, cuisine, proteinPowder, mealsPerDay, allergies
      })

      setRoutine(data.routine)

      if (data.week_number) {
        setCurrentWeekNumber(data.week_number)
      } else if (isNextWeek) {
        setCurrentWeekNumber(prev => prev + 1)
      }

      if (data.source === 'db' || data.source === 'cache') {
        setSuccess('Loaded existing routine for this week.')
        if (data.routine_id) {
          setCurrentRoutineId(data.routine_id)
          const compRes = await csrfFetch(`/api/completions?routineId=${data.routine_id}`)
          const { completions } = await compRes.json()
          const map = new Map<string, boolean>()
          completions.forEach((c: any) => {
            map.set(`${c.day_index}-${c.exercise_index}`, c.completed)
          })
          setExerciseCompletions(map)

          try {
            const dayRes = await csrfFetch(`/api/day-completions?routineId=${data.routine_id}`)
            const dayData = await dayRes.json().catch(() => ({}))
            const dmap = new Map<number, boolean>()
              ; (dayData?.days || []).forEach((d: any) => {
                dmap.set(Number(d.day_index), Boolean(d.completed))
              })
            setDayCompletions(dmap)
          } catch {
            setDayCompletions(new Map())
          }
        }
      } else {
        setSuccess('Routine generated successfully.')
        setExerciseCompletions(new Map())
        setDayCompletions(new Map())
        // Clear stale state since we just generated a fresh routine
        setRoutineIsStale(false)
        setWeeksElapsed(0)
        await saveRoutineToDatabase(data.routine, targetWeekNumber, targetWeekStart)

        // Auto-trigger diet generation if routine is new
        handleGenerateDiet();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setGenerating(false)
      setGenerationStage('')
    }
  }



  const handleGenerateDiet = async (isNextWeek = false) => {
    if (!profile) return;
    setGeneratingDiet(true);
    setError('');
    setSuccess('');

    try {
      const dietRes = await csrfFetch('/api/diet/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routine: routine, // Pass context if available
          model_provider: userModelProvider,
          api_key: userApiKey || undefined,
          model: userModel || undefined,
        })
      })
      const dietData = await dietRes.json()
      if (!dietRes.ok) throw new Error(dietData.error || 'Failed to generate diet');



      if (dietData.dietPlan) {
        setDietPlan(dietData.dietPlan)
        setSuccess('Diet plan generated successfully!');

        // Save diet
        await csrfFetch('/api/diet/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weekNumber: isNextWeek ? currentWeekNumber + 1 : currentWeekNumber,
            diet: dietData.dietPlan
          })
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Diet gen error", msg)
      setError(msg);
    } finally {
      setGeneratingDiet(false);
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
          const res = await csrfFetch('/api/routines/reset', { method: 'DELETE' })
          const data = await res.json()

          if (!res.ok) {
            throw new Error(data?.error || 'Failed to reset routines')
          }

          setRoutine(null)
          setCurrentRoutineId(null)
          setCurrentWeekNumber(1)
          setDietPlan(null) // Clear diet too
          setExerciseCompletions(new Map())

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (age === '' || weight === '' || !tenure.trim() || resolvedHeightCm == null) {
        throw new Error('Please fill Age, Weight, Height, and Training Duration.')
      }

      const response = await csrfFetch('/api/profile', {
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
          session_duration: typeof sessionDuration === 'number' ? sessionDuration : undefined,
          diet_type: dietType,
          cuisine,
          protein_powder: proteinPowder,
          protein_powder_amount: proteinPowderAmount,
          meals_per_day: mealsPerDay,
          allergies,
          specific_food_preferences: specificFoodPreferences,
          cooking_level: cookingLevel,
          budget: budget,
          name: name
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to save profile')
      }

      setSuccess('Profile saved successfully.')
      // Clear the generation hash so profile changes trigger new routine generation
      lastGenProfileRef.current = null
      await fetchProfile()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    // Save stats for LoginAnimation State 2 BEFORE clearing session
    localStorage.setItem('justLoggedOut', 'true')
    if (streakData) {
      localStorage.setItem('lastStreak', String(streakData.current))
      localStorage.setItem('bestStreak', String(streakData.longest))
    }
    localStorage.setItem('lastWeek', String(currentWeekNumber))
    // Clear localStorage session indicator
    clearSessionIndicator()
    await csrfFetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleGenerateNextWeek = async () => {
    await handleGenerateRoutine(true)
  }

  // Start a fresh routine for the current calendar week when returning after a gap
  const handleStartNewWeek = async () => {
    // This regenerates with the stale-aware week number calculation
    await performGeneration(false)
  }

  const calculateCompletionPercentage = () => {
    if (!routine) return 0
    let total = 0
    let completed = 0
    routine.days.forEach((day, dIdx) => {
      if ((day.exercises?.length || 0) === 0) {
        total++
        if (dayCompletions.get(dIdx)) completed++
        return
      }
      day.exercises.forEach((_, eIdx) => {
        total++
        if (exerciseCompletions.get(`${dIdx}-${eIdx}`)) completed++
      })
    })
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  const handleFieldUpdate = (field: string, value: any) => {
    switch (field) {
      case 'age': setAge(value); break
      case 'weight': setWeight(value); break
      case 'height': setHeight(value); break
      case 'heightUnit': setHeightUnit(value); break
      case 'heightFeet': setHeightFeet(value); break
      case 'heightInches': setHeightInches(value); break
      case 'gender': setGender(value); break
      case 'goal': setGoal(value); break
      case 'level': setLevel(value); break
      case 'tenure': setTenure(value); break
      case 'goalWeight': setGoalWeight(value); break
      case 'goalDuration': setGoalDuration(value); break
      case 'sessionDuration': setSessionDuration(value); break
      case 'notes': setNotes(value); break
      case 'dietType': setDietType(value); break
      case 'cuisine': setCuisine(value); break
      case 'proteinPowder': setProteinPowder(value); break
      case 'proteinPowderAmount': setProteinPowderAmount(value); break
      case 'specificFoodPreferences': setSpecificFoodPreferences(value); break
      case 'mealsPerDay': setMealsPerDay(value); break
      case 'allergies': setAllergies(value); break
      case 'cookingLevel': setCookingLevel(value); break
      case 'budget': setBudget(value); break
      case 'name': setName(value); break
      case 'gymPhotos': setGymPhotos(value); break
      case 'gymEquipmentAnalysis': setEquipmentAnalysis(value); break
      case 'bodyPhotos': setBodyPhotos(value); break
      case 'bodyCompositionAnalysis': setBodyAnalysis(value); break
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleGymPhotoUpload = async (files: File[]) => {
    try {
      setAnalyzingEquipment(true)
      setEquipmentError('')

      const photoPromises = files.map(async (file) => {
        const compressedFile = await compressImage(file)
        return {
          id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
          base64: await fileToBase64(compressedFile),
          content_type: compressedFile.type,
          size_bytes: compressedFile.size,
          uploaded_at: new Date().toISOString()
        }
      })

      const newPhotos = await Promise.all(photoPromises)
      const updatedPhotos = [...gymPhotos, ...newPhotos]
      setGymPhotos(updatedPhotos)

      const response = await csrfFetch('/api/gym/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: updatedPhotos.map(p => p.base64), api_key: userApiKey || undefined })
      })

      if (!response.ok) throw new Error('Failed to analyze equipment')

      const { analysis } = await response.json()
      setEquipmentAnalysis(analysis)
      setSuccess('Gym equipment analyzed successfully!')

      await csrfFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gym_photos: updatedPhotos,
          gym_equipment_analysis: analysis,
        }),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to analyze gym equipment. Please try again.'
      setEquipmentError(msg)
      console.error('Equipment analysis error:', error)
    } finally {
      setAnalyzingEquipment(false)
    }
  }

  const handleGymPhotoDelete = async (id: string) => {
    const updatedPhotos = gymPhotos.filter(p => p.id !== id)
    setGymPhotos(updatedPhotos)

    if (updatedPhotos.length === 0) {
      setEquipmentAnalysis(null)
      await csrfFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gym_photos: [], gym_equipment_analysis: null }),
      });
    } else {
      try {
        setAnalyzingEquipment(true)
        const response = await csrfFetch('/api/gym/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: updatedPhotos.map(p => p.base64), api_key: userApiKey || undefined })
        })
        const { analysis } = await response.json()
        setEquipmentAnalysis(analysis)
        await csrfFetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gym_photos: updatedPhotos, gym_equipment_analysis: analysis }),
        });
      } catch (error) {
        console.error('Re-analysis error:', error)
      } finally {
        setAnalyzingEquipment(false)
      }
    }
  }

  const handleBodyPhotoUpload = async (files: File[]) => {
    try {
      setAnalyzingBody(true)
      setBodyError('')

      const photoPromises = files.map(async (file) => {
        const compressedFile = await compressImage(file)
        return {
          id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
          base64: await fileToBase64(compressedFile),
          content_type: compressedFile.type,
          size_bytes: compressedFile.size,
          uploaded_at: new Date().toISOString()
        }
      })

      const newPhotos = await Promise.all(photoPromises)
      // Limit to max 2 photos
      const updatedPhotos = [...bodyPhotos, ...newPhotos].slice(0, 2)
      setBodyPhotos(updatedPhotos)

      const response = await csrfFetch('/api/body/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: updatedPhotos.map(p => p.base64), api_key: userApiKey || undefined })
      })

      if (!response.ok) throw new Error('Failed to analyze body composition')

      const { analysis } = await response.json()
      setBodyAnalysis(analysis)
      setSuccess('Body composition analyzed successfully!')

      await csrfFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body_photos: updatedPhotos,
          body_composition_analysis: analysis,
        }),
      });

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to analyze body composition. Please try again.'
      setBodyError(msg)
      console.error('Body analysis error:', error)
    } finally {
      setAnalyzingBody(false)
    }
  }

  const handleBodyPhotoDelete = async (id: string) => {
    const updatedPhotos = bodyPhotos.filter(p => p.id !== id)
    setBodyPhotos(updatedPhotos)

    if (updatedPhotos.length === 0) {
      setBodyAnalysis(null)
      await csrfFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body_photos: [], body_composition_analysis: null }),
      });
    } else {
      try {
        setAnalyzingBody(true)
        const response = await csrfFetch('/api/body/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: updatedPhotos.map(p => p.base64), api_key: userApiKey || undefined })
        })
        const { analysis } = await response.json()
        setBodyAnalysis(analysis)
        await csrfFetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body_photos: updatedPhotos, body_composition_analysis: analysis }),
        });
      } catch (error) {
        console.error('Re-analysis error:', error)
      } finally {
        setAnalyzingBody(false)
      }
    }
  }

  const handleToggleExercise = async (dayIndex: number, exerciseIndex: number, completed: boolean) => {
    // Optimistic UI update
    setExerciseCompletions(prev => {
      const next = new Map(prev)
      next.set(`${dayIndex}-${exerciseIndex}`, completed)
      return next
    })

    // Persist to server
    let rid = currentRoutineId
    if (!rid && routine) {
      rid = await saveRoutineToDatabase(routine)
    }
    if (rid) {
      try {
        const res = await csrfFetch('/api/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ routineId: rid, dayIndex, exerciseIndex, completed }),
        })
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`API failed: ${res.status} ${text}`)
        }
      } catch (e) {
        console.error('Failed to save completion:', e)
        setError(e instanceof Error ? e.message : String(e));
        // Revert on error
        setExerciseCompletions(prev => {
          const next = new Map(prev)
          next.set(`${dayIndex}-${exerciseIndex}`, !completed)
          return next
        })
        throw e; // Rethrow to let caller know it failed
      }
    } else {
      // Revert if saving the routine failed
      setExerciseCompletions(prev => {
        const next = new Map(prev)
        next.set(`${dayIndex}-${exerciseIndex}`, !completed)
        return next
      })
      throw new Error("Could not save routine context");
    }

    fetchHeatmapData()
    fetchStreak()
  }

  const handleToggleRestDay = async (dayIndex: number, completed: boolean) => {
    let rid = currentRoutineId
    if (!rid && routine) {
      rid = await saveRoutineToDatabase(routine)
    }
    if (!rid) return

    // Optimistic update
    setDayCompletions(prev => {
      const next = new Map(prev)
      next.set(dayIndex, completed)
      return next
    })

    try {
      const res = await csrfFetch('/api/day-completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routineId: rid, dayIndex, completed }),
      })
      if (!res.ok) throw new Error('Failed to update')

      setDayCompletions((prev) => {
        const next = new Map(prev)
        next.set(dayIndex, completed)
        return next
      })

      // Update completion %
      // actually, just let next render handle it or we need to recalculate?
      // simple approach: do nothing or re-evaluate.
      // DashboardClient does not compute percentage centrally, it's passed to RoutineView?
      // No, completionPercentage is computed ?
      // Wait, completionPercentage prop in RoutineView.
      // Let's check how completionPercentage is passed.
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggleDayComplete = async (dayIndex: number, completed: boolean) => {
    let rid = currentRoutineId
    if (!rid && routine) {
      rid = await saveRoutineToDatabase(routine)
    }
    if (!rid) return
    
    // Optimistic
    setDayCompletions(prev => {
      const next = new Map(prev)
      next.set(dayIndex, completed)
      return next
    })

    try {
      const res = await csrfFetch('/api/day-completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routineId: rid, dayIndex, completed }),
      })
      if (!res.ok) throw new Error('Failed to update day completion')
    } catch (e) {
      console.error(e)
      // Revert
      setDayCompletions(prev => {
        const next = new Map(prev)
        next.set(dayIndex, !completed)
        return next
      })
    }
  }

  return (
    <div className="min-h-screen bg-transparent">
      {/* Offline status indicator */}
      <OfflineIndicator />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        routines={historyRoutines}
        currentRoutineId={currentRoutineId}
        onSelectRoutine={handleSelectHistoryRoutine}
        onArchiveRoutine={handleArchiveRoutine}
        onDeleteRoutine={handleDeleteRoutine}
        loading={loadingHistory}
        aiSettings={{
          apiKey: userApiKey,
          modelProvider: userModelProvider,
          model: userModel,
          onApiKeyChange: setUserApiKey,
          onModelProviderChange: setUserModelProvider,
          onModelChange: setUserModel,
        }}
      />

      {/* Main Content Container */}
      <div className="max-w-screen-md mx-auto relative">
        {/* Menu Button - positioned to not overlap with sticky headers */}
        <div className="fixed top-4 left-4 z-30">
          <button
            onClick={() => {
              setIsSidebarOpen(true)
              fetchHistory()
            }}
            className="p-2 glass backdrop-blur rounded-full text-gray-700 dark:text-white shadow-lg border border-primary/15 hover:bg-primary/10 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* View Rendering */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeInOut' as const }}
          >
            <TabQuote
              key={`quote-${activeView}`}
              category={VIEW_QUOTE_CATEGORY[activeView] || 'general'}
              triggerKey={activeView}
            />

            {activeView === 'home' && (
              <HomeView
                profile={profile}
                routine={routine}
                diet={dietPlan}
                exerciseCompletions={exerciseCompletions}
                dayCompletions={dayCompletions}
                heatmapData={heatmapData}
                streakData={streakData}
                currentWeekNumber={currentWeekNumber}
                onNavigateToWorkout={(dayIndex) => {
                  if (dayIndex !== undefined) setSelectedDayIndex(dayIndex)
                  setActiveView('workout')
                }}
                onNavigateToCoach={() => handleViewChange('coach')}
                onGenerateRoutine={() => handleGenerateRoutine(false)}
                onGenerateNextWeek={handleGenerateNextWeek}
                generating={generating}
                viewingHistory={viewingHistory}
                routineIsStale={routineIsStale}
                weeksElapsed={weeksElapsed}
                onStartNewWeek={handleStartNewWeek}
              />
            )}

            {activeView === 'routine' && (
              <RoutineView
                routine={routine}
                diet={dietPlan}
                onNavigateToWorkout={(dayIndex) => {
                  setSelectedDayIndex(dayIndex)
                  setActiveView('workout')
                }}
                onGenerateRoutine={() => handleGenerateRoutine(false)}
                onGenerateNextWeek={handleGenerateNextWeek}
                completionPercentage={calculateCompletionPercentage()}
                currentWeekNumber={currentWeekNumber}
                generating={generating}
                generationStage={generationStage}
                viewingHistory={viewingHistory}
                dayCompletions={dayCompletions}
                onToggleDayComplete={handleToggleDayComplete}
                routineIsStale={routineIsStale}
                weeksElapsed={weeksElapsed}
                onStartNewWeek={handleStartNewWeek}
              />
            )}

            {activeView === 'workout' && (
              <WorkoutView
                routine={routine}
                selectedDayIndex={selectedDayIndex}
                currentRoutineId={currentRoutineId}
                exerciseCompletions={exerciseCompletions}
                dayCompletions={dayCompletions}
                onToggleExercise={handleToggleExercise}
                onToggleRestDay={handleToggleRestDay}
                onEnsureRoutineSaved={() => routine ? saveRoutineToDatabase(routine) : Promise.resolve(null)}
                onBack={() => setActiveView('routine')}
              />
            )}

            {activeView === 'diet' && (
              <DietView
                diet={dietPlan}
                onGenerateDiet={handleGenerateDiet}
                generating={generatingDiet}
              />
            )}

            {activeView === 'analytics' && (
              <AnalyticsView premiumStatus={effectivePremium} onUpgrade={() => setUpgradeOpen(true)} />
            )}

            {activeView === 'coach' && (
              <CoachView
                onUpgrade={() => setUpgradeOpen(true)}
                showToast={showToast}
              />
            )}

            {activeView === 'measurements' && (
              <MeasurementsView />
            )}

            {activeView === 'profile' && (
              <ProfileView
                profile={profile}
                onOpenCoachApply={() => router.push('/coach/apply')}
                onOpenCoachPortal={() => router.push('/coach/portal')}
                name={name}
                age={age}
                weight={weight}
                height={height}
                heightUnit={heightUnit}
                heightFeet={heightFeet}
                heightInches={heightInches}
                gender={gender}
                goal={goal}
                level={level}
                tenure={tenure}
                goalWeight={goalWeight}
                goalDuration={goalDuration}
                sessionDuration={sessionDuration}
                notes={notes}
                resolvedHeightCm={resolvedHeightCm}
                dietType={dietType}
                cuisine={cuisine}
                proteinPowder={proteinPowder}
                proteinPowderAmount={proteinPowderAmount}
                specificFoodPreferences={specificFoodPreferences}
                mealsPerDay={mealsPerDay}
                allergies={allergies}
                cookingLevel={cookingLevel}
                budget={budget}
                gymPhotos={gymPhotos}
                equipmentAnalysis={equipmentAnalysis}
                onGymPhotoUpload={handleGymPhotoUpload}
                onGymPhotoDelete={handleGymPhotoDelete}
                analyzingEquipment={analyzingEquipment}
                equipmentError={equipmentError}
                bodyPhotos={bodyPhotos}
                bodyAnalysis={bodyAnalysis}
                onBodyPhotoUpload={handleBodyPhotoUpload}
                onBodyPhotoDelete={handleBodyPhotoDelete}
                analyzingBody={analyzingBody}
                bodyError={bodyError}
                onUpdateField={handleFieldUpdate}
                onSaveProfile={handleSaveProfile}
                onResetRoutines={handleResetRoutines}
                onLogout={handleLogout}
                loading={loading}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation — hide when sidebar is open */}
      {!isSidebarOpen && <BottomNav activeView={activeView} onViewChange={handleViewChange} />}

      {/* Toast Notifications - Top Center */}
      <ToastContainer />

      {/* Confirm Modal */}
      <ConfirmModal
        open={!!modalConfig}
        type={modalConfig?.type || 'warning'}
        title={modalConfig?.title || ''}
        message={modalConfig?.message || ''}
        confirmLabel={modalConfig?.type === 'error' ? 'Dismiss' : 'Continue'}
        onConfirm={() => {
          if (modalConfig?.onConfirm) modalConfig.onConfirm()
          else setModalConfig(null)
        }}
        onCancel={modalConfig?.onCancel ? () => {
          if (modalConfig?.onCancel) modalConfig.onCancel()
          else setModalConfig(null)
        } : undefined}
      />

      <UpgradeModal
        open={upgradeOpen}
        status={premiumStatus}
        onClose={() => setUpgradeOpen(false)}
        onUnlocked={(s) => {
          setPremiumStatus(s)
          setUpgradeOpen(false)
          setActiveView('analytics')
        }}
        showToast={showToast}
      />
    </div>
  )
}
