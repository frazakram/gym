'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { WeeklyRoutine, Profile, WeeklyDiet, PremiumStatus } from '@/types'
import { BottomNav } from '@/components/BottomNav'
import { HomeView } from '@/components/views/HomeView'
import { RoutineView } from '@/components/views/RoutineView'
import { WorkoutView } from '@/components/views/WorkoutView'
import { ProfileView } from '@/components/views/ProfileView'
import { DietView } from '@/components/views/DietView'
import { AnalyticsView } from '@/components/views/AnalyticsView'
import { Sidebar } from '@/components/Sidebar'
import { Toast, ToastType } from '@/components/ui/Toast'
import { UpgradeModal } from '@/components/ui/UpgradeModal'

export default function DashboardPage() {
  const router = useRouter()
  const [activeView, setActiveView] = useState<'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics'>('home')
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

  // Toast notifications
  interface ToastItem {
    id: string
    message: string
    type: ToastType
  }
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = (message: string, type: ToastType) => {
    const id = `toast-${Date.now()}`
    setToasts(prev => [...prev, { id, message, type }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const fetchPremiumStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/status', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as PremiumStatus
      setPremiumStatus(data)
    } catch {
      // ignore
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
  const [generatingDiet, setGeneratingDiet] = useState(false) // Independent loading state

  // Progress tracking state
  const [currentRoutineId, setCurrentRoutineId] = useState<number | null>(null)
  const [currentWeekNumber, setCurrentWeekNumber] = useState(1)
  const [exerciseCompletions, setExerciseCompletions] = useState<Map<string, boolean>>(new Map())
  const [userId, setUserId] = useState<number | null>(null)

  const resolvedHeightCm = useMemo(() => {
    if (heightUnit === 'cm') return typeof height === 'number' ? height : null
    if (typeof heightFeet !== 'number' || typeof heightInches !== 'number') return null
    const inches = Math.max(0, Math.min(11.9, heightInches))
    const ftInToCm = (ft: number, inches: number) => ft * 30.48 + inches * 2.54
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

        const compRes = await fetch(`/api/completions?routineId=${routine.id}`)
        const { completions } = await compRes.json()

        const map = new Map<string, boolean>()
        completions.forEach((c: any) => {
          map.set(`${c.day_index}-${c.exercise_index}`, c.completed)
        })
        setExerciseCompletions(map)

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
      const res = await fetch('/api/diet');
      const data = await res.json();
      if (data.diet) {
        setDietPlan(data.diet.diet_json);
      }
    } catch (err) {
      console.error('Error fetching latest diet:', err);
    }
  }, []);

  useEffect(() => {
    fetchProfile()
    fetchLatestRoutine()
    fetchLatestDiet()
    fetchPremiumStatus()
  }, [fetchProfile, fetchLatestRoutine, fetchLatestDiet, fetchPremiumStatus])

  useEffect(() => {
    // keep premium status fresh when returning to tab
    const onFocus = () => fetchPremiumStatus()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [fetchPremiumStatus])

  const effectivePremium: PremiumStatus = premiumStatus ?? {
    premium: false,
    status: null,
    subscription_id: null,
    current_end: null,
  }

  const handleViewChange = (view: 'home' | 'routine' | 'workout' | 'profile' | 'diet' | 'analytics') => {
    if (view === 'analytics') {
      if (effectivePremium.premium) {
        setActiveView('analytics')
      } else {
        setUpgradeOpen(true)
      }
      return
    }
    setActiveView(view)
  }

  const fetchHistory = async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/routines?all=true')
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

  const handleSelectHistoryRoutine = async (historyItem: any) => {
    setRoutine(historyItem.routine_json)
    setCurrentRoutineId(historyItem.id)
    setCurrentWeekNumber(historyItem.week_number)
    
    // Attempt to load associated diet for this week
    try {
      const dietRes = await fetch(`/api/diet?week=${historyItem.week_number}`);
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
      const compRes = await fetch(`/api/completions?routineId=${historyItem.id}`)
      const { completions } = await compRes.json()
      const map = new Map<string, boolean>()
        completions.forEach((c: any) => {
          map.set(`${c.day_index}-${c.exercise_index}`, c.completed)
        })
      setExerciseCompletions(map)
      
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

  const saveRoutineToDatabase = async (routineData: WeeklyRoutine) => {
    try {
      let currentUserId = userId
      if (!currentUserId) {
        const profileRes = await fetch('/api/profile')
        const profileData = await profileRes.json()
        if (profileData.profile?.user_id) {
          currentUserId = profileData.profile.user_id
          setUserId(currentUserId)
        } else {
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
        return data.routineId
      }
      return null
    } catch (err) {
      console.error('Error saving routine:', err)
      return null
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
          tenure: profile.tenure || tenure,
          goal_weight: profile.goal_weight,
          notes: profile.notes,
          goal_duration: profile.goal_duration,
          model_provider: 'OpenAI',
          is_next_week: isNextWeek,
          week_number: targetWeekNumber,
        }),
      })

      if (response.ok) {
        lastGenProfileRef.current = JSON.stringify({
          age, weight, height: resolvedHeightCm, gender, goal, level, tenure, goalWeight, goalDuration, notes,
           dietType, cuisine, proteinPowder, mealsPerDay, allergies
        })
      }

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate routine')
      }

      setRoutine(data.routine)

      if (data.week_number) {
        setCurrentWeekNumber(data.week_number)
      } else if (isNextWeek) {
        setCurrentWeekNumber(prev => prev + 1)
      }

      if (data.source === 'db') {
        setSuccess('Loaded existing routine for this week.')
        if (data.routine_id) {
          setCurrentRoutineId(data.routine_id)
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
        setExerciseCompletions(new Map())
        await saveRoutineToDatabase(data.routine)
        
        // Auto-trigger diet generation if routine is new
        handleGenerateDiet();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setGenerating(false)
    }
  }



  const handleGenerateDiet = async (isNextWeek = false) => {
     if (!profile) return;
     setGeneratingDiet(true);
     setError('');
     setSuccess('');

     try {
       const dietRes = await fetch('/api/diet/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             routine: routine, // Pass context if available
             model_provider: 'OpenAI'
          })
       })
       const dietData = await dietRes.json()
       if (!dietRes.ok) throw new Error(dietData.error || 'Failed to generate diet');
       

       
       if (dietData.dietPlan) {
          setDietPlan(dietData.dietPlan)
          setSuccess('Diet plan generated successfully!');

          // Save diet
          await fetch('/api/diet/save', {
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
          const res = await fetch('/api/routines/reset', { method: 'DELETE' })
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
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleGenerateNextWeek = async () => {
    await handleGenerateRoutine(true)
  }

  const calculateCompletionPercentage = () => {
    if (!routine) return 0
    let total = 0
    let completed = 0
    routine.days.forEach((day, dIdx) => {
      day.exercises.forEach((_, eIdx) => {
        total++
        if (exerciseCompletions.get(`${dIdx}-${eIdx}`)) completed++
      })
    })
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  const handleFieldUpdate = (field: string, value: any) => {
    switch(field) {
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
    }
  }

  const handleToggleExercise = (dayIndex: number, exerciseIndex: number, completed: boolean) => {
    setExerciseCompletions(prev => {
      const next = new Map(prev)
      next.set(`${dayIndex}-${exerciseIndex}`, completed)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        routines={historyRoutines}
        currentRoutineId={currentRoutineId}
        onSelectRoutine={handleSelectHistoryRoutine}
        loading={loadingHistory}
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
               className="p-2 bg-slate-800/80 backdrop-blur rounded-full text-white shadow-lg border border-white/10 hover:bg-slate-700/80 transition-colors"
             >
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
               </svg>
             </button>
        </div>
        
        {/* View Rendering */}
        {activeView === 'home' && (
          <HomeView
            profile={profile}
            routine={routine}
            diet={dietPlan}
            exerciseCompletions={exerciseCompletions}
            currentWeekNumber={currentWeekNumber}
            onNavigateToWorkout={() => setActiveView('workout')}
            onGenerateRoutine={() => handleGenerateRoutine(false)}
            onGenerateNextWeek={handleGenerateNextWeek}
            generating={generating}
            viewingHistory={viewingHistory}
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
            viewingHistory={viewingHistory}
          />
        )}

        {activeView === 'workout' && (
          <WorkoutView
            routine={routine}
            selectedDayIndex={selectedDayIndex}
            currentRoutineId={currentRoutineId}
            exerciseCompletions={exerciseCompletions}
            onToggleExercise={handleToggleExercise}
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
          <AnalyticsView
            premiumStatus={effectivePremium}
            onUpgrade={() => setUpgradeOpen(true)}
          />
        )}

        {activeView === 'profile' && (
          <ProfileView
            profile={profile}
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
            onUpdateField={handleFieldUpdate}
            onSaveProfile={handleSaveProfile}
            onResetRoutines={handleResetRoutines}
            onLogout={handleLogout}
            loading={loading}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeView={activeView} onViewChange={handleViewChange} />

      {/* Toast Notifications */}
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{ bottom: `${6 + index * 5}rem` }}
          className="fixed left-0 right-0 z-[60]"
        >
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}

      {/* Modal */}
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
