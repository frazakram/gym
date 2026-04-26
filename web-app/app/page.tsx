'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

function CheckIcon({ color = 'purple' }: { color?: 'purple' | 'green' | 'amber' }) {
  const styles = {
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    green:  'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    amber:  'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
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
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
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

          <div className="flex items-center gap-3">
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
            <ThemeToggle className="relative" />
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="transition-colors duration-300 bg-white dark:bg-[#080c14] min-h-screen flex items-center">
        <div className="mx-auto max-w-7xl px-6 md:px-16 lg:px-24 py-20 lg:py-28 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left: text */}
            <div className="flex flex-col gap-6">
              <span className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full px-3 py-1 text-xs font-medium w-fit">
                🇮🇳 Made for Indian athletes
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-[1.05] text-gray-900 dark:text-white">
                The fitness app that actually knows what you eat.
              </h1>

              <p className="mt-6 text-lg text-gray-500 dark:text-gray-400 max-w-xl">
                GymBro builds your workouts around your gym and your meals around your kitchen — then gets smarter every week you show up.
              </p>

              <div className="flex flex-wrap gap-2">
                {['✓ No generic meal plans', '✓ Adapts weekly', '✓ Free to start'].map((item) => (
                  <span
                    key={item}
                    className="bg-gray-50 dark:bg-white/5 rounded-full px-3 py-1 text-xs text-gray-500 dark:text-gray-400"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {/* Start for free — rotating conic-gradient border */}
                <div className="relative inline-flex rounded-full p-[2px] overflow-hidden">
                  <span
                    className="pointer-events-none absolute"
                    style={{
                      inset: '-50%',
                      background: 'conic-gradient(from 0deg, transparent 0%, #7c3aed 25%, #a78bfa 45%, transparent 65%)',
                      animation: 'orbit 3s linear infinite',
                    }}
                  />
                  <Link
                    href="/login"
                    className="relative z-10 bg-violet-600 hover:bg-violet-700 text-white rounded-full px-8 py-4 text-base font-semibold shadow-lg shadow-purple-500/25 transition-colors"
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
                      background: 'conic-gradient(from 0deg, transparent 0%, rgba(139,92,246,0.5) 25%, rgba(167,139,250,0.35) 45%, transparent 65%)',
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
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500">
                Free forever for workouts and diet. No credit card needed.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Curious?{' '}
                <a
                  href="https://finalgym.vercel.app/"
                  className="underline hover:text-gray-600 dark:hover:text-gray-300"
                >
                  Explore without signing up →
                </a>
              </p>
            </div>

            {/* Right: phone mockup — dark image in dark mode, light image in light mode */}
            <div className="flex items-center justify-center lg:scale-[1.3]">
              <img
                src="/app-dark.png"
                alt="GymBro app dark mode"
                className="hidden dark:block w-full max-w-[260px] lg:max-w-none drop-shadow-2xl"
              />
              <img
                src="/app-light.png"
                alt="GymBro app light mode"
                className="block dark:hidden w-full max-w-[260px] lg:max-w-none drop-shadow-2xl"
              />
            </div>

          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ── */}
      <section className="transition-colors duration-300 bg-gray-50 dark:bg-[#0d1117] border-y border-gray-100 dark:border-white/5">
        <div className="mx-auto max-w-7xl px-6 md:px-16 lg:px-24 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 text-center divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-white/10 max-w-3xl mx-auto">
            <div className="px-8 py-6 sm:py-0">
              <p className="text-4xl font-black text-gray-900 dark:text-white">10,000+</p>
              <p className="text-sm text-gray-400 mt-1">workout plans generated</p>
            </div>
            <div className="px-8 py-6 sm:py-0">
              <p className="text-4xl font-black text-gray-900 dark:text-white">Week 1</p>
              <p className="text-sm text-gray-400 mt-1">when users see first results</p>
            </div>
            <div className="px-8 py-6 sm:py-0">
              <p className="text-4xl font-black text-gray-900 dark:text-white">₹1/mo</p>
              <p className="text-sm text-gray-400 mt-1">to unlock everything</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE: WORKOUTS ── */}
      <section id="features" className="transition-colors duration-300 bg-white dark:bg-[#080c14]">
        <div className="mx-auto max-w-7xl px-6 md:px-16 lg:px-24 py-20 lg:py-28">

          {/* Section header */}
          <div className="text-center mb-16">
            <p className="text-xs font-bold tracking-[0.2em] text-[#7c3aed] uppercase mb-4">
              What makes it different
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white">
              Built different.<br />Works better.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text */}
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-[#7c3aed] uppercase">
                Workouts
              </p>
              <h3 className="mt-3 text-3xl lg:text-5xl font-black text-gray-900 dark:text-white leading-tight">
                Learns your gym.<br />Improves every week.
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-lg mt-4 leading-relaxed">
                Most apps give you the same plan forever. GymBro watches what you actually complete, what you skip, and what your gym has — then rewrites next week&apos;s plan around reality, not a template.
              </p>
              <div className="flex flex-col gap-3 mt-8">
                {[
                  'Adapts to your actual equipment',
                  'Progressive overload built in automatically',
                  'Skipped sessions recalibrated next week',
                  'Works for home gym, commercial, or bodyweight',
                ].map((pt) => (
                  <div key={pt} className="flex items-start gap-3">
                    <CheckIcon color="purple" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{pt}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Visual */}
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827] p-6 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-sm text-gray-900 dark:text-white">Pull Day — Week 3</span>
                <span className="text-xs text-gray-400">6 exercises</span>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  ['Lat Pulldown', '4 sets × 10 reps'],
                  ['Cable Row',    '4 sets × 12 reps'],
                  ['Face Pull',    '3 sets × 15 reps'],
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
                  <div className="h-full rounded-full bg-[#7c3aed]" style={{ width: '41%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE: NUTRITION ── */}
      <section className="transition-colors duration-300 bg-gray-50 dark:bg-[#0d1117]">
        <div className="mx-auto max-w-7xl px-6 md:px-16 lg:px-24 py-20 lg:py-28">
          {/*
            lg:[&>*:first-child]:order-2 pushes the text col (first in DOM) to the
            right at lg+, so the visual card (second in DOM) appears on the left.
          */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center lg:[&>*:first-child]:order-2">
            {/* Text — first in DOM, goes RIGHT on desktop */}
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-[#7c3aed] uppercase">
                Nutrition
              </p>
              <h3 className="mt-3 text-3xl lg:text-5xl font-black text-gray-900 dark:text-white leading-tight">
                Finally. Meal plans<br />with actual Indian food.
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-lg mt-4 leading-relaxed">
                Chicken breast and broccoli don&apos;t live in Indian kitchens. GymBro is built around Rajma, Dal, Roti, Sabzi, and what you actually have at home — then hits your protein and calorie targets anyway.
              </p>
              <div className="flex flex-col gap-3 mt-8">
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
              </div>
            </div>
            {/* Visual — second in DOM, goes LEFT on desktop */}
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827] p-6 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-sm text-gray-900 dark:text-white">Today&apos;s meals</span>
                <span className="text-xs text-[#7c3aed] font-semibold">2490 kcal</span>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  ['Breakfast · Egg Bhurji & Toast', '480 kcal'],
                  ['Lunch · Rajma Chawal',            '620 kcal'],
                  ['Snack · Banana + Peanut Butter',  '210 kcal'],
                  ['Dinner · Dal Roti',               '580 kcal'],
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
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE: PROGRESS ── */}
      <section className="transition-colors duration-300 bg-white dark:bg-[#080c14]">
        <div className="mx-auto max-w-7xl px-6 md:px-16 lg:px-24 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text */}
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-[#7c3aed] uppercase">
                Progress
              </p>
              <h3 className="mt-3 text-3xl lg:text-5xl font-black text-gray-900 dark:text-white leading-tight">
                Your streak.<br />Your proof.
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-lg mt-4 leading-relaxed">
                No complicated graphs. No data overload. Just a streak that shows you showed up, a weekly score, and a plan that quietly improves in the background.
              </p>
              <div className="flex flex-col gap-3 mt-8">
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
              </div>
            </div>
            {/* Visual */}
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827] p-6 shadow-sm">
              <p className="text-2xl font-black text-gray-900 dark:text-white">🔥 5 day streak</p>
              <p className="text-sm text-gray-400 mt-1">Best: 12 days</p>
              <div className="flex gap-2 flex-wrap mt-6">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                  <div key={day} className="flex flex-col items-center gap-1">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                        i < 5
                          ? 'bg-violet-600 text-white'
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
                  <div className="h-full rounded-full bg-[#7c3aed]" style={{ width: '41%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="transition-colors duration-300 bg-gray-50 dark:bg-[#0d1117]">
        <div className="mx-auto max-w-7xl px-6 md:px-16 lg:px-24 py-20 lg:py-28">
          <div className="text-center mb-16">
            <p className="text-xs font-bold tracking-[0.2em] text-[#7c3aed] uppercase mb-4">
              Getting started
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white">
              Up and running in 5 minutes.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
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
              <div key={num}>
                <p className="text-8xl font-black text-gray-100 dark:text-white/5 leading-none select-none">
                  {num}
                </p>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-2">{title}</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="transition-colors duration-300 bg-white dark:bg-[#080c14]">
        <div className="mx-auto max-w-7xl px-6 md:px-16 lg:px-24 py-20 lg:py-28">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-gray-900 dark:text-white">Simple pricing.</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-3">
              Start free. Upgrade when you&apos;re ready.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">

            {/* Free tier */}
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827] p-8">
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
            </div>

            {/* Premium tier — bg-violet-600 so the CSS exception keeps text-white visible in light mode */}
            <div className="rounded-2xl border-2 border-[#7c3aed] bg-violet-600 text-white p-8 relative">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-2xl font-black text-white">Premium</p>
                <span className="bg-white/20 text-white text-xs rounded-full px-3 py-1">Most popular</span>
              </div>
              <p className="text-4xl font-black text-white mt-2">
                ₹1{' '}
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
                className="bg-white text-[#7c3aed] hover:bg-gray-100 rounded-full h-11 px-6 font-semibold w-full mt-8 flex items-center justify-center transition-colors"
              >
                Start for ₹1
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="landing-dark transition-colors duration-300 bg-[#080c14] text-center">
        <div className="mx-auto max-w-7xl px-6 md:px-16 lg:px-24 py-20 lg:py-28">
          <h2 className="text-5xl md:text-6xl font-black text-white leading-tight max-w-2xl mx-auto">
            Show up once.<br />See why it works.
          </h2>
          <p className="text-gray-400 text-lg mt-4">
            Free to start. No gym required for day one.
          </p>
          <Link
            href="/login"
            className="inline-block mt-10 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-full px-12 py-5 text-lg font-semibold shadow-lg shadow-purple-500/30 transition-colors"
          >
            Create your free account
          </Link>
          <div className="mt-4">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-400 underline transition-colors"
            >
              Already have an account? Sign in →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-dark bg-[#080c14] border-t border-white/5">
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
