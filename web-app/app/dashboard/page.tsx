'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { WeeklyRoutine, Profile } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'profile' | 'routine'>('profile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null)
  const [age, setAge] = useState(25)
  const [weight, setWeight] = useState(70)
  const [height, setHeight] = useState(170)
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
        setAge(data.profile.age)
        setWeight(data.profile.weight)
        setHeight(data.profile.height)
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
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age,
          weight,
          height,
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
          height: profile.height ?? height,
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
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-black">G</span>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-cyan-300 tracking-tight">GymBro AI</h1>
              <p className="text-sm text-gray-400">Personalized routines, tuned to your stats.</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg border border-red-500/50 transition"
          >
            Logout
          </button>
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

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'profile'
                ? 'bg-cyan-500 text-white shadow-lg'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            My Profile
          </button>
          <button
            onClick={() => setActiveTab('routine')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'routine'
                ? 'bg-cyan-500 text-white shadow-lg'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            My Routine
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700">
            <div className="flex items-start justify-between gap-6 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-100">Update Your Profile</h2>
                <p className="text-sm text-gray-400 mt-1">
                  These details are used to tailor your routine intensity, volume, and exercise selection.
                </p>
              </div>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    min="16"
                    max="100"
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    min="30"
                    max="300"
                    step="0.1"
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Height (cm)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    min="100"
                    max="250"
                    step="0.1"
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Experience Level</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as 'Beginner' | 'Regular' | 'Expert')}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Regular">Regular</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Profile['gender'])}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    Used only to tailor exercise selection and recovery assumptions (no storage beyond your profile).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Goal</label>
                  <select
                    value={goal}
                    onChange={(e) => setGoal(e.target.value as Profile['goal'])}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="General fitness">General fitness</option>
                    <option value="Fat loss">Fat loss</option>
                    <option value="Muscle gain">Muscle gain</option>
                    <option value="Strength">Strength</option>
                    <option value="Recomposition">Recomposition</option>
                    <option value="Endurance">Endurance</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Training Duration</label>
                  <input
                    type="text"
                    value={tenure}
                    onChange={(e) => setTenure(e.target.value)}
                    placeholder="e.g., '6 months' or 'Just started'"
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Goal Weight (kg)</label>
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
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Optional — helps the routine bias toward the right intensity/cardio/recovery strategy.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Additional comments</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Injuries, goals (fat loss/strength/hypertrophy), equipment limits, days per week, exercises you love/hate, etc."
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white resize-y"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>
        )}

        {/* Routine Tab */}
        {activeTab === 'routine' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Generation panel */}
              <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 sm:p-8 border border-gray-700">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-100">Generate Workout Routine</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      Uses your profile (including gender and comments) to tailor volume and recovery.
                    </p>
                  </div>
                  {profile && (
                    <button
                      onClick={() => setActiveTab('profile')}
                      className="shrink-0 px-3 py-2 rounded-lg bg-gray-700/40 hover:bg-gray-700 text-gray-200 border border-gray-600 transition"
                    >
                      Edit profile
                    </button>
                  )}
                </div>

                {/* Profile summary */}
                {profile ? (
                  <div className="mb-6 rounded-xl border border-gray-700 bg-gray-900/30 p-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-200 border border-cyan-500/30 text-sm">
                        {profile.level}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-200 border border-emerald-500/30 text-sm">
                        {profile.goal}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-gray-700/40 text-gray-200 border border-gray-600 text-sm">
                        {profile.age}y
                      </span>
                      <span className="px-3 py-1 rounded-full bg-gray-700/40 text-gray-200 border border-gray-600 text-sm">
                        {profile.weight}kg
                      </span>
                      {typeof profile.goal_weight === 'number' && (
                        <span className="px-3 py-1 rounded-full bg-gray-700/40 text-gray-200 border border-gray-600 text-sm">
                          Goal {profile.goal_weight}kg
                        </span>
                      )}
                      <span className="px-3 py-1 rounded-full bg-gray-700/40 text-gray-200 border border-gray-600 text-sm">
                        {profile.height}cm
                      </span>
                      <span className="px-3 py-1 rounded-full bg-gray-700/40 text-gray-200 border border-gray-600 text-sm">
                        {profile.gender}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-gray-700/40 text-gray-200 border border-gray-600 text-sm">
                        {profile.tenure}
                      </span>
                    </div>
                    {profile.notes && (
                      <p className="text-sm text-gray-300 mt-3 line-clamp-3">
                        <span className="text-gray-400">Notes:</span> {profile.notes}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-200">
                    Please complete your profile first — routine generation is disabled until then.
                  </div>
                )}

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">AI Provider</label>
                    <select
                      value={modelProvider}
                      onChange={(e) => setModelProvider(e.target.value as 'Anthropic' | 'OpenAI')}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="Anthropic">Anthropic (Claude)</option>
                      <option value="OpenAI">OpenAI (GPT-4)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {modelProvider} API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => {
                        const v = e.target.value
                        setApiKey(v)
                        // Helpful auto-detection: Anthropic keys start with "sk-ant-"
                        if (v.startsWith('sk-ant-')) setModelProvider('Anthropic')
                        else if (v.startsWith('sk-')) setModelProvider('OpenAI')
                      }}
                      placeholder={`Enter your ${modelProvider} API key`}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Your key is used only for this request and is not stored. If your server has an env key set, you can leave this blank.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleGenerateRoutine}
                  disabled={generating || !profile}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                >
                  {generating ? 'Generating…' : 'Generate New Routine'}
                </button>

                {/* Progress */}
                {generating && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <span>{progressStage || 'Working…'}</span>
                      <span>{Math.min(100, Math.max(0, progressPct))}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-700/60 rounded-full overflow-hidden border border-gray-600">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      If you see “Connection error”, your network may be blocking access to the AI provider.
                    </p>
                  </div>
                )}
              </div>

            {/* Routine Display */}
              <div className="lg:col-span-3 bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 sm:p-8 border border-gray-700">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <h3 className="text-2xl font-bold text-cyan-300">Your Weekly Routine</h3>
                  {!routine && (
                    <span className="text-sm text-gray-400">Generate to see your plan here</span>
                  )}
                </div>

                {!routine ? (
                  <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-6 text-gray-300">
                    <p className="text-sm text-gray-400">
                      Tip: Add injuries/goals in “Additional comments” to get safer, more relevant routines.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {routine.days.map((day, dayIndex) => (
                      <div key={dayIndex} className="rounded-xl border border-gray-700 bg-gray-900/20 p-5">
                        <h4 className="text-lg font-bold text-gray-100 mb-4">{day.day}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {day.exercises.map((exercise, exIndex) => (
                            <div
                              key={exIndex}
                              className="bg-gray-700/25 rounded-lg p-4 border border-gray-600 hover:border-cyan-500 transition"
                            >
                              <div className="flex justify-between items-start gap-3 mb-2">
                                <h5 className="text-base font-semibold text-cyan-300">{exercise.name}</h5>
                                <a
                                  href={exercise.youtube_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-3 py-1 bg-red-600/90 hover:bg-red-700 rounded-full transition"
                                >
                                  Watch
                                </a>
                              </div>
                              <p className="text-gray-200 text-sm mb-2">{exercise.sets_reps}</p>
                              <details className="text-sm text-gray-400">
                                <summary className="cursor-pointer hover:text-cyan-300 transition">
                                  Form guide
                                </summary>
                                <p className="mt-2 pl-4 border-l-2 border-gray-600">{exercise.form_tip}</p>
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
      </div>
    </div>
  )
}
