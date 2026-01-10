'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { BrandLogo } from '@/components/BrandLogo'
import { LoginMascot } from '@/components/LoginMascot'

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [isLoginFailed, setIsLoginFailed] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

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

      if (isLogin) {
        router.push('/dashboard')
      } else {
        setError('')
        setIsLogin(true)
        setPassword('')
        alert('Account created! Please log in.')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      setIsLoginFailed(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-stretch overflow-hidden">
      {/* Left Side - Interactive Mascot Characters */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 border-r border-white/10">
        {/* Background effects for deep space/glass vibe - BRIGHTER for visibility */}
        <div className="absolute inset-0 bg-slate-800/50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,233,0.3),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.3),transparent_50%)]" />

        {/* Mascot Container */}
        <motion.div
          initial={{ y: -200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 15, delay: 0 }} // Heavy drop, first
          className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8"
        >
          <div className="w-full max-w-lg aspect-square scale-110">
            <LoginMascot isPasswordFocused={passwordFocused} isLoginFailed={isLoginFailed} />
          </div>
          <div className="mt-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Join the Movement</h2>
            <p className="text-slate-400 max-w-sm mx-auto">
              Your personal AI fitness companion waiting to help you achieve your goals.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Dark Glass Login Form (Original Colors) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-10 relative">
        {/* Mobile background only */}
        <div className="absolute inset-0 lg:hidden z-0">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" />
        </div>

        <div className="w-full max-w-md relative z-10">
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring" }} // Stagger 2
            className="text-center mb-8"
          >
            <div className="flex justify-center mb-4">
              <BrandLogo size={72} className="rounded-3xl" />
            </div>
            <h1 className="text-4xl font-semibold tracking-tight bg-gradient-to-r from-cyan-200 via-sky-200 to-violet-200 bg-clip-text text-transparent mb-2">
              Gym Bro
            </h1>
            <p className="text-sm text-slate-300/80">
              Welcome back! Please enter your details.
            </p>
          </motion.div>

          <div className="glass glow-ring rounded-2xl p-6 sm:p-8">
            <div className="flex mb-6 glass-soft rounded-xl p-1">
              <button
                onClick={() => {
                  setIsLogin(true)
                  setError('')
                }}
                className={`flex-1 py-2 rounded-md font-medium transition-all ${isLogin
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
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
                className={`flex-1 py-2 rounded-md font-medium transition-all ${!isLogin
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                  : 'text-slate-300/70 hover:text-white'
                  }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isLogin && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setError('')
                      window.location.href = '/api/auth/google/start?returnTo=/dashboard'
                    }}
                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-100 transition shadow-lg"
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

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10" />
                    <div className="text-xs text-slate-300/70">or</div>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-200/90 mb-2">
                  Email / Username
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-300/70">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M4 6.5v11A2.5 2.5 0 0 0 6.5 20h11A2.5 2.5 0 0 0 20 17.5v-11A2.5 2.5 0 0 0 17.5 4h-11A2.5 2.5 0 0 0 4 6.5Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        opacity="0.65"
                      />
                      <path
                        d="m5.5 7.5 6.1 4.6a1 1 0 0 0 1.2 0l6.2-4.6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value)
                      if (isLoginFailed) setIsLoginFailed(false)
                    }}
                    required
                    className="w-full pl-10 pr-4 py-3 glass-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400/60 text-white placeholder:text-slate-300/50 transition"
                    placeholder="Enter your email or username"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-200/90">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs text-slate-300/70 hover:text-cyan-200 transition"
                    onClick={() => setError('')}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-300/70">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M7.5 11V8.8A4.5 4.5 0 0 1 12 4.3a4.5 4.5 0 0 1 4.5 4.5V11"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M7.2 11h9.6A2.2 2.2 0 0 1 19 13.2v4.6A2.2 2.2 0 0 1 16.8 20H7.2A2.2 2.2 0 0 1 5 17.8v-4.6A2.2 2.2 0 0 1 7.2 11Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        opacity="0.65"
                      />
                    </svg>
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
                    className="w-full pl-10 pr-4 py-3 glass-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400/60 text-white placeholder:text-slate-300/50 transition"
                    placeholder="Enter your password"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                  />
                </div>
                {!isLogin && (
                  <p className="mt-2 text-xs text-slate-400">
                    Must be at least 6 characters, including uppercase, number, and special character.
                  </p>
                )}
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-cyan-500/10"
              >
                {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
              </button>

              <p className="text-center text-xs text-slate-300/70 pt-2">
                {isLogin ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      className="text-cyan-200 hover:text-cyan-100 transition font-medium"
                      onClick={() => {
                        setIsLogin(false)
                        setError('')
                      }}
                    >
                      Register →
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      className="text-cyan-200 hover:text-cyan-100 transition font-medium"
                      onClick={() => {
                        setIsLogin(true)
                        setError('')
                      }}
                    >
                      Login →
                    </button>
                  </>
                )}
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
