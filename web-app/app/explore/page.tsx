'use client'

import Link from 'next/link'
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

export default function ExplorePage() {
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

      {/* Screenshot + proof points */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center mb-8"
      >
        <img
          src="/dashboard-screenshot.png"
          alt="GymBro dashboard showing today's workout and nutrition"
          className="rounded-2xl shadow-2xl w-full order-first md:order-last"
        />
        <div className="space-y-8">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Your day, laid out.</h3>
            <p className="text-sm text-gray-500 dark:text-white/60 leading-relaxed">
              Today&apos;s workout, estimated time, and meals like Rajma Chawal and Egg Bhurji — planned for you automatically.
            </p>
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Keep your streak.</h3>
            <p className="text-sm text-gray-500 dark:text-white/60 leading-relaxed">
              A simple daily streak counter keeps you consistent without nagging notifications.
            </p>
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Starts at ₹1/month.</h3>
            <p className="text-sm text-gray-500 dark:text-white/60 leading-relaxed">
              Free to use for workouts and diet plans. Unlock analytics and coach booking for ₹1/month.
            </p>
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
        <Link
          href="/login"
          className="w-full rounded-xl bg-[#22c55e] px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#16a34a] transition-all active:scale-[0.98] text-center"
        >
          Try it for free
        </Link>
        <Link
          href="/login"
          className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-6 py-3.5 text-sm font-medium text-gray-600 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white/90 transition-all active:scale-[0.98] text-center"
        >
          Sign in to your account
        </Link>
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
