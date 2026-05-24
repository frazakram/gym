'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { motion, useInView, type Variants } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'

// ── Shared animation variants ──────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}

function staggerContainer(delay = 0): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: delay } },
  }
}

// ── CountUp: animates a number when it scrolls into view ────────
function CountUp({
  to,
  prefix = '',
  suffix = '',
  duration = 1.8,
}: {
  to: number
  prefix?: string
  suffix?: string
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    let startTime: number | null = null
    const tick = (ts: number) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / (duration * 1000), 1)
      setCount(Math.floor(progress * to))
      if (progress < 1) requestAnimationFrame(tick)
      else setCount(to)
    }
    requestAnimationFrame(tick)
  }, [inView, to, duration])

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString('en-IN')}
      {suffix}
    </span>
  )
}

// ── CheckIcon ───────────────────────────────────────────────────
function CheckIcon({ color = 'teal' }: { color?: 'teal' | 'green' | 'amber' }) {
  const styles = {
    teal: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  }
  return (
    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${styles[color]}`}>
      ✓
    </span>
  )
}

export default function LandingPage() {
  return (
    <div className="w-full bg-white dark:bg-[#080c14] transition-colors duration-300">

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-[#080c14]/90 backdrop-blur-md border-b border-gray-100 dark:border-white/5 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-8 pr-16 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="GymBro" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-lg text-gray-900 dark:text-white transition-colors duration-300">GymBro</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
            >
              Features
            </button>
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
            >
              How it works
            </button>
            <button
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
            >
              Pricing
            </button>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full px-4 py-2 text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors duration-300"
            >
              Get started
            </Link>
          </div>
        </div>
        <ThemeToggle />
      </nav>

      {/* ── HERO ── */}
      <section className="transition-colors duration-300 bg-white dark:bg-[#080c14] min-h-screen flex items-center">
        <div className="mx-auto max-w-7xl px-6 md:px-16 lg:px-24 py-20 lg:py-28 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left: text — staggered fade-in-up on mount */}
            <motion.div
              className="flex flex-col gap-6"
              initial="hidden"
              animate="visible"
              variants={staggerContainer(0.1)}
            >
              <motion.span
                variants={fadeUp}
                className="inline-flex items-center gap-2 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded-full px-3 py-1 text-xs font-medium w-fit"
              >
                🇮🇳 Made for Indian athletes
              </motion.span>

              <motion.h1
                variants={fadeUp}
                className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-[1.05] text-gray-900 dark:text-white"
              >
                The fitness app that actually knows what you eat.
              </motion.h1>

              <motion.p variants={fadeUp} className="mt-6 text-lg text-gray-500 dark:text-gray-400 max-w-xl">
                GymBro builds your workouts around your gym and your meals around your kitchen — then gets smarter every week you show up.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
                {['✓ No generic meal plans', '✓ Adapts weekly', '✓ Free to start'].map((item) => (
                  <span
                    key={item}
                    className="bg-gray-50 dark:bg-white/5 rounded-full px-3 py-1 text-xs text-gray-500 dark:text-gray-400"
                  >
                    {item}
                  </span>
                ))}
              </motion.div>

              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
                {/* Start for free — rotating conic-gradient border */}
                <div className="relative inline-flex rounded-full p-[2px] overflow-hidden">
                  <span
                    className="pointer-events-none absolute"
                    style={{
                      inset: '-50%',
                      background: 'conic-gradient(from 0deg, transparent 0%, #00E5BC 25%, #5FFFE0 45%, transparent 65%)',
                      animation: 'orbit 3s linear infinite',
                    }}
                  />
                  <Link
                    href="/login"
                    className="relative z-10 bg-teal-500 hover:bg-teal-600 text-accent-ink rounded-full px-8 py-4 text-base font-semibold shadow-lg shadow-teal-500/25 transition-colors"
                  >
                    Start for free
                  </Link>
                </div>
                {/* Explore free — slower subtle conic-gradient border */}
                <div className="relative inline-flex rounded-full p-[2px] overflow-hidden">
                  <span
                    className="pointer-events-none absolute"
                    style={{
                      inset: '-50%',
                      background: 'conic-gradient(from 0deg, transparent 0%, rgba(0,229,188,0.5) 25%, rgba(95,255,224,0.35) 45%, transparent 65%)',
                      animation: 'orbit 4s linear infinite',
                    }}
                  />
                  <Link
                    href="https://finalgym.vercel.app/"
                    className="relative z-10 bg-white dark:bg-[#080c14] text-gray-700 dark:text-white rounded-full px-8 py-4 text-base hover:bg-gray-50 dark:hover:bg-[#0d1117] transition-colors"
                  >
                    Explore free →
                  </Link>
                </div>
              </motion.div>

              <motion.p variants={fadeUp} className="text-xs text-gray-400 dark:text-gray-500">
                Free forever for workouts and diet. No credit card needed.
              </motion.p>
              <motion.p variants={fadeUp} className="text-xs text-gray-400 dark:text-gray-500">
                Curious?{' '}
                <a
                  href="https://finalgym.vercel.app/"
                  className="underline hover:text-gray-600 dark:hover:text-gray-300"
                >
                  Explore without signing up →
                </a>
              </motion.p>
            </motion.div>

            {/* Right: phone mockup — entrance fade + continuous float */}
            <div className="flex items-center justify-center scale-[1.5] lg:scale-[1.5]">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.35, ease: 'easeOut' }}
              >
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
                >
                  <img
                    src="/app-dark.png"
                    alt="GymBro app dark mode"
                    className="hidden dark:block w-full drop-shadow-2xl"
                  />
                  <img
                    src="/app-light.png"
                    alt="GymBro app light mode"
                    className="block dark:hidden w-full drop-shadow-2xl"
                  />
                </motion.div>
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ── */}
      <section className="transition-colors duration-300 bg-gray-50 dark:bg-[#0d1117] border-y border-gray-100 dark:border-white/5">
        <div className="mx-auto max-w-7xl px-6 md:px-16 lg:px-24 py-16">
          <motion.div
            className="grid grid-cols-3 text-center divide-x divide-gray-200 dark:divide-white/10 max-w-3xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer()}
          >
            <motion.div variants={fadeUp} className="px-8">
              <p className="text-4xl font-black text-gray-900 dark:text-white">
                <CountUp to={10000} suffix="+" />
              </p>
              <p className="text-sm text-gray-400 mt-1">workout plans generated</p>
            </motion.div>
            <motion.div variants={fadeUp} className="px-8">
              <p className="text-4xl font-black text-gray-900 dark:text-white">Week 1</p>
              <p className="text-sm text-gray-400 mt-1">when users see first results</p>
            </motion.div>
            <motion.div variants={fadeUp} className="px-8">
              <p className="text-4xl font-black text-gray-900 dark:text-white">
                <CountUp to={49} prefix="₹" suffix="/mo" duration={1.2} />
              </p>
              <p className="text-sm text-gray-400 mt-1">to unlock everything</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURE: WORKOUTS ── */}
      <section id="features" className="transition-colors duration-300 bg-white dark:bg-[#080c14]">
        <div className="mx-auto max-w-7xl px-6 md:px-16 lg:px-24 py-20 lg:py-28">

          {/* Section header */}
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer()}
          >
            <motion.p variants={fadeUp} className="text-xs font-bold tracking-[0.2em] text-[#00E5BC] uppercase mb-4">
              What makes it different
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white">
              Built different.<br />Works better.
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={staggerContainer()}
            >
              <motion.p variants={fadeUp} className="text-xs font-bold tracking-[0.2em] text-[#00E5BC] uppercase">
                Workouts
              </motion.p>
              <motion.h3 variants={fadeUp} className="mt-3 text-3xl lg:text-5xl font-black text-gray-900 dark:text-white leading-tight">
                Learns your gym.<br />Improves every week.
              </motion.h3>
              <motion.p variants={fadeUp} className="text-gray-500 dark:text-gray-400 text-lg mt-4 leading-relaxed">
                Most apps give you the same plan forever. GymBro watches what you actually complete, what you skip, and what your gym has — then rewrites next week&apos;s plan around reality, not a template.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-col gap-3 mt-8">
                {[
                  'Adapts to your actual equipment',
                  'Progressive overload built in automatically',
                  'Skipped sessions recalibrated next week',
                  'Works for home gym, commercial, or bodyweight',
                ].map((pt) => (
                  <div key={pt} className="flex items-start gap-3">
                    <CheckIcon color="teal" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{pt}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>
            {/* Visual */}
            <motion.div
              className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827] p-6 shadow-sm"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-sm text-gray-900 dark:text-white">Pull Day — Week 3</span>
                <span className="text-xs text-gray-400">6 exercises</span>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  ['Lat Pulldown', '4 sets × 10 reps'],
                  ['Cable Row', '4 sets × 12 reps'],
                  ['Face Pull', '3 sets × 15 reps'],
                ].map(([name, sets]) => (
                  <div key={name} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#1a2234]">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{name}</span>
                    <span className="text-xs text-gray-400">{sets}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <p className="text-xs text-gray-400 mb-2">41% week done</p>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-white/10">
                  <div className="h-full rounded-full bg-[#00E5BC]" style={{ width: '41%' }} />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FEATURE: NUTRITION ── */}
      <section className="transition-colors duration-300 bg-gray-50 dark:bg-[#0d1117]">
        <div className="mx-auto max-w-7xl px-6 md:px-16 lg:px-24 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center lg:[&>*:first-child]:order-2">
            {/* Text — first in DOM, goes RIGHT on desktop */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={staggerContainer()}
            >
              <motion.p variants={fadeUp} className="text-xs font-bold tracking-[0.2em] text-[#00E5BC] uppercase">
                Nutrition
              </motion.p>
              <motion.h3 variants={fadeUp} className="mt-3 text-3xl lg:text-5xl font-black text-gray-900 dark:text-white leading-tight">
                Finally. Meal plans<br />with actual Indian food.
              </motion.h3>
              <motion.p variants={fadeUp} className="text-gray-500 dark:text-gray-400 text-lg mt-4 leading-relaxed">
                Chicken breast and broccoli don&apos;t live in Indian kitchens. GymBro is built around Rajma, Dal, Roti, Sabzi, and what you actually have at home — then hits your protein and calorie targets anyway.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-col gap-3 mt-8">
                {[
                  '500+ Indian dishes in the database',
                  'Calorie and protein targets set for you',
                  'Swap any meal without breaking the plan',
                  'Works with home cooking and restaurants',
                ].map((pt) => (
                  <div key={pt} className="flex items-start gap-3">
                    <CheckIcon color="green" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{pt}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>
            {/* Visual — second in DOM, goes LEFT on desktop */}
            <motion.div
              className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827] p-6 shadow-sm"
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-sm text-gray-900 dark:text-white">Today&apos;s meals</span>
                <span className="text-xs text-[#00E5BC] font-semibold">2490 kcal</span>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  ['Breakfast · Egg Bhurji & Toast', '480 kcal'],
                  ['Lunch · Rajma Chawal', '620 kcal'],
                  ['Snack · Banana + Peanut Butter', '210 kcal'],
                  ['Dinner · Dal Roti', '580 kcal'],
                ].map(([meal, cal]) => (
                  <div key={meal} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#1a2234]">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{meal}</span>
                    <span className="text-xs text-gray-400">{cal}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">147g protein today</p>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-white/10">
                  <div className="h-full rounded-full bg-[#22c55e]" style={{ width: '73%' }} />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FEATURE: PROGRESS ── */}
      <section className="transition-colors duration-300 bg-white dark:bg-[#080c14]">
        <div className="mx-auto max-w-7xl px-6 md:px-16 lg:px-24 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={staggerContainer()}
            >
              <motion.p variants={fadeUp} className="text-xs font-bold tracking-[0.2em] text-[#00E5BC] uppercase">
                Progress
              </motion.p>
              <motion.h3 variants={fadeUp} className="mt-3 text-3xl lg:text-5xl font-black text-gray-900 dark:text-white leading-tight">
                Your streak.<br />Your proof.
              </motion.h3>
              <motion.p variants={fadeUp} className="text-gray-500 dark:text-gray-400 text-lg mt-4 leading-relaxed">
                No complicated graphs. No data overload. Just a streak that shows you showed up, a weekly score, and a plan that quietly improves in the background.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-col gap-3 mt-8">
                {[
                  'Daily streak — breaks reset automatically',
                  'Skipped days logged, not punished',
                  'Week-by-week comparison built in',
                  'AI recalibrates every Monday morning',
                ].map((pt) => (
                  <div key={pt} className="flex items-start gap-3">
                    <CheckIcon color="amber" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{pt}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>
            {/* Visual */}
            <motion.div
              className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827] p-6 shadow-sm"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <p className="text-2xl font-black text-gray-900 dark:text-white">🔥 5 day streak</p>
              <p className="text-sm text-gray-400 mt-1">Best: 12 days</p>
              <div className="flex gap-2 flex-wrap mt-6">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                  <div key={day} className="flex flex-col items-center gap-1">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold ${i < 5
                        ? 'bg-teal-500 text-accent-ink'
                        : 'bg-gray-100 text-gray-400 dark:bg-[#1a2234] dark:text-gray-500'
                        }`}
                    >
                      {day[0]}
                    </div>
                    <span className="text-xs text-gray-400">{day}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <p className="text-xs text-gray-400 mb-2">41% this week</p>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-white/10">
                  <div className="h-full rounded-full bg-[#00E5BC]" style={{ width: '41%' }} />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="transition-colors duration-300 bg-gray-50 dark:bg-[#0d1117]">
        <div className="mx-auto max-w-7xl px-6 md:px-16 lg:px-24 py-20 lg:py-28">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer()}
          >
            <motion.p variants={fadeUp} className="text-xs font-bold tracking-[0.2em] text-[#00E5BC] uppercase mb-4">
              Getting started
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white">
              Up and running in 5 minutes.
            </motion.h2>
          </motion.div>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer()}
          >
            {[
              {
                num: '01',
                title: 'Tell us your goal',
                body: 'Pick muscle gain, fat loss, or maintain. Add your equipment and diet preferences. Done in under 2 minutes.',
              },
              {
                num: '02',
                title: 'Get your first week',
                body: 'GymBro generates a full 7-day workout and meal plan instantly. Real food. Real exercises. No filler.',
              },
              {
                num: '03',
                title: 'Log, improve, repeat',
                body: 'Every session you log teaches the AI. Week 2 is smarter than week 1. Week 4 is smarter than week 2.',
              },
            ].map(({ num, title, body }) => (
              <motion.div key={num} variants={fadeUp}>
                <p className="text-8xl font-black text-gray-100 dark:text-white/5 leading-none select-none">
                  {num}
                </p>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-2">{title}</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="transition-colors duration-300 bg-white dark:bg-[#080c14]">
        <div className="mx-auto max-w-7xl px-6 md:px-16 lg:px-24 py-20 lg:py-28">
          <motion.div
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer()}
          >
            <motion.h2 variants={fadeUp} className="text-4xl font-black text-gray-900 dark:text-white">Simple pricing.</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 dark:text-gray-400 mt-3">
              Start free. Upgrade when you&apos;re ready.
            </motion.p>
          </motion.div>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer()}
          >
            {/* Free tier */}
            <motion.div variants={fadeUp} className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827] p-8">
              <p className="text-2xl font-black text-gray-900 dark:text-white">Free</p>
              <p className="text-4xl font-black text-gray-900 dark:text-white mt-2">
                ₹0{' '}
                <span className="text-lg font-normal text-gray-400">/ forever</span>
              </p>
              <div className="flex flex-col gap-3 mt-6">
                {[
                  'Unlimited workout plans',
                  'Indian diet plan included',
                  'Daily streak tracking',
                  'Basic analytics',
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="text-[#22c55e] font-bold">✓</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{f}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/login"
                className="bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full h-11 px-6 font-semibold w-full mt-8 flex items-center justify-center hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
              >
                Get started free
              </Link>
            </motion.div>

            {/* Premium tier */}
            <motion.div variants={fadeUp} className="rounded-2xl border-2 border-primary bg-gradient-to-br from-teal-500 to-teal-600 text-accent-ink p-8 relative">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-2xl font-black text-white">Premium</p>
                <span className="bg-white/20 text-white text-xs rounded-full px-3 py-1">Most popular</span>
              </div>
              <p className="text-4xl font-black text-white mt-2">
                ₹49{' '}
                <span className="text-lg font-normal text-white/80">/ month</span>
              </p>
              <p className="text-sm text-white/80 mt-1">Less than a protein bar.</p>
              <div className="flex flex-col gap-3 mt-6">
                {[
                  'Everything in Free',
                  'Advanced analytics dashboard',
                  'Coach booking access',
                  'Body & gym photo analysis',
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="text-white font-bold">✓</span>
                    <span className="text-sm text-white">{f}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/login"
                className="bg-white text-[#00E5BC] hover:bg-gray-100 rounded-full h-11 px-6 font-semibold w-full mt-8 flex items-center justify-center transition-colors"
              >
                Start for ₹49
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="landing-dark transition-colors duration-300 bg-[#080c14] text-center">
        <div className="mx-auto max-w-7xl px-6 md:px-16 lg:px-24 py-20 lg:py-28">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer()}
          >
            <motion.h2 variants={fadeUp} className="text-5xl md:text-6xl font-black text-white leading-tight max-w-2xl mx-auto">
              Show up once.<br />See why it works.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-400 text-lg mt-4">
              Free to start. No gym required for day one.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link
                href="/login"
                className="inline-block mt-10 bg-primary hover:bg-primary-dark text-accent-ink rounded-full px-12 py-5 text-lg font-semibold shadow-lg shadow-teal-500/30 transition-colors"
              >
                Create your free account
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} className="mt-4">
              <Link
                href="/login"
                className="text-sm text-gray-600 hover:text-gray-400 underline transition-colors"
              >
                Already have an account? Sign in →
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-dark bg-[#060E10] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-16 lg:px-24 py-12 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="GymBro" className="w-6 h-6 rounded-md" />
            <span className="text-sm text-white">GymBro AI</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-400 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-400 transition-colors">
              Terms
            </Link>
            <span className="text-sm text-gray-500">© 2026 GymBro AI</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
