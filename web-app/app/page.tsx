'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'

function ThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])
  function toggle() {
    const isDark = document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
    setDark(isDark)
  }
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="absolute top-4 right-4 p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-white/50 dark:hover:bg-white/[0.06] transition-colors"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="relative min-h-screen bg-white dark:bg-navy-0 flex flex-col items-center justify-center px-5 py-16 overflow-hidden">
      <ThemeToggle />
      {/* Logo + Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center mb-8"
      >
        <BrandLogo size={72} className="mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight font-display">
          Gym<span className="text-[#22c55e]">Bro</span>
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-white/50 text-center max-w-[280px]">
          Build a routine, eat better, and actually stick to it this time
        </p>
      </motion.div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-full max-w-xs mb-8"
      >
        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-[13px] top-7 bottom-7 w-px bg-gray-200 dark:bg-white/10" />

          {/* Step 1 */}
          <div className="relative flex gap-4 pb-7">
            <div className="shrink-0 w-7 h-7 rounded-full bg-[#22c55e] flex items-center justify-center z-10">
              <span className="text-white text-xs font-bold">1</span>
            </div>
            <div className="pt-0.5">
              <p className="text-[15px] font-semibold text-gray-900 dark:text-white leading-snug">Tell us your goal</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['Muscle gain', 'Fat loss', 'Maintain'].map(tag => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/50 border border-gray-200 dark:border-white/10">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative flex gap-4 pb-7">
            <div className="shrink-0 w-7 h-7 rounded-full bg-[#22c55e] flex items-center justify-center z-10">
              <span className="text-white text-xs font-bold">2</span>
            </div>
            <div className="pt-0.5">
              <p className="text-[15px] font-semibold text-gray-900 dark:text-white leading-snug">Get your week planned</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['Workouts', 'Rajma Chawal', 'Egg Bhurji'].map(tag => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/50 border border-gray-200 dark:border-white/10">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative flex gap-4">
            <div className="shrink-0 w-7 h-7 rounded-full bg-[#22c55e] flex items-center justify-center z-10">
              <span className="text-white text-xs font-bold">3</span>
            </div>
            <div className="pt-0.5">
              <p className="text-[15px] font-semibold text-gray-900 dark:text-white leading-snug">Show up and track it</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['Daily streak', 'No notifications'].map(tag => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/50 border border-gray-200 dark:border-white/10">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="w-full max-w-sm flex flex-col gap-4"
      >
        <button
          onClick={() => router.push('/demo')}
          className="w-full rounded-xl bg-[#22c55e] px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#16a34a] transition-all active:scale-[0.98]"
        >
          Try it for free
        </button>
        <button
          onClick={() => router.push('/login')}
          className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-6 py-3.5 text-sm font-medium text-gray-600 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white/90 transition-all active:scale-[0.98]"
        >
          Sign in to your account
        </button>
      </motion.div>

      {/* Subtle bottom text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-xs text-gray-400 dark:text-white/50"
      >
        No credit card needed · Takes about 2 minutes to set up
      </motion.p>
    </div>
  )
}
