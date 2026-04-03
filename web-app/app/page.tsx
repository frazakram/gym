'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { BrandLogo } from '@/components/BrandLogo'
import { Dumbbell, Utensils, BarChart3, Users } from 'lucide-react'

const features = [
  { icon: Dumbbell, label: 'AI Workout Plans', desc: 'Personalized routines that adapt to you', color: '#8B5CF6' },
  { icon: Utensils, label: 'Smart Diet Plans', desc: 'Nutrition matched to your training', color: '#6EE7B7' },
  { icon: BarChart3, label: 'Track Progress', desc: 'Body metrics, streaks & analytics', color: '#FCD34D' },
  { icon: Users, label: 'Coach Connect', desc: 'Find and book expert coaches', color: '#67E8F9' },
]

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#0A0A14] flex flex-col items-center justify-center px-5 py-10 overflow-hidden">
      {/* Logo + Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center mb-8"
      >
        <BrandLogo size={72} className="mb-4" />
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Gym<span className="text-[#8B5CF6]">Bro</span>
        </h1>
        <p className="mt-2 text-sm text-white/50 text-center max-w-[280px]">
          Your AI-powered fitness companion for workouts, nutrition & progress tracking
        </p>
      </motion.div>

      {/* Feature Cards */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08 } },
        }}
        className="w-full max-w-sm grid grid-cols-2 gap-3 mb-10"
      >
        {features.map((f) => (
          <motion.div
            key={f.label}
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm"
          >
            <div
              className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${f.color}15` }}
            >
              <f.icon size={18} style={{ color: f.color }} />
            </div>
            <h3 className="text-[13px] font-semibold text-white mb-0.5">{f.label}</h3>
            <p className="text-[11px] text-white/40 leading-snug">{f.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="w-full max-w-sm flex flex-col gap-3"
      >
        <button
          onClick={() => router.push('/demo')}
          className="w-full rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#8B5CF6]/25 hover:shadow-[#8B5CF6]/40 transition-all active:scale-[0.98]"
        >
          Explore App →
        </button>
        <button
          onClick={() => router.push('/login')}
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3.5 text-sm font-medium text-white/70 hover:bg-white/[0.06] hover:text-white/90 transition-all active:scale-[0.98]"
        >
          Login / Sign Up
        </button>
      </motion.div>

      {/* Subtle bottom text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-[11px] text-white/20"
      >
        No credit card required · Free to explore
      </motion.p>
    </div>
  )
}
