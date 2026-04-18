'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { BrandLogo } from '@/components/BrandLogo'
import LoginAnimation from '@/components/LoginAnimation'
import { storeSessionIndicator } from '@/lib/useSessionPersistence'
import { Mail, Lock } from 'lucide-react'

const staggerItem = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: 'easeOut' as const },
})

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [isLoginFailed, setIsLoginFailed] = useState(false)

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 6) {
      return 'Password must be at least 6 characters long'
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number'
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)) {
      return 'Password must contain at least one special character'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Client-side validation for registration
    if (!isLogin) {
      const passwordError = validatePassword(password)
      if (passwordError) {
        setError(passwordError)
        setLoading(false)
        return
      }
    }

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Something went wrong')
        setIsLoginFailed(true)
        setLoading(false)
        return
      }

      // Store session indicator in localStorage for Android persistence
      storeSessionIndicator()

      // LoginAnimation state tracking
      localStorage.setItem('hasAccount', 'true')
      localStorage.setItem('lastLoginDate', new Date().toISOString())
      localStorage.setItem('justLoggedOut', 'false')
      // Save stats from auth response if present (populated on logout; ?? '' preserves existing value)
      if (data.streak != null) localStorage.setItem('lastStreak', String(data.streak))
      if (data.calories != null) localStorage.setItem('lastCalories', String(data.calories))
      if (data.currentWeek != null) localStorage.setItem('lastWeek', String(data.currentWeek))
      if (data.bestStreak != null) localStorage.setItem('bestStreak', String(data.bestStreak))

      if (isLogin) {
        router.replace('/dashboard')
      } else {
        // New user — go straight to onboarding wizard
        router.replace('/onboarding')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      setIsLoginFailed(true)
      setLoading(false)
    }
  }

  // Base stagger delay for form elements
  const baseDelay = 0.2

  return (
    <div className="min-h-screen flex flex-col lg:flex-row items-stretch overflow-hidden">
      {/* Left Side - LoginAnimation panel (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col" style={{ background: '#080c14', minHeight: '100vh' }}>
        <LoginAnimation />
      </div>

      {/* Right Side - Dark Glass Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-10 relative bg-navy-0">

        <div className="w-full max-w-md relative z-10">
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring' }}
            className="text-center mb-8"
          >
            <div className="flex justify-center mb-4">
              <BrandLogo size={72} className="rounded-3xl" />
            </div>
            <h1 className="text-4xl font-semibold tracking-tight bg-gradient-to-r from-purple-400 via-violet-300 to-cyan-300 bg-clip-text text-transparent mb-2 font-display">
              Gym Bro
            </h1>
            <p className="text-sm text-slate-300/80">
              Welcome back! Please enter your details.
            </p>
          </motion.div>

          <div className="glass glow-ring rounded-2xl p-6 sm:p-8 border border-purple-500/20">
            {/* Login / Register Toggle Tabs */}
            <motion.div {...staggerItem(baseDelay)} className="flex mb-6 glass-soft rounded-xl p-1">
              <button
                onClick={() => {
                  setIsLogin(true)
                  setError('')
                }}
                className={`flex-1 py-2 rounded-md font-medium transition-all ${
                  isLogin
                    ? 'bg-gradient-to-r from-purple-600 to-violet-500 text-white shadow-lg shadow-purple-500/25'
                    : 'text-slate-300/70 hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => {
                  setIsLogin(false)
                  setError('')
                }}
                className={`flex-1 py-2 rounded-md font-medium transition-all ${
                  !isLogin
                    ? 'bg-gradient-to-r from-purple-600 to-violet-500 text-white shadow-lg shadow-purple-500/25'
                    : 'text-slate-300/70 hover:text-white'
                }`}
              >
                Register
              </button>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isLogin && (
                <>
                  <motion.div {...staggerItem(baseDelay + 0.05)}>
                    <button
                      type="button"
                      onClick={() => {
                        setError('')
                        window.location.href = '/api/auth/google/start?returnTo=/dashboard'
                      }}
                      className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-100 transition shadow-lg shadow-purple-500/10"
                    >
                      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.73 1.22 9.25 3.63l6.9-6.9C35.94 2.39 30.36 0 24 0 14.62 0 6.5 5.38 2.56 13.22l8.04 6.24C12.44 13.16 17.74 9.5 24 9.5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M46.5 24c0-1.57-.14-3.09-.41-4.56H24v8.63h12.62c-.54 2.9-2.15 5.36-4.58 7.02l7.05 5.47C43.65 36.19 46.5 30.62 46.5 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.6 28.54A14.5 14.5 0 0 1 9.5 24c0-1.58.28-3.1.78-4.54l-8.04-6.24A23.96 23.96 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l8.04-6.24z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 48c6.36 0 11.72-2.1 15.63-5.7l-7.05-5.47c-1.96 1.32-4.47 2.1-8.58 2.1-6.26 0-11.56-3.66-13.4-8.96l-8.04 6.24C6.5 42.62 14.62 48 24 48z"
                        />
                      </svg>
                      Sign in with Google
                    </button>
                  </motion.div>

                  <motion.div {...staggerItem(baseDelay + 0.1)} className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10" />
                    <div className="text-xs text-slate-300/70">or</div>
                    <div className="h-px flex-1 bg-white/10" />
                  </motion.div>
                </>
              )}

              <motion.div {...staggerItem(baseDelay + (isLogin ? 0.15 : 0.05))}>
                <label className="block text-sm font-medium text-slate-200/90 mb-2">
                  Email / Username
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-300/70">
                    <Mail size={18} strokeWidth={1.5} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value)
                      if (isLoginFailed) setIsLoginFailed(false)
                    }}
                    required
                    className="w-full pl-10 pr-4 py-3 glass-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/60 text-white placeholder:text-slate-300/50 transition border border-transparent focus:border-purple-500/30"
                    placeholder="Enter your email or username"
                    autoComplete="username"
                  />
                </div>
              </motion.div>

              <motion.div {...staggerItem(baseDelay + (isLogin ? 0.2 : 0.1))}>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-200/90">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs text-purple-300/70 hover:text-purple-200 transition"
                    onClick={() => setError('')}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-300/70">
                    <Lock size={18} strokeWidth={1.5} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (isLoginFailed) setIsLoginFailed(false)
                    }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    required
                    className="w-full pl-10 pr-4 py-3 glass-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/60 text-white placeholder:text-slate-300/50 transition border border-transparent focus:border-purple-500/30"
                    placeholder="Enter your password"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                  />
                </div>
                {!isLogin && (
                  <p className="mt-2 text-xs text-slate-400">
                    Must be at least 6 characters, including uppercase, number, and special character.
                  </p>
                )}
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200 text-sm"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div {...staggerItem(baseDelay + (isLogin ? 0.25 : 0.15))}>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-violet-500 hover:from-purple-700 hover:to-violet-600 text-white font-semibold py-3 rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-purple-500/20"
                >
                  {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
                </button>
              </motion.div>

              <motion.p
                {...staggerItem(baseDelay + (isLogin ? 0.3 : 0.2))}
                className="text-center text-xs text-slate-300/70 pt-2"
              >
                {isLogin ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      className="text-purple-300 hover:text-purple-200 transition font-medium"
                      onClick={() => {
                        setIsLogin(false)
                        setError('')
                      }}
                    >
                      Register &rarr;
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      className="text-purple-300 hover:text-purple-200 transition font-medium"
                      onClick={() => {
                        setIsLogin(true)
                        setError('')
                      }}
                    >
                      Login &rarr;
                    </button>
                  </>
                )}
              </motion.p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
